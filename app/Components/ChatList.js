// Components/ChatList.jsx
'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';

const ChatListItem = ({ chat, isActive, onClick, currentUserId, isOnline }) => {

    // 1. Unread Logic (INTEGRATED)
    const calculateUnreadCount = (conversation, userId) => {
        if (!conversation.lastMessage) return 0;
        const readBy = conversation.lastMessage.readBy || []; // Safety check
        const isUnread = !readBy.map(id => id.toString()).includes(userId);
        return isUnread ? 1 : 0;
    };

    const unreadCount = calculateUnreadCount(chat, currentUserId);

    // 2. Determine Display Name
    const otherParticipant = chat.participants.find(
        p => p._id.toString() !== currentUserId
    );
    const displayName = chat.isGroup ? chat.name : (otherParticipant?.name || otherParticipant?.username || 'Unknown User');
    const displayPic = chat.isGroup ? '/default-group.png' : otherParticipant?.profilePic;

    // Time formatting
    const lastMessageTime = chat.lastMessage?.createdAt
        ? new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : "";

    return (
        <div
            onClick={() => onClick(chat._id.toString())}
            className={`
                flex items-center p-4 mx-2 mb-2 rounded-2xl cursor-pointer transition-all duration-300 border border-transparent
                ${isActive
                    ? 'bg-white shadow-lg shadow-violet-200/50 border-violet-100 transform scale-[1.02]'
                    : 'hover:bg-white/60 hover:shadow-sm'
                }
            `}
        >
            {/* Avatar */}
            <div className="relative">
                <img
                    src={displayPic || "/default-avatar.png"}
                    alt={displayName}
                    className={`w-14 h-14 rounded-full object-cover border-2 ${isActive ? 'border-violet-500' : 'border-white ring-2 ring-gray-100'}`}
                />
                {/* Online Indicator */}
                {isOnline && (
                    <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm"></span>
                )}
            </div>

            {/* Chat Details */}
            <div className="flex-1 min-w-0 ml-4">
                <div className="flex justify-between items-baseline mb-1">
                    <p className={`font-bold text-base truncate ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>{displayName}</p>
                    {lastMessageTime && (
                        <span className="text-xs font-medium text-gray-400">
                            {lastMessageTime}
                        </span>
                    )}
                </div>
                {/* Highlight last message if unread */}
                <p className={`text-sm truncate ${isActive || unreadCount > 0 ? 'font-medium text-violet-600' : 'text-gray-500'}`}>
                    {chat.lastMessage?.sender?._id === currentUserId ? 'You: ' : ''}
                    {chat.lastMessage?.content || 'Start a conversation.'}
                </p>
            </div>

            {/* Unread Count */}
            {unreadCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 ml-2 text-xs font-bold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full shadow-md">
                    {unreadCount}
                </span>
            )}
        </div>
    );
};


// ----------------------------------------------------------------------
// The main ChatList component wraps the list item
// ----------------------------------------------------------------------

const ChatList = ({ conversations, activeChatId, setActiveChatId, currentUserId, onlineUsers }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Filter conversations based on search
    const filteredConversations = conversations.filter(chat => {
        const otherParticipant = chat.participants.find(p => p._id.toString() !== currentUserId);
        const name = chat.isGroup ? chat.name : (otherParticipant?.name || otherParticipant?.username || '');
        return name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className="w-80 lg:w-96 flex flex-col bg-gray-50/50 backdrop-blur-md border-r border-gray-100/50">

            {/* Header: Search/New Chat */}
            <div className="p-6 pb-4 bg-white/50 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-10">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-fuchsia-600 mb-6">
                    Messages
                </h2>

                <div className="relative group">
                    <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5 transition-colors group-focus-within:text-violet-500" />
                    <input
                        type="text"
                        placeholder="Search chats..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl 
                                   focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500
                                   placeholder-gray-400 font-medium transition-all shadow-sm group-hover:shadow-md"
                    />
                </div>
            </div>

            {/* List of Conversations */}
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
                {filteredConversations.length > 0 ? (
                    filteredConversations.map(chat => {
                        // Check if online
                        const otherParticipant = chat.participants.find(p => p._id.toString() !== currentUserId);
                        const isOnline = otherParticipant ? onlineUsers?.has(otherParticipant._id.toString()) : false;

                        return (
                            <ChatListItem
                                key={chat._id.toString()}
                                chat={chat}
                                isActive={chat._id.toString() === activeChatId}
                                onClick={setActiveChatId}
                                currentUserId={currentUserId}
                                isOnline={isOnline}
                            />
                        );
                    })
                ) : (
                    <div className="p-8 text-center text-gray-400 font-medium">
                        No conversations found.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatList;