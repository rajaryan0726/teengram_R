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

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);

  // STUN Servers for NAT Traversal
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    // 1. Get User Media
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true, // Always request video, we can disable track later
          audio: true
        });
        
        // If it's pure audio call initially, disable video track to start with black screen
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
          socket.emit('call_offer', {
            recipientId: outgoingCallTarget._id,
            offer,
            callerInfo: { _id: currentUserId, isVideoCall } // Pass simplified caller info
          });
        }
      } catch (err) {
        console.error("Failed to get local media", err);
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
    peerConnection.current = new RTCPeerConnection(rtcConfig);

    // Add local tracks
    stream.getTracks().forEach(track => {
      peerConnection.current.addTrack(track, stream);
    });

    // Handle incoming remote tracks
    peerConnection.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle ICE Candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        const targetId = outgoingCallTarget ? outgoingCallTarget._id : incomingCall.callerInfo._id;
        socket.emit('ice_candidate', { targetId, candidate: event.candidate });
      }
    };
  };

  useEffect(() => {
    if (!socket || !peerConnection.current) return;

    const handleCallAnswered = async ({ answer }) => {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
      setCallStatus('connected');
    };

    const handleReceiveIceCandidate = async ({ candidate }) => {
      try {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding received ice candidate', e);
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

  // If this modal is opened because of an incoming call, we need to answer it directly
  useEffect(() => {
    if (incomingCall && peerConnection.current && callStatus === 'initiating') {
      const answerIncoming = async () => {
        setCallStatus('connected');
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        socket.emit('call_answer', { callerId: incomingCall.callerInfo._id, answer });
      };
      answerIncoming();
    }
  }, [incomingCall, peerConnection.current]);

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
           callStatus === 'connected' ? 'Connected 00:00' : 'Connecting...'}
        </p>
      </div>

      {/* Video Streams */}
      <div className="flex-1 relative">
        {/* Remote Video (Full Screen) */}
        {remoteStream && (
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover" 
          />
        )}
        
        {/* Fallback if no remote video */}
        {!remoteStream && (
           <div className="w-full h-full flex items-center justify-center">
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
