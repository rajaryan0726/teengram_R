'use client'; 

import React, { useEffect, useState, useRef } from 'react';
import { socket } from "@/lib/socket"; // Import the socket client

// Helper to determine if the message was sent by the current user
const isMessageFromMe = (message, currentUserId) => {
    // Check if the message was optimistically added (sender: { name: 'Me' }) or from the server
    const senderId = message.sender?._id?.toString() || message.senderId; 
    return senderId === currentUserId;
};

const ChatView = ({ activeChat, currentUserId }) => {
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
        
        fetchHistory(); // 🚨 Call the function defined in scope

        // B. Socket Connection and Joining Room
        if (!socket.connected) {
            socket.connect();
        }
        socket.emit('join_chat', conversationId);
        
        // C. Define Handler Functions 
        const onReceiveMessage = (newMessage) => {
            setMessages(prev => [...prev, newMessage]); 
            setTypingUser(null); // Stop typing indicator if a message arrives
        };

        const onTyping = ({ username, isTyping }) => {
            setTypingUser(isTyping ? username : null);
        };

        const onChatError = (error) => {
            setChatError(error.message);
        };
        
        // D. Add Listeners
        socket.on('receive_message', onReceiveMessage);
        socket.on('typing', onTyping);
        socket.on('chat_error', onChatError); 
        
        // E. Cleanup function
        return () => {
            socket.off('receive_message', onReceiveMessage);
            socket.off('typing', onTyping);
            socket.off('chat_error', onChatError);
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
    const chatPartnerName = activeChat?.username || 'Loading...';

    if (!activeChat) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-100">
                <div className="text-center text-gray-500 p-8 rounded-xl shadow-lg bg-white/70 backdrop-blur-sm">
                    <p className="text-2xl font-semibold mb-2">Welcome to TeenGram Chat! 🎉</p>
                    <p>Select a friend from the left panel or use the message button on a profile.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 bg-gray-100">
            {/* Header: Chat Partner Details */}
            <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center">
                    <img 
                        src={activeChat.profilePic || "/default-avatar.png"} 
                        alt={chatPartnerName} 
                        className="w-10 h-10 rounded-full object-cover mr-3"
                    />
                    <div>
                        <p className="text-lg font-bold text-gray-800">{chatPartnerName}</p>
                        <p className="text-xs text-green-500">{typingUser ? `${typingUser} is typing...` : 'Online'}</p>
                    </div>
                </div>
                <button className="text-gray-500 hover:text-indigo-600 p-2 rounded-full transition-colors">
                    <span className="text-xl font-bold">...</span>
                </button>
            </div>

            {/* Message Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {messages.map((message, index) => {
                    // Check if the message belongs to the current user
                    const isMe = isMessageFromMe(message, currentUserId);
                    const senderName = isMe ? 'Me' : message.sender?.name || message.sender?.username;

                    return (
                        <div 
                            key={message._id || index} 
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                            <div 
                                className={`max-w-xs lg:max-w-md p-3 rounded-xl shadow-md 
                                    ${isMe 
                                        ? 'bg-indigo-500 text-white rounded-br-none' 
                                        : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
                                    }
                                `}
                            >
                                {/* Display sender name for group chats */}
                                {!isMe && activeChat.isGroup && <p className="text-xs font-semibold mb-1 text-indigo-300">{senderName}</p>}
                                <p className="text-sm">{message.content}</p>
                                <span className={`block text-right mt-1 ${isMe ? 'text-indigo-200' : 'text-gray-500'} text-xs`}>
                                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} /> 
            </div>

            {/* Input Footer */}
            <div className="p-4 border-t border-gray-200 bg-white shadow-lg">
                {/* 🚨 ERROR DISPLAY 🚨 */}
                {chatError && (
                    <div className="text-red-600 text-sm mb-2 p-2 bg-red-100 rounded-lg">
                        Error: {chatError}
                    </div>
                )}
                
                <div className="flex items-center">
                    <button className="p-2 text-gray-400 hover:text-indigo-500 transition-colors">
                        <span className="text-2xl font-light">📎</span>
                    </button>
                    <input
                        type="text"
                        placeholder="Type your message..."
                        value={inputContent}
                        onChange={handleTyping}
                        onKeyPress={(e) => { if (e.key === 'Enter') handleSend(); }}
                        className="flex-1 mx-3 p-3 text-sm border border-gray-300 rounded-full focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button 
                        onClick={handleSend}
                        className="px-4 py-2 bg-indigo-500 text-white font-semibold rounded-full hover:bg-indigo-600 transition-colors"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatView;