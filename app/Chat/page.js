// app/Chat/page.js

import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { getUserIdByEmail, getConversationsForUser, findOrCreateConversation, fetchuser } from '@/actions/useractions'
import ClientChatWrapper from './ClientChatWrapper';
export default async function ChatPage({ searchParams }) { // 🚨 Access searchParams from props

    // 1. SECURE AUTHENTICATION
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return <div className="text-center p-10">Please sign in to view your chats.</div>;
    }

    const currentUserId = await getUserIdByEmail(session.user.email);
    if (!currentUserId) {
        return <div className="text-center p-10">User data not found.</div>;
    }

    // 2. FETCH INITIAL DATA (Chat List)
    let initialConversations = await getConversationsForUser(currentUserId);

    let initialActiveChatId = null;

    // 3. 🚨 NEW LOGIC: FIND OR CREATE CONVERSATION 🚨
    const friendEmail = searchParams.friend_email; // Read friend_email from URL
    if (friendEmail) {
        const friendData = await fetchuser(friendEmail); // Fetch friend's full data

        if (friendData && friendData._id) {
            // Find or Create the conversation and get its ID immediately
            const convId = await findOrCreateConversation(currentUserId, friendData._id.toString());
            initialActiveChatId = convId;

            // OPTIONAL UX IMPROVEMENT: If the chat list was empty, we can manually 
            // add the new conversation object to the initialConversations list 
            // before passing it to the client to ensure the chat is visible on the left.
        }
    }

    // 4. PASS ALL DATA TO CLIENT WRAPPER
    return (
        <ClientChatWrapper
            initialConversations={initialConversations}
            currentUserId={currentUserId}
            initialActiveChatId={initialActiveChatId} // Pass the confirmed ID
        />
    );
}