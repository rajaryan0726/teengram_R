// Components/ChatList.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { searchUsersAction } from '@/actions/useractions';

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
        p => String(p._id) !== String(currentUserId)
    );
    const displayName = chat.isGroup ? chat.name : (otherParticipant?.name || otherParticipant?.username || 'Unknown User');
    const displayPic = chat.isGroup ? '/default-group.png' : otherParticipant?.profilepic;

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

// Global User Result Item
const GlobalUserItem = ({ user, onClick }) => (
    <div
        onClick={() => onClick(user)}
        className="flex items-center p-3 mx-2 mb-2 rounded-xl cursor-pointer hover:bg-violet-50 transition-colors border border-dashed border-gray-200 hover:border-violet-200"
    >
        <img
            src={user.profilepic || "/default-avatar.png"}
            alt={user.name}
            className="w-10 h-10 rounded-full object-cover border border-white shadow-sm"
        />
        <div className="ml-3">
            <p className="font-semibold text-gray-800 text-sm">{user.name}</p>
            <p className="text-xs text-gray-500">@{user.username}</p>
        </div>
        <div className="ml-auto text-violet-600">
            <UserPlus size={18} />
        </div>
    </div>
);


// ----------------------------------------------------------------------
// The main ChatList component wraps the list item
// ----------------------------------------------------------------------

const ChatList = ({ conversations, activeChatId, setActiveChatId, currentUserId, onlineUsers, onStartNewChat }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [globalResults, setGlobalResults] = useState([]);
    const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

    // Filter conversations based on search
    const filteredConversations = conversations.filter(chat => {
        const curIdStr = String(currentUserId);

        // Find the "other" participant (first one that isn't me)
        const otherParticipant = chat.participants.find(p => String(p._id) !== curIdStr);

        // Standard Display Name (Group Name or User Name)
        const displayName = chat.isGroup ? chat.name : (otherParticipant?.name || otherParticipant?.username || '');
        const username = otherParticipant?.username || '';
        const email = otherParticipant?.email || '';

        const search = searchTerm.toLowerCase().trim();
        if (!search) return true;

        // Check Matches
        const nameMatch = displayName && displayName.toLowerCase().includes(search);
        const userMatch = username && username.toLowerCase().includes(search);
        const emailMatch = email && email.toLowerCase().includes(search);

        return nameMatch || userMatch || emailMatch;
    });

    // Handle Global Search (Debounced effect could be better, but direct for now)
    useEffect(() => {
        const fetchGlobalUsers = async () => {
            if (searchTerm.trim().length < 2) {
                setGlobalResults([]);
                return;
            }

            setIsSearchingGlobal(true);
            try {
                // Ensure we pass current user email if available, or just ID logic backend handles it
                // searchUsersAction expects (query, email) - we might need to fetch email or update action to take ID
                // But for now, if we don't have email in props, we can pass null and update backend?
                // Wait, searchUsersAction uses email to exclude self. 
                // Let's assume currentUserId is passed. The backend uses email for exclusion.
                // We should probably update action to exclude by ID as well to be safe, 
                // OR we just filter client side for now.

                // Hack: Pass empty email, filter results by ID on client
                const users = await searchUsersAction(searchTerm, "");

                // Filter out current user and already existing conversations
                const filteredParams = users.filter(u =>
                    String(u._id) !== String(currentUserId) &&
                    !conversations.some(c => !c.isGroup && c.participants.some(p => String(p._id) === String(u._id)))
                );

                setGlobalResults(filteredParams);

            } catch (error) {
                console.error("Global search error", error);
            } finally {
                setIsSearchingGlobal(false);
            }
        };

        const timeoutId = setTimeout(fetchGlobalUsers, 500); // 500ms debounce
        return () => clearTimeout(timeoutId);
    }, [searchTerm, currentUserId, conversations]);


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
                        placeholder="Search chats or people..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-2xl 
                                   focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500
                                   placeholder-gray-400 font-medium transition-all shadow-sm group-hover:shadow-md"
                    />
                </div>
            </div>

            {/* List of Conversations */}
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
                {/* 1. Existing Chats */}
                {searchTerm.length === 0 && filteredConversations.length > 0 && (
                    filteredConversations.map(chat => {
                        // Check if online
                        const otherParticipant = chat.participants.find(p => String(p._id) !== String(currentUserId));
                        const isOnline = otherParticipant ? onlineUsers?.has(String(otherParticipant._id)) : false;

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
                )}

                {/* 2. Global Results Section */}
                {searchTerm.length > 0 && (
                    <div className="mt-4">
                        <h3 className="px-4 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                            {isSearchingGlobal ? 'Searching Global...' : 'New People'}
                        </h3>

                        {globalResults.length > 0 ? (
                            globalResults.map(user => (
                                <GlobalUserItem
                                    key={user._id}
                                    user={user}
                                    onClick={onStartNewChat}
                                />
                            ))
                        ) : (
                            !isSearchingGlobal && filteredConversations.length === 0 && (
                                <div className="p-8 text-center text-gray-400 font-medium">
                                    No users found.
                                </div>
                            )
                        )}
                    </div>
                )}

                {searchTerm.length === 0 && filteredConversations.length === 0 && (
                    <div className="p-8 text-center text-gray-400 font-medium">
                        No conversations found.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatList;