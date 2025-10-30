// Components/ChatList.jsx

import React from 'react';

// NOTE: The ChatList component still needs to be defined below this item component.

const ChatListItem = ({ chat, isActive, onClick, currentUserId }) => {
    
    // 1. Unread Logic (INTEGRATED)
    const calculateUnreadCount = (conversation, userId) => {
        // If there is no last message, there are no unread messages.
        if (!conversation.lastMessage) return 0;
        
        // Check if the current user's ID is NOT present in the readBy array of the last message.
        // We convert to string for safe comparison with the currentUserId prop.
        const isUnread = !conversation.lastMessage.readBy.map(id => id.toString()).includes(userId);
        
        // This simple logic returns 1 if the last message is unread, 0 otherwise.
        return isUnread ? 1 : 0; 
    };

    const unreadCount = calculateUnreadCount(chat, currentUserId);
    
    // 2. Determine Display Name
    const otherParticipant = chat.participants.find(
        // Ensure to use toString() for reliable comparison against the string prop
        p => p._id.toString() !== currentUserId
    );
    const displayName = chat.isGroup ? chat.name : (otherParticipant?.name || 'Unknown User');
    const displayPic = chat.isGroup ? '/default-group.png' : otherParticipant?.profilePic;
    
    
    return (
        <div
            onClick={() => onClick(chat._id.toString())} // Use MongoDB _id for click handler
            // Apply styling classes based on active state and unread status
            className={`
                flex items-center p-3 cursor-pointer transition-all duration-200 border-l-4 
                ${isActive 
                    ? 'bg-indigo-50 border-indigo-500 text-gray-900' 
                    : 'bg-white border-transparent hover:bg-gray-100'
                }
            `}
        >
            {/* Avatar */}
            <div className="relative">
                <img 
                    src={displayPic || "/default-avatar.png"} 
                    alt={displayName} 
                    className="w-12 h-12 rounded-full object-cover"
                />
            </div>

            {/* Chat Details */}
            <div className="flex-1 min-w-0 ml-3">
                <p className="text-sm font-semibold truncate">{displayName}</p>
                {/* Highlight last message if unread */}
                <p className={`text-xs truncate ${isActive || unreadCount > 0 ? 'font-bold text-gray-800' : 'text-gray-500'}`}>
                    {chat.lastMessage?.content || 'Start a conversation.'}
                </p>
            </div>

            {/* Unread Count */}
            {unreadCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 ml-2 text-xs font-bold text-white bg-red-500 rounded-full">
                    {unreadCount} {/* Displays 1 based on our simple logic */}
                </span>
            )}
        </div>
    );
};


// ----------------------------------------------------------------------
// The main ChatList component wraps the list item
// ----------------------------------------------------------------------

const ChatList = ({ conversations, activeChatId, setActiveChatId, currentUserId }) => {
    return (
        <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
            
            {/* Header: Search/New Chat */}
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 mb-2">Messages</h2>
                <input
                    type="text"
                    placeholder="Search friends or groups..."
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
            </div>

            {/* List of Conversations */}
            <div className="flex-1 overflow-y-auto">
                {conversations.map(chat => (
                    <ChatListItem
                        key={chat._id.toString()}
                        chat={chat}
                        isActive={chat._id.toString() === activeChatId}
                        onClick={setActiveChatId}
                        currentUserId={currentUserId}
                    />
                ))}
            </div>
        </div>
    );
};

export default ChatList;