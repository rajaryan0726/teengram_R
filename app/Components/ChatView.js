'use client';

import React, { useEffect, useState, useRef } from 'react';
import { socket } from "@/lib/socket"; // Import the socket client
import { ArrowLeft, Send, Phone, Video, MoreVertical, Check, CheckCheck } from "lucide-react";

// Helper to determine if the message was sent by the current user
const isMessageFromMe = (message, currentUserId) => {
    // Check if the message was optimistically added (sender: { name: 'Me' }) or from the server
    const senderId = message.sender?._id?.toString() || message.senderId;
    return senderId === currentUserId;
};

const ChatView = ({ activeChat, currentUserId, onBack }) => { // added onBack prop just in case it's passed
    const [messages, setMessages] = useState([]);
    const [inputContent, setInputContent] = useState('');
    const [typingUser, setTypingUser] = useState(null);
    const [chatError, setChatError] = useState(null);

    // Ref for auto-scrolling and typing timeout
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // --- Scroll to Bottom ---
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, typingUser]);


    // --- SOCKET AND DATA LIFECYCLE MANAGEMENT ---
    useEffect(() => {
        if (!activeChat || !activeChat.id) {
            setMessages([]);
            return;
        }

        const conversationId = activeChat.id;

        // A. Fetch Message History (HTTP Request)
        const fetchHistory = async () => {
            if (conversationId.length === 24) {
                try {
                    const response = await fetch(`/api/chat/history/${conversationId}`);

                    if (response.ok) {
                        const history = await response.json();
                        setMessages(history);
                        setChatError(null);

                        // FEATURE: Mark messages as read immediately upon load
                        socket.emit('mark_messages_read', {
                            conversationId,
                            userId: currentUserId,
                            senderId: 'partner_id_placeholder' // The server just needs the room ID mostly
                        });

                    } else {
                        const errorData = await response.json();
                        setChatError(`Failed to load history: ${errorData.error}`);
                        setMessages([]);
                    }
                } catch (error) {
                    setChatError("Network error while fetching history.");
                }
            } else {
                // For brand new chats (before persistence), clear messages
                setMessages([]);
            }
        };

        fetchHistory();

        // B. Socket Connection and Joining Room
        if (!socket.connected) {
            socket.connect();
        }
        socket.emit('join_chat', conversationId);

        // C. Define Handler Functions 
        const onReceiveMessage = (newMessage) => {
            setMessages(prev => [...prev, newMessage]);
            setTypingUser(null); // Stop typing indicator if a message arrives

            // If the chat is open, immediately mark new incoming message as read
            if (newMessage.sender._id !== currentUserId) {
                socket.emit('mark_messages_read', {
                    conversationId: newMessage.conversationId,
                    userId: currentUserId
                });
            }
        };

        const onTyping = ({ username, isTyping }) => {
            setTypingUser(isTyping ? username : null);
        };

        const onChatError = (error) => {
            setChatError(error.message);
        };

        // FEATURE: Real-time Read Receipts
        const onMessagesRead = ({ conversationId: readConvId, readByUserId }) => {
            if (readConvId === conversationId) {
                // Update local state to show 'read' status for my messages
                setMessages(prev => prev.map(msg => {
                    // If I sent it, and it's not yet read by this user, add them
                    if (isMessageFromMe(msg, currentUserId)) {
                        const alreadyRead = msg.readBy?.includes(readByUserId);
                        if (!alreadyRead) {
                            return { ...msg, readBy: [...(msg.readBy || []), readByUserId] };
                        }
                    }
                    return msg;
                }));
            }
        };

        // D. Add Listeners
        socket.on('receive_message', onReceiveMessage);
        socket.on('typing', onTyping);
        socket.on('chat_error', onChatError);
        socket.on('messages_read', onMessagesRead);

        // E. Cleanup function
        return () => {
            socket.off('receive_message', onReceiveMessage);
            socket.off('typing', onTyping);
            socket.off('chat_error', onChatError);
            socket.off('messages_read', onMessagesRead);
        };

    }, [activeChat, currentUserId]);


    // --- TYPING AND SEND HANDLER ---
    const handleTyping = (e) => {
        const value = e.target.value;
        setInputContent(value);
        setChatError(null);

        if (!activeChat) return;

        if (value.length > 0) {
            // Send 'start typing'
            socket.emit('typing_status', { conversationId: activeChat.id, username: activeChat.name, isTyping: true });

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            // Set 'stop typing' timeout
            typingTimeoutRef.current = setTimeout(() => {
                socket.emit('typing_status', { conversationId: activeChat.id, username: activeChat.name, isTyping: false });
            }, 3000);
        } else {
            // Send 'stop typing' immediately when input is cleared
            socket.emit('typing_status', { conversationId: activeChat.id, username: activeChat.name, isTyping: false });
        }
    };

    // 🚨 FINALIZED HANDLE SEND 🚨
    const handleSend = () => {
        if (!inputContent.trim() || !activeChat || !currentUserId) return;

        const messagePayload = {
            senderId: currentUserId,
            // The activeChat.id is used as the recipient/conversation ID for the server action
            recipientOrConversationId: activeChat.id,
            content: inputContent,
        };

        // 1. Emit the message to the Socket.IO server
        socket.emit('send_message', messagePayload);

        // 2. Clear input
        setInputContent('');
    };


    // --- JSX RENDER ---
    const chatPartnerName = activeChat?.username || activeChat?.name || 'Loading...';
    // Online status passed from wrapper
    const isOnline = activeChat?.isOnline;

    if (!activeChat) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50/30">
                <div className="text-center p-8 rounded-3xl shadow-xl bg-white/70 backdrop-blur-md border border-white">
                    <div className="w-20 h-20 bg-gradient-to-tr from-violet-200 to-fuchsia-200 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                        <span className="text-4xl">👋</span>
                    </div>
                    <p className="text-2xl font-bold mb-3 text-gray-800">Welcome to TeenGram!</p>
                    <p className="text-gray-500 font-medium max-w-sm mx-auto">
                        Select a friend from the left to start chatting in style.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 bg-white relative">
            {/* Header: Chat Partner Details */}
            <div className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between sticky top-0 z-10 shadow-sm transition-all">
                <div className="flex items-center gap-4">
                    {/* Back Button for mobile (if needed later) */}

                    <div className="relative group cursor-pointer">
                        <img
                            src={activeChat.profilePic || "/default-avatar.png"}
                            alt={chatPartnerName}
                            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm transition-transform group-hover:scale-105"
                        />
                        {isOnline ? (
                            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full shadow-sm animate-pulse"></span>
                        ) : (
                            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-gray-400 border-2 border-white rounded-full shadow-sm"></span>
                        )}
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-gray-900 leading-tight">{chatPartnerName}</h2>
                        <p className={`text-sm font-medium transition-all ${typingUser ? 'text-violet-600' : isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                            {typingUser ? "typing..." : isOnline ? "Active now" : "Offline"}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2 text-gray-400">
                    <button className="p-3 hover:bg-violet-50 hover:text-violet-600 rounded-xl transition-all"><Phone className="w-5 h-5" /></button>
                    <button className="p-3 hover:bg-violet-50 hover:text-violet-600 rounded-xl transition-all"><Video className="w-5 h-5" /></button>
                    <button className="p-3 hover:bg-violet-50 hover:text-violet-600 rounded-xl transition-all"><MoreVertical className="w-5 h-5" /></button>
                </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar bg-slate-50/50">
                {messages.map((message, index) => {
                    // Check if the message belongs to the current user
                    const isMe = isMessageFromMe(message, currentUserId);
                    const senderName = isMe ? 'Me' : message.sender?.name || message.sender?.username;
                    const isRead = message.readBy && message.readBy.length > 1; // Sender is always in readBy
                    const showAvatar = !isMe && (index === 0 || messages[index - 1]?.senderId !== message.senderId);

                    return (
                        <div
                            key={message._id || index}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'} group mb-1`}
                        >
                            {!isMe && (
                                <div className={`w-8 mr-3 flex-shrink-0 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                                    {showAvatar && (
                                        <img
                                            src={activeChat.profilePic || "/default-avatar.png"}
                                            className="w-9 h-9 rounded-full object-cover border border-white shadow-sm"
                                        />
                                    )}
                                </div>
                            )}

                            <div
                                className={`max-w-[75%] lg:max-w-[65%] px-5 py-3 rounded-2xl shadow-sm text-[15px] leading-relaxed relative transition-shadow
                                    ${isMe
                                        ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white rounded-br-sm shadow-violet-200'
                                        : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100 hover:shadow-md'
                                    }
                                `}
                            >
                                {/* Display sender name for group chats */}
                                {!isMe && activeChat.isGroup && <p className="text-xs font-bold mb-1 text-violet-500">{senderName}</p>}

                                <p>{message.content}</p>

                                <div className={`flex items-center justify-end mt-1 space-x-1 opacity-80 ${isMe ? 'text-violet-100' : 'text-gray-400'}`}>
                                    <span className="text-[10px] font-medium">
                                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isMe && (
                                        <span>
                                            {isRead ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <div className="p-4 bg-white border-t border-gray-100 sticky bottom-0 z-10">
                {/* 🚨 ERROR DISPLAY 🚨 */}
                {chatError && (
                    <div className="text-red-600 text-sm mb-2 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
                        <span>⚠️</span> {chatError}
                    </div>
                )}

                <div className="flex gap-3 items-end max-w-5xl mx-auto">
                    <button className="p-3 text-gray-400 hover:text-violet-500 hover:bg-violet-50 rounded-full transition-all">
                        <span className="text-2xl">📎</span>
                    </button>

                    <div className="flex-1 bg-gray-50 rounded-3xl border border-gray-200 focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-500 transition-all flex items-center px-4 py-1 shadow-inner">
                        <input
                            type="text"
                            placeholder="Type a message..."
                            value={inputContent}
                            onChange={handleTyping}
                            onKeyPress={(e) => { if (e.key === 'Enter') handleSend(); }}
                            className="flex-1 bg-transparent py-3 focus:outline-none text-gray-800 placeholder-gray-400 font-medium"
                        />
                    </div>

                    <button
                        onClick={handleSend}
                        disabled={!inputContent.trim()}
                        className={`p-3.5 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center
                            ${!inputContent.trim()
                                ? 'bg-gray-200 text-gray-400 shadow-none cursor-default'
                                : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-violet-200 hover:shadow-violet-400 hover:scale-105 active:scale-95'
                            }`}
                    >
                        <Send className="w-5 h-5 ml-0.5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatView;