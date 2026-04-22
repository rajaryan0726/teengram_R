// server.js

import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';
import chatHandler from './socketHandlers/chat.js';

// Configuration
const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// Initialize Next.js App
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
    // 1. Create standard HTTP Server
    const httpServer = createServer(handler);

    // 2. Attach Socket.IO to the HTTP Server
    const io = new Server(httpServer, {
        path: '/api/socket',
        maxHttpBufferSize: 1e8, // 100 MB max payload for large images/videos
        cors: {
            origin: "http://localhost:3000", // Allows connection from your frontend
            methods: ["GET", "POST"]
        }
    });

    // 3. Implement Socket Handlers
    // Track online users: Map<UserId, SocketId>
    const onlineUsers = new Map();

    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        // 🚨 IMPORTANT: Link to the chat handler file
        chatHandler(io, socket, onlineUsers);

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
            // Find and remove user from online map
            for (const [userId, socketId] of onlineUsers.entries()) {
                if (socketId === socket.id) {
                    onlineUsers.delete(userId);
                    // Broadcast offline status to everyone
                    io.emit('user_offline', userId);
                    console.log(`User ${userId} went offline`);
                    break;
                }
            }
        });
    });

    // 4. Start Listening
    httpServer
        .once('error', (err) => {
            console.error(err);
            process.exit(1);
        })
        .listen(port, () => {
            console.log(`> ⚡️ TeenGram Real-Time Server Ready on http://${hostname}:${port}`);
        });
});
