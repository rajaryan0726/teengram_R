// // app/components/ClientChatWrapper.jsx

// 'use client'; 
// import { useSearchParams } from 'next/navigation';
// import React, { useState,useEffect, useMemo } from 'react';
// import Sidebar from '../Components/Sidebar';
// import { fetchuser } from '@/actions/useractions'; // Assuming this function exists
// import ChatList from '../Components/ChatList';
// import ChatView from '../Components/ChatView';


// // We define the asynchronous fetch function outside the component for clarity
// const getFriendData = async (friendemail) => {
//   // Assuming fetchuser returns the MongoDB user object with an _id
//   return await fetchuser(friendemail);
// }


// export default function ClientChatWrapper({ initialConversations, currentUserId }) {

//     const searchParams = useSearchParams();
//     const friendEmail = searchParams.get('friend_email'); // Get email from URL

//     // 1. State for the friend's data (needed if starting a new chat)
//     const [friendData, setFriendData] = useState(null);

//     // 2. Derive the friend's ID and Conversation ID from state/props
//     const friendId = friendData?._id?.toString();

//     // 3. State for the currently active chat
//     const [conversations, setConversations] = useState(initialConversations);
//     const [activeChatId, setActiveChatId] = useState(null); 


//     // --- EFFECT 1: Fetch Friend's Data based on URL Email ---
//     useEffect(() => {
//         if (friendEmail) {
//             // Define and call async function inside useEffect
//             const loadFriend = async () => {
//                 const fData = await getFriendData(friendEmail);
//                 setFriendData(fData);
//             };
//             loadFriend();
//         }
//     }, [friendEmail]);


//     // --- EFFECT 2: Determine Active Chat ID once Friend's ID is available ---
//     useEffect(() => {
//         // This effect runs only when friendId (derived from friendData) is defined
//         if (friendId && currentUserId) {

//             // A. Check if a conversation with this friend already exists
//             const existingChat = initialConversations.find(conv => 
//                 // Check if the conversation has this friend as a participant
//                 conv.participants.some(p => p._id.toString() === friendId) && !conv.isGroup
//             );

//             if (existingChat) {
//                 // If exists, set the actual Conversation ID as active
//                 setActiveChatId(existingChat._id.toString());
//             } else {
//                 // If it's a new chat, use the friendId as a temporary identifier
//                 // The ChatView component will use this ID to send the first message.
//                 setActiveChatId(friendId);
//             }
//         }
//     }, [friendId, currentUserId, initialConversations]);


//     // 4. Find the currently active chat object for ChatView to render
//     const activeChat = useMemo(() => {
//         // 1. Try to find an existing conversation by its actual ID
//         const existing = conversations.find(chat => chat._id.toString() === activeChatId);
//         if (existing) return existing;

//         // 2. If the activeChatId is a temporary friendId (i.e., a new chat), create a temporary object
//         if (friendId && activeChatId === friendId) {
//             return { 
//                 id: friendId, 
//                 name: friendData?.name || friendData?.username || 'New Chat', 
//                 profilePic: friendData?.profilePic || '/default-avatar.png' 
//             };
//         }
//         return null; // No chat selected
//     }, [activeChatId, conversations, friendId, friendData]);


//     return (
//         <div className='flex h-screen bg-gray-50'>
//             <Sidebar />

//             <div className="flex flex-1 overflow-hidden">
//                 <ChatList 
//                     conversations={conversations}
//                     activeChatId={activeChatId}
//                     setActiveChatId={setActiveChatId}
//                     currentUserId={currentUserId}
//                 />

//                 <ChatView 
//                     activeChat={activeChat} 
//                     currentUserId={currentUserId}
//                     // We must pass the friendId to ChatView so the send logic knows the recipient
//                     recipientIdForNewChat={activeChatId === friendId ? friendId : null} 
//                 />
//             </div>
//         </div>
//     );
// }

// app/components/ClientChatWrapper.jsx

'use client';
import React, { useState, useEffect } from 'react';
import Sidebar from '../Components/Sidebar';
import ChatList from '../Components/ChatList';
import ChatView from '../Components/ChatView';
import { socket } from "@/lib/socket";

// The wrapper accepts the securely fetched data as props.
export default function ClientChatWrapper({ initialConversations, currentUserId, initialActiveChatId }) {

    // 1. Initialize states using props from the Server
    const [conversations, setConversations] = useState(initialConversations);
    const [activeChatId, setActiveChatId] = useState(initialActiveChatId); // Use the confirmed ID

    // Feature: Online Status
    const [onlineUsers, setOnlineUsers] = useState(new Set());

    // 2. Global Socket Management
    useEffect(() => {
        if (!socket.connected) socket.connect();

        // A. Identify User
        socket.emit('register_user', currentUserId);

        // B. Listen for Status Updates
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

        socket.on('user_online', onUserOnline);
        socket.on('user_offline', onUserOffline);

        return () => {
            socket.off('user_online', onUserOnline);
            socket.off('user_offline', onUserOffline);
        };
    }, [currentUserId]);

    // 3. Find the currently active chat object
    // activeChatId is now a guaranteed Conversation ID (or null)
    let activeChat = conversations.find(chat => chat._id.toString() === activeChatId)
        // Fallback for when the chat ID is confirmed but the conversations list
        // hasn't been updated to include the newly created conversation yet.
        // NOTE: This fallback needs to be more robust in production.
        || { id: activeChatId, name: 'Loading Chat...' };

    // Inject online status into active chat for ChatView
    if (activeChat && activeChat.participants) {
        // Find partner
        const partner = activeChat.participants.find(p => p._id.toString() !== currentUserId);
        if (partner) {
            activeChat = {
                ...activeChat,
                isOnline: onlineUsers.has(partner._id.toString())
            };
        }
    }

    // 4. Logic to update the list if a new message arrives (deferred for later)
    // You would add a useEffect hook here to listen for socket events that update 'conversations'.

    return (
        <div className='flex h-screen bg-gray-50'>
            <Sidebar />

            <div className="flex flex-1 overflow-hidden">
                <ChatList
                    conversations={conversations}
                    activeChatId={activeChatId}
                    setActiveChatId={setActiveChatId}
                    currentUserId={currentUserId}
                    onlineUsers={onlineUsers} // Pass for list indicators
                />

                <ChatView
                    activeChat={activeChat}
                    currentUserId={currentUserId}
                // No need for recipientIdForNewChat prop anymore!
                // ChatView will use activeChat.id (the Conversation ID) to send messages.
                />
            </div>
        </div>
    );
}