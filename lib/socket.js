// lib/socket.js
'use client';

import { io } from "socket.io-client";

// Determine the socket server URL/path based on your custom server setup
// If we are in the browser, perfectly map the Socket to the current Cloudflare tunnel or localhost domain automatically!
const URL = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000");

// Export a single, persistent socket connection instance
// We use the same 'path' specified in server.js
export const socket = io(URL, {
    path: '/api/socket', 
    autoConnect: false, // Prevents connecting until explicitly told to
});