"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Phone, Video, Mic, MicOff, VideoOff, PhoneOff } from 'lucide-react';

export default function CallModal({
  socket,
  currentUserId,
  incomingCall,
  outgoingCallTarget, // { _id, name, profilepic }
  isVideoCall,
  onEndCall
}) {
  const [callStatus, setCallStatus] = useState('initiating'); // initiating, ringing, connected
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!isVideoCall);
  const [callDuration, setCallDuration] = useState(0);
  const [iceState, setIceState] = useState('new');

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

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const iceCandidateQueue = useRef([]);

  // Sync remote stream to video element whenever it changes
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
        console.log("[WebRTC] Syncing remote stream to video element:", remoteStream.getTracks().map(t => `${t.kind}:${t.enabled}`));
        remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // ICE/TURN Servers for NAT Traversal
  // STUN alone CANNOT traverse symmetric NATs (common on mobile/different networks).
  // TURN servers relay media when direct peer-to-peer is impossible.
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ],
    iceCandidatePoolSize: 10
  };

  useEffect(() => {
    // 1. Get User Media
    const flushIceCandidateQueue = async () => {
      if (!peerConnection.current) return;
      console.log(`[WebRTC] Flushing ${iceCandidateQueue.current.length} queued ICE candidates`);
      for (const candidate of iceCandidateQueue.current) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('[WebRTC] Error adding queued ice candidate', e);
        }
      }
      iceCandidateQueue.current = [];
    };

    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        console.log("[WebRTC] Got local media:", stream.getTracks().map(t => `${t.kind}:${t.enabled}`));

        // If it's pure audio call initially, disable video track
        if (!isVideoCall) {
            stream.getVideoTracks().forEach(track => track.enabled = false);
        }

        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        initializePeerConnection(stream);

        // If initiating outbound call
        if (outgoingCallTarget && !incomingCall) {
          setCallStatus('ringing');
          const offer = await peerConnection.current.createOffer();
          await peerConnection.current.setLocalDescription(offer);
          console.log("[WebRTC] Offer created and sent to:", outgoingCallTarget._id);
          socket.emit('call_offer', {
            recipientId: outgoingCallTarget._id,
            offer,
            callerInfo: { _id: currentUserId, isVideoCall }
          });
        } 
        // If answering an incoming call
        else if (incomingCall) {
          console.log("[WebRTC] Answering incoming call from:", incomingCall.callerInfo._id);
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
          const answer = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(answer);
          socket.emit('call_answer', { callerId: incomingCall.callerInfo._id, answer });
          setCallStatus('connected');
          await flushIceCandidateQueue();
        }
      } catch (err) {
        console.error("[WebRTC] Failed to get local media", err);
        alert("Camera/Microphone access denied. Cannot start call.");
        handleEndCall();
      }
    };

    initMedia();

    return () => {
      cleanupCall();
    };
  }, []);

  const initializePeerConnection = (stream) => {
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnection.current = pc;

    // Add local tracks
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
      console.log(`[WebRTC] Added local track: ${track.kind}, enabled: ${track.enabled}`);
    });

    // Handle incoming remote tracks
    pc.ontrack = (event) => {
      console.log("[WebRTC] ontrack fired. Streams:", event.streams.length, "Track:", event.track.kind);
      const remStream = event.streams[0] || new MediaStream([event.track]);
      setRemoteStream(remStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remStream;
      }
    };

    // Handle ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const targetId = outgoingCallTarget ? outgoingCallTarget._id : incomingCall.callerInfo._id;
        socket.emit('ice_candidate', { targetId, candidate: event.candidate });
      } else {
        console.log("[WebRTC] ICE candidate gathering complete.");
      }
    };

    // Monitor ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log("[WebRTC] ICE Connection State:", state);
      setIceState(state);
      if (state === 'connected' || state === 'completed') {
        setCallStatus('connected');
      } else if (state === 'failed') {
        console.error("[WebRTC] ICE Connection FAILED. Peers cannot reach each other.");
        alert("Call connection failed. The network may be blocking peer-to-peer connections.");
        handleEndCall();
      } else if (state === 'disconnected') {
        console.warn("[WebRTC] ICE Connection disconnected. May recover...");
      }
    };

    // Monitor overall connection state
    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] Connection State:", pc.connectionState);
      if (pc.connectionState === 'failed') {
        console.error("[WebRTC] Peer connection FAILED.");
        handleEndCall();
      }
    };
  };

  useEffect(() => {
    if (!socket) return;

    const handleCallAnswered = async ({ answer }) => {
      if (peerConnection.current) {
         const state = peerConnection.current.signalingState;
         console.log("[WebRTC] Received call_answered. Signaling state:", state);
         if (state === 'have-local-offer') {
           try {
             await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
             setCallStatus('connected');
             
             // Flush any ICE candidates that arrived before the Handshake finished
             for (const candidate of iceCandidateQueue.current) {
                try {
                  await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {}
             }
             iceCandidateQueue.current = [];
             console.log("[WebRTC] Remote answer set. Handshake complete!");
           } catch (err) {
             console.error("[WebRTC] Error setting remote answer:", err);
           }
         } else {
           console.warn("[WebRTC] Ignoring call_answered in state:", state);
         }
      }
    };

    const handleReceiveIceCandidate = async ({ candidate }) => {
      try {
        if (peerConnection.current && peerConnection.current.remoteDescription) {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          iceCandidateQueue.current.push(candidate);
          console.log("[WebRTC] Queued ICE candidate. Queue size:", iceCandidateQueue.current.length);
        }
      } catch (e) {
        console.error('[WebRTC] Error adding received ice candidate', e);
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
    }

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
  }, [socket]);



  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleEndCall = () => {
    const targetId = outgoingCallTarget ? outgoingCallTarget._id : (incomingCall ? incomingCall.callerInfo._id : null);
    if (targetId) {
      socket.emit('call_ended', { targetId });
    }
    cleanupCall();
    onEndCall();
  };

  const cleanupCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col">
      {/* Header Info */}
      <div className="absolute top-8 left-0 right-0 text-center z-10">
        <h2 className="text-white text-2xl font-semibold">
          {outgoingCallTarget ? outgoingCallTarget.name : "Incoming Call"}
        </h2>
        <p className="text-white/60">
          {callStatus === 'ringing' ? 'Calling...' : 
           callStatus === 'connected' ? `Connected ${formatDuration(callDuration)}` : 'Connecting...'}
        </p>
      </div>

      {/* Video Streams */}
      <div className="flex-1 relative">
        {/* Remote Video (Permanently Mounted for Ref Assignment) */}
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          className={`w-full h-full object-cover ${!remoteStream ? 'hidden' : ''}`} 
        />
        
        {/* Fallback if no remote video */}
        {!remoteStream && (
           <div className="w-full h-full flex items-center justify-center absolute inset-0">
             <div className="w-32 h-32 rounded-full border-4 border-white/20 flex items-center justify-center">
                <span className="text-white/40 font-bold text-4xl">Waiting</span>
             </div>
           </div>
        )}

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute bottom-32 right-6 w-32 h-48 bg-gray-900 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20">
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

      {/* Call Controls */}
      <div className="h-28 bg-gradient-to-t from-black to-transparent flex items-center justify-center gap-6 pb-6">
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
