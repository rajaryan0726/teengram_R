"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { socket } from '@/lib/socket';

const SocketContext = createContext({
    socket: null,
    onlineUsers: new Set()
});

export const useSocket = () => {
    return useContext(SocketContext);
};

export default function SocketProvider({ children }) {
    const { data: session } = useSession();
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Only connect and register if the user is safely logged in possessing an ID
        if (session && session.user && session.user.id) {
            
            if (!socket.connected) {
                socket.connect();
            }

            // Register universally on mount
            socket.emit('register_user', session.user.id);
            setIsConnected(true);

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

            // C. Receive Initial Online Users List
            const onGetOnlineUsers = (users) => {
                setOnlineUsers(new Set(users));
            };

            socket.on('user_online', onUserOnline);
            socket.on('user_offline', onUserOffline);
            socket.on('get_online_users', onGetOnlineUsers);

            return () => {
                socket.off('user_online', onUserOnline);
                socket.off('user_offline', onUserOffline);
                socket.off('get_online_users', onGetOnlineUsers);
            };
        }
    }, [session?.user?.id]);

    return (
        <SocketContext.Provider value={{ socket, onlineUsers, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
}
