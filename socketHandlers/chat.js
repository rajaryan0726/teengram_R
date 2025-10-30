// socketHandlers/chat.js
// This file is required and called by your custom 'server.js' file

// 🚨 IMPORTANT: Use relative path to access the actions folder
import { saveMessageAndGetDetails } from '../actions/useractions'; 

export default (io, socket) => {
    
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
};