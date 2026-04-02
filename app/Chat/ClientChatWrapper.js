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
//                 profilepic: friendData?.profilepic || '/default-avatar.png' 
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
import { useSocket } from '../providers/SocketProvider';
import { findOrCreateConversation } from '@/actions/useractions';

// The wrapper accepts the securely fetched data as props.
export default function ClientChatWrapper({ initialConversations, currentUserId, initialActiveChatId }) {

    const { socket, onlineUsers, isConnected, startCall } = useSocket();

    // 1. Initialize states using props from the Server
    const [conversations, setConversations] = useState(initialConversations);
    const [activeChatId, setActiveChatId] = useState(initialActiveChatId);

    // START NEW CHAT HANDLER
    const handleStartNewChat = async (selectedUser) => {
        try {
            // 1. Get/Create Conversation ID
            const conversationId = await findOrCreateConversation(currentUserId, selectedUser._id);

            // 2. Check if it already exists in our list
            const existing = conversations.find(c => c._id === conversationId);

            if (existing) {
                setActiveChatId(conversationId);
            } else {
                // 3. Optimistically add to list
                const newConv = {
                    _id: conversationId,
                    isGroup: false,
                    participants: [
                        { _id: currentUserId }, // Me (simplified)
                        { ...selectedUser }     // Them
                    ],
                    lastMessage: null,
                    updatedAt: new Date().toISOString()
                };

                setConversations(prev => [newConv, ...prev]);
                setActiveChatId(conversationId);
            }
        } catch (error) {
            console.error("Error starting chat:", error);
            alert("Failed to start chat.");
        }
    };



    // 3. Find the currently active chat object
    // activeChatId is now a guaranteed Conversation ID (or null)
    let activeChat = conversations.find(chat => chat._id.toString() === activeChatId)
        // Fallback for when the chat ID is confirmed but the conversations list
        // hasn't been updated to include the newly created conversation yet.
        || { _id: activeChatId, name: 'Loading Chat...' };

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

    // 4. Logic to update the list if a new message arrives 
    useEffect(() => {
        if (!socket || !isConnected) return;

        const onReceiveMessageGlobal = (newMessage) => {
            console.log("Global update received:", newMessage);

            setConversations(prev => {
                const convIndex = prev.findIndex(c => c._id.toString() === newMessage.conversationId);

                // A. If Conversation exists in the list
                if (convIndex > -1) {
                    const updatedConv = { ...prev[convIndex] };

                    // Check if this message is newer than what we have (deduplication)
                    if (updatedConv.lastMessage && updatedConv.lastMessage._id === newMessage._id) {
                        return prev; // Already updated
                    }

                    // Optimistic Read Status: If we are currently in this chat, mark as read immediately
                    // This prevents the sidebar from showing "1 unread" while you are looking at the messages.
                    let messageToStore = newMessage;
                    if (activeChatId === newMessage.conversationId) {
                        // Add current user to readBy if not present
                        const readBy = newMessage.readBy || [];
                        if (!readBy.includes(currentUserId)) {
                            messageToStore = {
                                ...newMessage,
                                readBy: [...readBy, currentUserId]
                            };
                        }
                    }

                    updatedConv.lastMessage = messageToStore;
                    updatedConv.updatedAt = messageToStore.createdAt;

                    // Move to top
                    const newAll = [...prev];
                    newAll.splice(convIndex, 1);
                    newAll.unshift(updatedConv);
                    return newAll;
                }

                // B. If Conversation does NOT exist (Brand new chat initiated by someone else)
                // Ideally, we should fetch the full conversation object here.
                // For now, if we don't have it, we might need a way to fetch it or reload.
                // But simply returning prev is safer than adding a broken object.
                else {
                    // Trigger a re-fetch of all conversations? Or fetch just this one?
                    // For MVP, handling existing chats updating is the priority.
                    return prev;
                }
            });
        };

        socket.on('receive_message', onReceiveMessageGlobal);

        return () => {
            socket.off('receive_message', onReceiveMessageGlobal);
        };
    }, [socket, isConnected, activeChatId, currentUserId]);

    return (
        <div className='flex h-dvh bg-gray-50 dark:bg-black'>
            <Sidebar />

            <div className="flex flex-1 h-full min-h-0 overflow-hidden relative">
                {/* 
                   On Mobile (sm): 
                   - If NO activeChatId, Show ChatList (block), Hide ChatView (hidden)
                   - If activeChatId, Hide ChatList (hidden), Show ChatView (block)
                   On Desktop (md+):
                   - Both are visible (flex)
                */}
                <div className={`w-full md:w-80 lg:w-96 h-full overflow-y-auto border-r border-gray-200 dark:border-neutral-800 ${activeChatId ? 'hidden md:block' : 'block'}`}>
                    <ChatList
                        conversations={conversations}
                        activeChatId={activeChatId}
                        setActiveChatId={setActiveChatId}
                        currentUserId={currentUserId}
                        onlineUsers={onlineUsers}
                        onStartNewChat={handleStartNewChat}
                    />
                </div>

                <div className={`flex-1 h-full overflow-hidden ${!activeChatId ? 'hidden md:flex' : 'flex'}`}>
                    <ChatView
                        activeChat={activeChat}
                        currentUserId={currentUserId}
                        onBack={() => setActiveChatId(null)}
                        onStartCall={(isVideoCall) => {
                            const targetUser = activeChat.participants.find(p => p._id.toString() !== currentUserId);
                            startCall(targetUser, isVideoCall);
                        }}
                    />
                </div>
            </div>
        </div>
    );
}