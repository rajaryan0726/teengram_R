"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Phone, Video, Mic, MicOff, VideoOff, PhoneOff } from 'lucide-react';

export default function CallModal({
  socket,
  currentUserId,
  currentUserName,
  outgoingCallTarget, // { _id, name, profilepic }
  incomingCall,
  isVideoCall,
  earlyIceCandidates = [],
  onEndCall
}) {
  const [callStatus, setCallStatus] = useState('initiating');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!isVideoCall);
  const [callDuration, setCallDuration] = useState(0);
  const [iceState, setIceState] = useState('new'); // Visible to user for debugging

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const iceCandidateQueue = useRef([...(earlyIceCandidates || [])]);
  const localStreamRef = useRef(null); // Keep a ref to avoid stale closure issues

  // Timer effect
  useEffect(() => {
    let interval;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Sync remote stream to video element AND call play()
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      console.log("[WebRTC] Syncing remote stream:", remoteStream.getTracks().map(t => `${t.kind}:enabled=${t.enabled}`));
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(e => console.warn("[WebRTC] Remote video autoplay blocked:", e));
    }
  }, [remoteStream]);

  // Cleanup function using ref to avoid stale closure
  const cleanupCall = useCallback(() => {
    console.log("[WebRTC] Cleaning up call...");
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
  }, []);

  const handleEndCall = useCallback(() => {
    const targetId = outgoingCallTarget ? outgoingCallTarget._id : (incomingCall ? incomingCall.callerInfo._id : null);
    if (targetId && socket) {
      socket.emit('call_ended', { targetId });
    }
    cleanupCall();
    onEndCall();
  }, [outgoingCallTarget, incomingCall, socket, cleanupCall, onEndCall]);

  // Main initialization effect
  useEffect(() => {
    let cancelled = false;

    const flushIceCandidateQueue = async () => {
      if (!peerConnection.current) return;
      const count = iceCandidateQueue.current.length;
      if (count > 0) console.log(`[WebRTC] Flushing ${count} queued ICE candidates`);
      for (const candidate of iceCandidateQueue.current) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('[WebRTC] Error adding queued ICE candidate:', e);
        }
      }
      iceCandidateQueue.current = [];
    };

    const initializePeerConnection = (stream, rtcConfig) => {
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnection.current = pc;

      // Add ALL local tracks to the connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
        console.log(`[WebRTC] Added local track: ${track.kind}, enabled: ${track.enabled}, id: ${track.id}`);
      });

      // Handle incoming remote tracks
      pc.ontrack = (event) => {
        console.log("[WebRTC] >>> ontrack fired! Track:", event.track.kind, "Streams:", event.streams.length);
        
        let remStream;
        if (event.streams && event.streams[0]) {
          remStream = event.streams[0];
        } else {
          // Fallback: wrap track in a new stream
          remStream = new MediaStream([event.track]);
        }

        console.log("[WebRTC] Remote stream tracks:", remStream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`));
        
        if (!cancelled) {
          setRemoteStream(remStream);
        }

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remStream;
          remoteVideoRef.current.play().catch(e => console.warn("[WebRTC] Autoplay blocked on track:", e));
        }
      };

      // Send ICE candidates to the remote peer
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const targetId = outgoingCallTarget ? outgoingCallTarget._id : incomingCall.callerInfo._id;
          socket.emit('ice_candidate', { targetId, candidate: event.candidate });
        } else {
          console.log("[WebRTC] All ICE candidates gathered.");
        }
      };

      // Monitor ICE gathering state
      pc.onicegatheringstatechange = () => {
        console.log("[WebRTC] ICE Gathering State:", pc.iceGatheringState);
      };

      // Monitor ICE connection state - THIS IS THE KEY DIAGNOSTIC
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log("[WebRTC] *** ICE Connection State:", state, "***");
        if (!cancelled) setIceState(state);

        if (state === 'connected' || state === 'completed') {
          console.log("[WebRTC] ✅ Media path established! Audio/Video should be flowing.");
          if (!cancelled) setCallStatus('connected');
        } else if (state === 'failed') {
          console.error("[WebRTC] ❌ ICE FAILED. No network path found between peers.");
          console.error("[WebRTC] This usually means TURN servers are needed but not available/working.");
        } else if (state === 'disconnected') {
          console.warn("[WebRTC] ⚠️ ICE disconnected. May recover automatically...");
        }
      };

      // Monitor overall connection state
      pc.onconnectionstatechange = () => {
        console.log("[WebRTC] Connection State:", pc.connectionState);
      };

      return pc;
    };

    const startCall = async () => {
      try {
        // Step 1: Fetch TURN server config from our API
        let rtcConfig = {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ]
        };

        try {
          const turnRes = await fetch('/api/turn');
          if (turnRes.ok) {
            rtcConfig = await turnRes.json();
            console.log("[WebRTC] Got ICE config with", rtcConfig.iceServers.length, "servers (including TURN)");
          }
        } catch (e) {
          console.warn("[WebRTC] Could not fetch TURN config, using STUN only:", e);
        }

        // Step 2: Get user media with fallback
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
        } catch (videoErr) {
          console.warn("[WebRTC] Video+Audio failed, trying audio-only:", videoErr.message);
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: true
            });
          } catch (audioErr) {
            console.error("[WebRTC] Audio-only also failed:", audioErr.message);
            throw audioErr; // will be caught by outer catch
          }
        }

        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        console.log("[WebRTC] Got local media:", stream.getTracks().map(t => `${t.kind}:${t.enabled}`));

        // If audio-only call, disable video track
        if (!isVideoCall) {
          stream.getVideoTracks().forEach(track => { track.enabled = false; });
        }

        setLocalStream(stream);
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Step 3: Create peer connection
        const pc = initializePeerConnection(stream, rtcConfig);

        // Step 4: Either make or answer the call
        if (outgoingCallTarget && !incomingCall) {
          // CALLER: Create and send offer
          setCallStatus('ringing');
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          console.log("[WebRTC] Offer created. Signaling state:", pc.signalingState);
          
          socket.emit('call_offer', {
            recipientId: outgoingCallTarget._id,
            offer: pc.localDescription,
            callerInfo: { _id: currentUserId, name: currentUserName || 'Unknown', isVideoCall }
          });
        } else if (incomingCall) {
          // RECEIVER: Set remote offer and send answer
          console.log("[WebRTC] Setting remote offer from caller...");
          await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
          console.log("[WebRTC] Remote offer set. Signaling state:", pc.signalingState);
          
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log("[WebRTC] Answer created and local description set. Signaling state:", pc.signalingState);
          
          socket.emit('call_answer', { 
            callerId: incomingCall.callerInfo._id, 
            answer: pc.localDescription
          });
          console.log("[WebRTC] Answer sent to caller:", incomingCall.callerInfo._id);
          
          setCallStatus('connected');
          await flushIceCandidateQueue();
        }
      } catch (err) {
        console.error("[WebRTC] Failed to start call:", err);
        if (!cancelled) {
          alert("Camera/Microphone access failed: " + err.message);
          handleEndCall();
        }
      }
    };

    startCall();

    return () => {
      cancelled = true;
      cleanupCall();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleCallAnswered = async ({ answer }) => {
      if (!peerConnection.current) return;
      
      const state = peerConnection.current.signalingState;
      console.log("[WebRTC] Received call_answered. Current signaling state:", state);
      
      if (state !== 'have-local-offer') {
        console.warn("[WebRTC] Ignoring answer - wrong signaling state:", state);
        return;
      }

      try {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("[WebRTC] ✅ Remote answer set successfully! Signaling state:", peerConnection.current.signalingState);
        setCallStatus('connected');
        
        // Flush queued ICE candidates
        for (const candidate of iceCandidateQueue.current) {
          try {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn("[WebRTC] Error adding queued candidate:", e);
          }
        }
        iceCandidateQueue.current = [];
      } catch (err) {
        console.error("[WebRTC] Error setting remote answer:", err);
      }
    };

    const handleReceiveIceCandidate = async ({ candidate }) => {
      try {
        if (peerConnection.current && peerConnection.current.remoteDescription) {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          // Queue candidates that arrive before remote description is set
          iceCandidateQueue.current.push(candidate);
        }
      } catch (e) {
        console.error('[WebRTC] Error adding ICE candidate:', e);
      }
    };

    const handleCallEndedRemote = () => {
      cleanupCall();
      onEndCall();
    };
    
    const handleCallRejected = () => {
      alert("Call was declined.");
      cleanupCall();
      onEndCall();
    };

    socket.on('call_answered', handleCallAnswered);
    socket.on('receive_ice_candidate', handleReceiveIceCandidate);
    socket.on('call_ended_by_remote', handleCallEndedRemote);
    socket.on('call_rejected_by_remote', handleCallRejected);

    return () => {
      socket.off('call_answered', handleCallAnswered);
      socket.off('receive_ice_candidate', handleReceiveIceCandidate);
      socket.off('call_ended_by_remote', handleCallEndedRemote);
      socket.off('call_rejected_by_remote', handleCallRejected);
    };
  }, [socket, cleanupCall, onEndCall]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // ICE state color for the visible indicator
  const iceStateColor = {
    'new': 'text-gray-400',
    'checking': 'text-yellow-400 animate-pulse',
    'connected': 'text-green-400',
    'completed': 'text-green-400',
    'failed': 'text-red-500',
    'disconnected': 'text-sky-400',
    'closed': 'text-gray-600',
  }[iceState] || 'text-gray-400';

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden">
      {/* Header Info - always visible */}
      <div className="flex-shrink-0 py-4 text-center z-20 bg-gradient-to-b from-black/80 to-transparent">
        <h2 className="text-white text-xl font-semibold">
          {outgoingCallTarget ? outgoingCallTarget.name : "Incoming Call"}
        </h2>
        <p className="text-white/60 text-sm">
          {callStatus === 'ringing' ? 'Calling...' : 
           callStatus === 'connected' ? `Connected ${formatDuration(callDuration)}` : 'Connecting...'}
        </p>
        <p className={`text-xs mt-1 ${iceStateColor}`}>
          ICE: {iceState} {iceState === 'checking' && '⏳'} {iceState === 'connected' && '✅'} {iceState === 'failed' && '❌'}
        </p>
      </div>

      {/* Video Area - fills remaining space */}
      <div className="flex-1 relative min-h-0 overflow-hidden">
        {/* Remote Video - constrained to container, never overflows */}
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          className={`absolute inset-0 w-full h-full object-contain bg-black ${!remoteStream ? 'hidden' : ''}`} 
        />
        
        {/* Fallback when no remote video */}
        {!remoteStream && (
           <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-28 h-28 rounded-full border-4 border-white/20 flex items-center justify-center">
                <span className="text-white/40 font-bold text-3xl">
                  {iceState === 'failed' ? '❌' : iceState === 'checking' ? '⏳' : '📷'}
                </span>
             </div>
           </div>
        )}

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute bottom-4 right-4 w-28 h-40 md:w-32 md:h-48 bg-gray-900 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 z-10">
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`w-full h-full object-cover ${isVideoOff ? 'opacity-0' : 'opacity-100'}`} 
          />
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
               <VideoOff className="text-white/50" />
            </div>
          )}
        </div>
      </div>

      {/* Call Controls - always visible, never hidden */}
      <div className="flex-shrink-0 h-24 bg-black/90 flex items-center justify-center gap-6 z-20">
        <button 
          onClick={toggleMute}
          className={`p-4 rounded-full transition ${isMuted ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <button 
          onClick={handleEndCall}
          className="p-5 bg-red-500 rounded-full text-white hover:bg-red-600 transition shadow-lg shadow-red-500/20"
        >
          <PhoneOff size={28} />
        </button>

        <button 
          onClick={toggleVideo}
          className={`p-4 rounded-full transition ${(isVideoOff || !isVideoCall) ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
        >
          {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
        </button>
      </div>
    </div>
  );
}

