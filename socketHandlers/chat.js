// socketHandlers/chat.js
// This file is required and called by your custom 'server.js' file

import { saveMessageAndGetDetails } from '../actions/useractions.js';
import mongoose from 'mongoose';

export default (io, socket, onlineUsers) => {

    // 0. EVENT: User comes online
    socket.on('register_user', (userId) => {
        onlineUsers.set(userId, socket.id);
        socket.join(userId); // 🚨 JOIN USER ROOM

        // Broadcast online status to everyone
        io.emit('user_online', userId);

        // 🚨 SEND EXISTING ONLINE USERS TO THE NEW USER
        socket.emit('get_online_users', Array.from(onlineUsers.keys()));

        console.log(`User ${userId} is Online and joined room ${userId}`);
    });

    // 1. EVENT: client sends 'join_chat'
    // Puts the client's socket into the conversation room (using the conversation ID).
    socket.on('join_chat', (conversationId) => {
        // Clean up: Leave any previous room to ensure user only receives messages for the active chat
        socket.rooms.forEach(room => {
            if (room !== socket.id) socket.leave(room);
        });

        socket.join(conversationId);
        console.log(`Socket ${socket.id} joined room ${conversationId}`);
    });


    // 2. EVENT: client sends 'send_message'
    // Persists the message and broadcasts it.
    socket.on('send_message', async ({ senderId, recipientOrConversationId, content }) => {

        try {
            // A. PERSISTENCE: Save to MongoDB and get populated details
            const newMessage = await saveMessageAndGetDetails(
                senderId,
                recipientOrConversationId,
                content
            );

            // Get the conversation ID (ensures we use the right room name)
            const conversationId = newMessage.conversationId.toString();

            // B. REAL-TIME BROADCAST: Send the message instantly to the specific room
            io.to(conversationId).emit('receive_message', newMessage);

            // 🚨 SIDEBAR UPDATE: Notify all participants via their User Rooms
            // We need to fetch the conversation to know the participants
            //  const conversation = await Conversation.findById(conversationId); // We might already have it
            //  if (conversation && conversation.participants) {
            //      conversation.participants.forEach(pId => {
            //          io.to(pId.toString()).emit('receive_message', newMessage); 
            //      });
            //  }
            // Optimization: We can do this only if we want the sidebar to update for users NOT in the chat room.
            // Since User B is in 'conversationId' ONLY if they have it open, we MUST emit to User B's personal room.
            // But we must avoid double-emitting if they are in the chat room? 
            // Client-side deduplication is easier.

            // Re-fetching conversation to get participants if not already available
            const conversationForBroadcast = await mongoose.model('Conversation').findById(conversationId);
            if (conversationForBroadcast && conversationForBroadcast.participants) {
                conversationForBroadcast.participants.forEach(pId => {
                    const pidStr = pId.toString();
                    // Emit to the user's personal room
                    io.to(pidStr).emit('receive_message', newMessage);
                });
            }

            console.log(`Message broadcast to room ${conversationId}`);

        } catch (error) {
            console.error("Socket Error on send_message:", error.message);

            // C. Error Handling: Send a specific error back to the sender
            socket.emit('chat_error', { message: error.message, status: 500 });
        }
    });


    // 3. EVENT: client sends 'typing_status'
    // Instantly notifies the other participant(s)
    socket.on('typing_status', ({ conversationId, username, isTyping }) => {
        // Broadcast to everyone in the room *except* the sender (using socket.to)
        socket.to(conversationId).emit('typing', { username, isTyping });
    });

    // 3.5 EVENT: client sends 'delete_messages'
    socket.on('delete_messages', ({ conversationId, messageIds }) => {
        socket.to(conversationId).emit('messages_deleted', { conversationId, messageIds });
    });

    // 4. EVENT: Mark messages as read
    socket.on('mark_messages_read', async ({ conversationId, userId, senderId }) => {
        // We can optionally update DB here if not done via API, but usually API handles bulk update.
        // For real-time UI, we act as a relay.
        // Notify the *original sender* that their messages were read
        socket.to(conversationId).emit('messages_read', { conversationId, readByUserId: userId });
        console.log(`Read receipt sent in room ${conversationId}`);
    });

    // 5. EVENT: Disconnect
    socket.on('disconnect', () => {
        // Find which user disconnected
        let disconnectedUserId = null;
        for (const [userId, socketId] of onlineUsers.entries()) {
            if (socketId === socket.id) {
                disconnectedUserId = userId;
                break;
            }
        }

        if (disconnectedUserId) {
            onlineUsers.delete(disconnectedUserId);
            io.emit('user_offline', disconnectedUserId);
            console.log(`User ${disconnectedUserId} went offline`);
        }
    });

    // --- NEW: WebRTC Signaling for Video/Audio Calling ---
    socket.on('call_offer', ({ recipientId, offer, callerInfo }) => {
        const recipientSocketId = onlineUsers.get(recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('incoming_call', { offer, callerInfo });
        }
    });

    socket.on('call_answer', ({ callerId, answer }) => {
        const callerSocketId = onlineUsers.get(callerId);
        if (callerSocketId) {
            io.to(callerSocketId).emit('call_answered', { answer });
        }
    });

    socket.on('ice_candidate', ({ targetId, candidate }) => {
        const targetSocketId = onlineUsers.get(targetId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('receive_ice_candidate', { candidate });
        }
    });

    socket.on('call_ended', ({ targetId }) => {
        const targetSocketId = onlineUsers.get(targetId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('call_ended_by_remote');
        }
    });
    
    socket.on('call_rejected', ({ targetId }) => {
        const targetSocketId = onlineUsers.get(targetId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('call_rejected_by_remote');
        }
    });

    // --- NEW: Social Features (Likes/Comments) ---
    socket.on('post_reaction', (data) => {
        // data = { postId, type, action, userId, ... }
        // Broadcast to everyone to update UI (Like counts, comments)
        io.emit('post_updated', data);

        // Send push notification to the pc-owner if they are online
        if (data.recipientId && onlineUsers.has(data.recipientId)) {
            const recipientSocketId = onlineUsers.get(data.recipientId);
            // Construct a notification object slightly different from DB schema if needed by frontend
            // Or just pass enough info for the toast
            const notificationPayload = {
                type: data.type,
                sender_username: data.sender_username, // We might need to pass this from client or fetch it
                text: data.type === 'like' ? 'liked your post' : 'commented on your post',
                createdAt: new Date(),
            };
            io.to(recipientSocketId).emit('new_notification', notificationPayload);
        }
    });

    socket.on('send_notification', (data) => {
        // data = { recipientId, notification }
        const recipientSocketId = onlineUsers.get(data.recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('new_notification', data.notification);
        }
    });

};
