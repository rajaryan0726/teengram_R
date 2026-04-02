"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { socket } from '@/lib/socket';
import CallModal from '../Components/CallModal';

const SocketContext = createContext({
    socket: null,
    onlineUsers: new Set(),
    isConnected: false,
    startCall: () => {},
});

export const useSocket = () => {
    return useContext(SocketContext);
};

export default function SocketProvider({ children }) {
    const { data: session } = useSession();
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [isConnected, setIsConnected] = useState(false);

    // ---------- GLOBAL CALL STATE ----------
    const [incomingCall, setIncomingCall] = useState(null);
    const [activeCall, setActiveCall] = useState(null); // { targetUser, isVideoCall }
    const ringerRef = React.useRef(null);
    const earlyIceCandidates = React.useRef([]);

    // Function for any page to start a call
    const startCall = useCallback((targetUser, isVideoCall) => {
        setActiveCall({ targetUser, isVideoCall });
    }, []);

    // ---------- SOCKET SETUP ----------
    useEffect(() => {
        if (session && session.user && session.user.id) {
            
            if (!socket.connected) {
                socket.connect();
            }

            socket.emit('register_user', session.user.id);
            setIsConnected(true);

            // Online/Offline status listeners
            const onUserOnline = (userId) => {
                setOnlineUsers(prev => new Set(prev).add(userId));
            };

            const onUserOffline = (userId) => {
                setOnlineUsers(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(userId);
                    return newSet;
                });
            };

            const onGetOnlineUsers = (users) => {
                setOnlineUsers(new Set(users));
            };

            socket.on('user_online', onUserOnline);
            socket.on('user_offline', onUserOffline);
            socket.on('get_online_users', onGetOnlineUsers);

            return () => {
                socket.off('user_online', onUserOnline);
                socket.off('user_offline', onUserOffline);
                socket.off('get_online_users', onGetOnlineUsers);
            };
        }
    }, [session?.user?.id]);

    // ---------- GLOBAL CALL LISTENERS ----------
    useEffect(() => {
        if (!socket || !isConnected) return;

        const onIncomingCall = ({ offer, callerInfo }) => {
            console.log("[Call] Incoming call from:", callerInfo._id);
            setIncomingCall({ offer, callerInfo });
        };

        const onGlobalCallEnd = () => {
            console.log("[Call] Remote call ended.");
            setIncomingCall(null);
            setActiveCall(null);
            earlyIceCandidates.current = [];
        };

        const onReceiveEarlyCandidate = ({ candidate }) => {
            // Buffer candidates that arrive BEFORE we accept the call (modal not mounted)
            setIncomingCall((currentIncoming) => {
                setActiveCall((currentActive) => {
                    if (currentIncoming && !currentActive) {
                        console.log("[WebRTC -> Buffer] Queuing early ICE candidate.");
                        earlyIceCandidates.current.push(candidate);
                    }
                    return currentActive;
                });
                return currentIncoming;
            });
        };

        socket.on('incoming_call', onIncomingCall);
        socket.on('call_ended_by_remote', onGlobalCallEnd);
        socket.on('receive_ice_candidate', onReceiveEarlyCandidate);

        return () => {
            socket.off('incoming_call', onIncomingCall);
            socket.off('call_ended_by_remote', onGlobalCallEnd);
            socket.off('receive_ice_candidate', onReceiveEarlyCandidate);
        };
    }, [isConnected]);

    // ---------- SYNTHETIC AUDIO RINGER ----------
    useEffect(() => {
        // Build a synthetic US-style ringing tone (Ring..Ring..Pause)
        class PhoneRinger {
            constructor() {
                this.ctx = null;
                this.oscillators = [];
                this.isPlaying = false;
                this.interval = null;
            }
            start() {
                if (this.isPlaying) return;
                this.isPlaying = true;
                try {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    this.ctx = new AudioContext();

                    const ring = () => {
                        if (!this.isPlaying || !this.ctx) return;
                        const now = this.ctx.currentTime;
                        
                        const beep = (start) => {
                            const osc = this.ctx.createOscillator();
                            const gain = this.ctx.createGain();
                            // Dual-tone frequency to simulate standard electronic ring
                            osc.type = 'square';
                            osc.frequency.setValueAtTime(440, start);
                            osc.frequency.setValueAtTime(480, start + 0.1);

                            // Envelope to remove clicks
                            gain.gain.setValueAtTime(0, start);
                            gain.gain.linearRampToValueAtTime(0.3, start + 0.05); // Volume
                            gain.gain.setValueAtTime(0.3, start + 0.95);
                            gain.gain.linearRampToValueAtTime(0, start + 1.0);

                            osc.connect(gain);
                            gain.connect(this.ctx.destination);
                            osc.start(start);
                            osc.stop(start + 1.0);
                            this.oscillators.push(osc);
                        };

                        beep(now);
                        beep(now + 1.2);
                        
                        // Clean up old oscillators from array
                        this.oscillators = this.oscillators.filter(o => o.context.currentTime < (now + 3));
                    };

                    ring(); // Play immediately
                    this.interval = setInterval(() => { if (this.isPlaying) ring(); }, 4000); // Repeat every 4s
                } catch (e) {
                    console.error("Web Audio API restricted/blocked:", e);
                }
            }
            stop() {
                this.isPlaying = false;
                if (this.interval) clearInterval(this.interval);
                this.oscillators.forEach(osc => { try { osc.stop(); } catch(e){} });
                this.oscillators = [];
                if (this.ctx && this.ctx.state !== 'closed') {
                    this.ctx.close().catch(e => console.error(e));
                }
                this.ctx = null;
            }
        }
        
        ringerRef.current = new PhoneRinger();
        
        return () => {
            if (ringerRef.current) ringerRef.current.stop();
        };
    }, []);

    // ---------- CALL TIMEOUT & RINGER TRIGGER ----------
    useEffect(() => {
        let timeoutId;

        // 1. Manage audio playback & timeouts
        if (incomingCall && !activeCall) {
            // Start ringtone
            if (ringerRef.current) {
                ringerRef.current.start();
            }

            // Set 20 second hard auto-reject timeout
            timeoutId = setTimeout(() => {
                console.log("[Call] Ringing timed out after 20 seconds.");
                if (socket && socket.connected) {
                    socket.emit('call_rejected', { targetId: incomingCall.callerInfo._id });
                }
                setIncomingCall(null);
            }, 20000); // 20 seconds

        } else {
            // Stop playing if answered, rejected, or timed out
            if (ringerRef.current) {
                ringerRef.current.stop();
            }
        }

        // Cleanup function
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [incomingCall, activeCall, socket]);

    return (
        <SocketContext.Provider value={{ socket, onlineUsers, isConnected, startCall }}>
            {children}

            {/* ====== GLOBAL CALL UI ====== */}

            {/* Active Call Modal */}
            {activeCall && session?.user?.id && (
                <CallModal 
                    socket={socket}
                    currentUserId={session.user.id}
                    currentUserName={session.user.name}
                    outgoingCallTarget={activeCall.targetUser}
                    incomingCall={incomingCall}
                    isVideoCall={activeCall.isVideoCall}
                    earlyIceCandidates={earlyIceCandidates.current}
                    onEndCall={() => {
                        setActiveCall(null);
                        setIncomingCall(null);
                        earlyIceCandidates.current = [];
                    }}
                />
            )}

            {/* Incoming Call Popup (shown when NOT already in a call) */}
            {incomingCall && !activeCall && (
                <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 border border-gray-100 dark:border-neutral-800 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                        
                        <div className="w-24 h-24 bg-gray-100 dark:bg-neutral-800 rounded-full mb-6 relative mt-4 shadow-inner flex items-center justify-center overflow-hidden border-4 border-white dark:border-neutral-700">
                            <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
                            <span className="text-4xl">📞</span>
                        </div>

                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Incoming Call</h3>
                        <p className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-1">{incomingCall.callerInfo.name || 'Unknown'}</p>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs">{incomingCall.callerInfo.isVideoCall ? 'Video' : 'Audio'} call is ringing...</p>

                        <div className="flex gap-4 w-full justify-center">
                            <button 
                                onClick={() => {
                                    socket.emit('call_rejected', { targetId: incomingCall.callerInfo._id });
                                    setIncomingCall(null);
                                }}
                                className="px-6 py-3 bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-500 font-bold rounded-xl hover:bg-red-200 dark:hover:bg-red-500/40 transition-colors flex-1"
                            >
                                Decline
                            </button>
                            <button 
                                onClick={() => {
                                    setActiveCall({ targetUser: null, isVideoCall: incomingCall.callerInfo.isVideoCall });
                                }}
                                className="px-6 py-3 bg-green-500 text-white font-bold rounded-xl shadow-lg hover:bg-green-600 hover:shadow-green-500/20 transition-all flex-[2] truncate"
                            >
                                Answer {incomingCall.callerInfo.isVideoCall ? 'Video' : 'Audio'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </SocketContext.Provider>
    );
}
