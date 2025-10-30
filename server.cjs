// server.js

const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');
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
        cors: {
            origin: "http://localhost:3000", // Allows connection from your frontend
            methods: ["GET", "POST"]
        }
    });

    // 3. Implement Socket Handlers
    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);
        
        // 🚨 IMPORTANT: Link to the chat handler file
        // 🚨 IMPORTANT: Link to the chat handler file
        require('./socketHandlers/chat').default(io, socket); 

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
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