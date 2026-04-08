'use client';

import React, { useEffect, useState, useRef } from 'react';
import { socket } from "@/lib/socket"; // Import the socket client
import { ArrowLeft, Send, Phone, Video, MoreVertical, Check, CheckCheck, Trash2, X } from "lucide-react";
import { deleteMessagesAction } from "@/actions/useractions";

// Helper to determine if the message was sent by the current user
const isMessageFromMe = (message, currentUserId) => {
    // Check if the message was optimistically added (sender: { name: 'Me' }) or from the server
    const senderId = message.sender?._id?.toString() || message.senderId;
    return senderId === currentUserId;
};

// Helper to format date labels
const formatMessageDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
};

const ChatView = ({ activeChat, currentUserId, onBack, onStartCall }) => {
    const [messages, setMessages] = useState([]);
    const [inputContent, setInputContent] = useState('');
    const [typingUser, setTypingUser] = useState(null);
    const [chatError, setChatError] = useState(null);

    // Feature: Select and Delete
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState(new Set());
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Feature: Two-Way Deletion Modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Ref for auto-scrolling, typing timeout, and input focus
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const inputRef = useRef(null);

    // --- Scroll to Bottom ---
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, typingUser]);


    // Derived Conversation ID for stability
    const conversationId = activeChat?._id || activeChat?.id;

    // --- SOCKET AND DATA LIFECYCLE MANAGEMENT ---
    useEffect(() => {
        if (!conversationId) {
            setMessages([]);
            return;
        }

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
                            senderId: 'partner_id_placeholder'
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
            setMessages(prev => {
                // Deduplication: Check if message ID already exists
                if (prev.some(msg => msg._id === newMessage._id)) {
                    return prev;
                }
                return [...prev, newMessage];
            });
            setTypingUser(null); // Stop typing indicator if a message arrives

            // If the chat is open, immediately mark new incoming message as read
            if (newMessage.sender._id !== currentUserId) {
                if (newMessage.conversationId === conversationId) {
                    socket.emit('mark_messages_read', {
                        conversationId: conversationId,
                        userId: currentUserId
                    });
                }
            }
        };

        const onMessagesDeleted = ({ messageIds }) => {
            setMessages(prev => prev.filter(msg => !messageIds.includes(msg._id)));
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
        socket.on('messages_deleted', onMessagesDeleted);

        // E. Cleanup function
        return () => {
            socket.off('receive_message', onReceiveMessage);
            socket.off('typing', onTyping);
            socket.off('chat_error', onChatError);
            socket.off('messages_read', onMessagesRead);
            socket.off('messages_deleted', onMessagesDeleted);
        };

    }, [conversationId, currentUserId]); // 🚨 CHANGED: Only re-run if conversationId changes, not entire activeChat object


    // --- TYPING AND SEND HANDLER ---
    const handleTyping = (e) => {
        const value = e.target.value;
        setInputContent(value);
        setChatError(null);

        if (!activeChat) return;

        if (value.length > 0) {
            // Send 'start typing'
            const convId = activeChat._id || activeChat.id;
            socket.emit('typing_status', { conversationId: convId, username: activeChat.name, isTyping: true });

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            // Set 'stop typing' timeout
            typingTimeoutRef.current = setTimeout(() => {
                const convId = activeChat._id || activeChat.id;
                socket.emit('typing_status', { conversationId: convId, username: activeChat.name, isTyping: false });
            }, 3000);
        } else {
            // Send 'stop typing' immediately when input is cleared
            const convId = activeChat._id || activeChat.id;
            socket.emit('typing_status', { conversationId: convId, username: activeChat.name, isTyping: false });
        }
    };

    // 🚨 FINALIZED HANDLE SEND 🚨
    const handleSend = () => {
        if (!inputContent.trim() || !activeChat || !currentUserId) return;

        const messagePayload = {
            senderId: currentUserId,
            // The activeChat.id is used as the recipient/conversation ID for the server action
            recipientOrConversationId: activeChat._id || activeChat.id,
            content: inputContent,
        };

        // 1. Emit the message to the Socket.IO server
        socket.emit('send_message', messagePayload);

        // 2. Clear input
        setInputContent('');
    };

    // --- DELETION HANDLER ---
    const toggleMessageSelection = (messageId) => {
        if (!isSelectMode) return;
        const newSet = new Set(selectedMessages);
        if (newSet.has(messageId)) newSet.delete(messageId);
        else newSet.add(messageId);
        setSelectedMessages(newSet);
    };

    const handleDeleteSelected = async (deleteForEveryone) => {
        if (selectedMessages.size === 0) return;
        setIsDeleting(true);
        setShowDeleteModal(false);
        try {
            const messageIds = Array.from(selectedMessages);
            const res = await deleteMessagesAction(conversationId, messageIds, currentUserId, deleteForEveryone);
            if (res.success) {
                setMessages(prev => prev.filter(m => !selectedMessages.has(m._id)));
                if (deleteForEveryone) {
                    socket.emit('delete_messages', { conversationId, messageIds });
                }
            }
        } catch (e) {
            setChatError("Failed to delete messages.");
        } finally {
            setIsDeleting(false);
            setIsSelectMode(false);
            setSelectedMessages(new Set());
        }
    };


    // --- JSX RENDER ---
    // 1. Identify the Other Participant
    const otherParticipant = activeChat?.participants?.find(
        p => String(p._id) !== String(currentUserId)
    );

    // 2. Derive Display Details
    // If group, use activeChat.name. If 1-on-1, use partner's name. Fallback to 'Loading...'
    const chatPartnerName = activeChat?.isGroup
        ? activeChat.name
        : (otherParticipant?.name || otherParticipant?.username || activeChat?.name || 'Loading...');

    const chatPartnerPic = activeChat?.isGroup
        ? '/default-group.png'
        : (otherParticipant?.profilepic || activeChat?.profilepic || '/default-avatar.png');

    // Online status passed from wrapper
    const isOnline = activeChat?.isOnline;

    if (!activeChat) {
        return (
            <div className="flex-1 w-full h-full flex items-center justify-center bg-gray-50/30">
                <div className="text-center p-8 rounded-3xl shadow-xl bg-white/70 backdrop-blur-md border border-white">
                    <div className="w-20 h-20 bg-gradient-to-tr from-blue-200 to-cyan-200 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
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
        <div className="flex flex-col w-full h-full bg-white dark:bg-black relative transition-colors duration-300">
            {/* Header: Chat Partner Details */}
            <div className="px-3 md:px-6 py-3 md:py-4 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between flex-shrink-0 z-10 shadow-sm transition-colors duration-300">
                <div className="flex items-center gap-2 md:gap-4">
                    {/* Back Button for mobile */}
                    <button 
                        onClick={onBack}
                        className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                    </button>

                    <div className="relative group cursor-pointer">
                        <img
                            src={chatPartnerPic}
                            alt={chatPartnerName}
                            className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-white dark:border-neutral-800 shadow-sm transition-transform group-hover:scale-105"
                        />
                        {isOnline ? (
                            <span className="absolute bottom-0 right-0 w-3 md:w-3.5 h-3 md:h-3.5 bg-green-500 border-2 border-white dark:border-neutral-800 rounded-full shadow-sm animate-pulse"></span>
                        ) : (
                            <span className="absolute bottom-0 right-0 w-3 md:w-3.5 h-3 md:h-3.5 bg-gray-400 border-2 border-white dark:border-neutral-800 rounded-full shadow-sm"></span>
                        )}
                    </div>

                    <div className="min-w-0">
                        <h2 className="text-base md:text-xl font-bold text-gray-900 dark:text-white leading-tight truncate max-w-[120px] md:max-w-none">{chatPartnerName}</h2>
                        <p className={`text-[10px] md:text-sm font-medium transition-all ${typingUser ? 'text-blue-600' : isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                            {typingUser ? "typing..." : isOnline ? "Active now" : "Offline"}
                        </p>
                    </div>
                </div>

                <div className="flex gap-1 md:gap-2 text-gray-400 flex-shrink-0">
                    <button 
                        onClick={() => { setIsSelectMode(!isSelectMode); setSelectedMessages(new Set()); }}
                        className={`p-2 md:p-3 rounded-xl transition-all ${isSelectMode ? 'bg-red-100 text-red-600' : 'hover:bg-blue-50 hover:text-blue-600'}`}
                    >
                        {isSelectMode ? <X className="w-5 h-5" /> : <Trash2 className="w-5 h-5 flex-shrink-0" />}
                    </button>
                    <button onClick={() => isOnline ? onStartCall(false) : alert("User is offline")} className="p-2 md:p-3 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"><Phone className="w-5 h-5" /></button>
                    <button onClick={() => isOnline ? onStartCall(true) : alert("User is offline")} className="p-2 md:p-3 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"><Video className="w-5 h-5" /></button>
                    <button className="hidden md:block p-2 md:p-3 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"><MoreVertical className="w-5 h-5" /></button>
                </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 px-3 py-4 md:p-6 overflow-y-auto space-y-4 md:space-y-6 custom-scrollbar bg-slate-50/50 dark:bg-[#0a0a0a]/50 transition-colors duration-300">
                {/* Deduplicate messages by _id before rendering */}
                {[...new Map(messages.map(m => [m._id, m])).values()].map((message, index, deduped) => {
                    // Check if the message belongs to the current user
                    const isMe = isMessageFromMe(message, currentUserId);
                    const senderName = isMe ? 'Me' : message.sender?.name || message.sender?.username;
                    const isRead = message.readBy && message.readBy.length > 1; // Sender is always in readBy
                    const showAvatar = !isMe && (index === 0 || deduped[index - 1]?.senderId !== message.senderId);

                    // Date Separator Logic
                    const currentDateString = new Date(message.createdAt).toDateString();
                    const previousDateString = index > 0 ? new Date(deduped[index - 1].createdAt).toDateString() : null;
                    const showDateSeparator = currentDateString !== previousDateString;

                    // 5-hour Deletion Limit
                    const messageAgeMs = Date.now() - new Date(message.createdAt).getTime();
                    const isDeletable = messageAgeMs <= 5 * 60 * 60 * 1000;

                    return (
                        <React.Fragment key={message._id || index}>
                            {showDateSeparator && (
                                <div className="w-full flex justify-center my-6">
                                    <span className="text-[11px] font-bold text-gray-400 bg-gray-200/50 px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm shadow-sm border border-gray-100">
                                        {formatMessageDate(message.createdAt)}
                                    </span>
                                </div>
                            )}
                            <div
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'} group mb-1`}
                            >
                            {!isMe && (
                                <div className={`w-7 md:w-8 mr-1.5 md:mr-3 flex-shrink-0 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                                    {showAvatar && (
                                        <img
                                            src={chatPartnerPic}
                                            className="w-7 h-7 md:w-9 md:h-9 rounded-full object-cover border border-white shadow-sm"
                                        />
                                    )}
                                </div>
                            )}
                            <div
                                onClick={() => {
                                    if (!isSelectMode) return;
                                    if (isDeletable) toggleMessageSelection(message._id);
                                    else {
                                        setChatError("Cannot delete messages older than 5 hours.");
                                        setTimeout(() => setChatError(null), 3000);
                                    }
                                }}
                                className={`max-w-[75%] md:max-w-[75%] lg:max-w-[65%] px-3 md:px-5 py-2 md:py-3 rounded-2xl shadow-sm text-sm md:text-[15px] leading-relaxed relative transition-all ${isSelectMode && isDeletable ? 'cursor-pointer hover:scale-[1.02]' : ''}
                                    ${isSelectMode && !isDeletable ? 'opacity-60 cursor-not-allowed grayscale' : ''}
                                    ${isSelectMode && selectedMessages.has(message._id) ? 'ring-4 ring-red-400 opacity-90 scale-95' : ''}
                                    ${isMe
                                        ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-br-sm shadow-blue-200 dark:shadow-none'
                                        : 'bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-100 rounded-bl-sm border border-gray-100 dark:border-neutral-800 hover:shadow-md dark:shadow-none'
                                    }
                                `}
                            >
                                {/* Display sender name for group chats */}
                                {!isMe && activeChat.isGroup && <p className="text-xs font-bold mb-1 text-blue-500">{senderName}</p>}

                                <p>{message.content}</p>

                                <div className={`flex items-center justify-end mt-1 space-x-1 opacity-80 ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
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
                        </React.Fragment>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Footer OR Selection Footer */}
            <div className="p-3 md:p-4 bg-white dark:bg-black border-t border-gray-100 dark:border-neutral-800 flex-shrink-0 z-10 transition-colors duration-300 pb-20 md:pb-4">
                {/* 🚨 ERROR DISPLAY 🚨 */}
                {chatError && (
                    <div className="text-red-600 text-sm mb-2 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
                        <span>⚠️</span> {chatError}
                    </div>
                )}

                {isSelectMode ? (
                    <div className="flex items-center justify-between max-w-5xl mx-auto py-1 md:py-2">
                        <span className="text-sm md:text-base text-gray-600 dark:text-gray-300 font-medium">
                            {selectedMessages.size} selected
                        </span>
                        <div className="flex gap-2 md:gap-4">
                            <button
                                onClick={() => { setIsSelectMode(false); setSelectedMessages(new Set()); }}
                                className="px-3 md:px-5 py-2 md:py-2.5 text-sm md:text-base rounded-xl font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                disabled={selectedMessages.size === 0 || isDeleting}
                                className={`px-4 md:px-5 py-2 md:py-2.5 text-sm md:text-base rounded-xl font-bold text-white flex items-center gap-2 shadow-lg transition-all
                                    ${selectedMessages.size === 0 
                                        ? 'bg-red-300 shadow-none cursor-default' 
                                        : 'bg-gradient-to-r from-red-500 to-cyan-600 hover:shadow-red-200 hover:scale-105 active:scale-95'
                                    }`}
                            >
                                <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-2 md:gap-3 items-end max-w-5xl mx-auto">
                        <button className="p-2 md:p-3 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-neutral-800 rounded-full transition-all">
                            <span className="text-xl md:text-2xl">📎</span>
                        </button>

                        <div className="flex-1 bg-gray-50 dark:bg-neutral-900 rounded-2xl md:rounded-3xl border border-gray-200 dark:border-neutral-800 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all flex items-center px-3 md:px-4 py-0.5 md:py-1 shadow-inner dark:shadow-none">
                            <input
                                type="text"
                                placeholder="Type a message..."
                                value={inputContent}
                                onChange={handleTyping}
                                onKeyPress={(e) => { if (e.key === 'Enter') handleSend(); }}
                                className="flex-1 bg-transparent py-2 md:py-3 focus:outline-none text-sm md:text-base text-gray-800 dark:text-white placeholder-gray-400 font-medium"
                                ref={inputRef}
                            />
                        </div>

                        <button
                            onClick={handleSend}
                            disabled={!inputContent.trim()}
                            className={`p-2.5 md:p-3.5 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center
                                ${!inputContent.trim()
                                    ? 'bg-gray-200 text-gray-400 shadow-none cursor-default'
                                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-blue-200 hover:shadow-blue-400 hover:scale-105 active:scale-95'
                                }`}
                        >
                            <Send className="w-4 h-4 md:w-5 md:h-5 ml-0.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* TWO-WAY DELETE MODAL */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl shadow-2xl max-w-sm w-full mx-4 border border-gray-100 dark:border-neutral-800 relative transform transition-all">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete message?</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            This action can be done for everyone, or just for you.
                        </p>

                        <div className="flex flex-col gap-3">
                            {/* Check if all selected messages were sent by ME */}
                            {Array.from(selectedMessages).every(id => {
                                const msg = messages.find(m => m._id === id);
                                return msg && isMessageFromMe(msg, currentUserId);
                            }) && (
                                <button
                                    onClick={() => handleDeleteSelected(true)}
                                    className="w-full py-3 text-red-600 font-bold hover:bg-red-50 rounded-xl transition"
                                >
                                    Delete for everyone
                                </button>
                            )}
                            
                            <button
                                onClick={() => handleDeleteSelected(false)}
                                className="w-full py-3 text-red-600 font-bold hover:bg-red-50 rounded-xl transition"
                            >
                                Delete for me
                            </button>
                            
                            <div className="h-px bg-gray-100 dark:bg-neutral-800 my-1"></div>
                            
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="w-full py-3 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-neutral-800 rounded-xl transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatView;