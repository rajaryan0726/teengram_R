'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Search,
  MessageCircle,
  Heart,
  PlusSquare,
  User,
  Trophy,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useSession } from 'next-auth/react';
import { useSocket } from '../providers/SocketProvider';
import { checkUnreadMessages, checkUnreadNotifications } from '@/actions/useractions';

const BottomNavbar = () => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { socket } = useSocket();
  const [hasUnread, setHasUnread] = useState(false);
  const [hasUnreadNotif, setHasUnreadNotif] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      checkUnreadMessages(session.user.id).then(setHasUnread);
    }
    if (session?.user?.email) {
      checkUnreadNotifications(session.user.email).then(setHasUnreadNotif);
    }
  }, [session?.user?.id, session?.user?.email]);

  useEffect(() => {
    if (!socket) return;
    const onReceiveMessage = (msg) => {
      if (msg.sender?._id !== session?.user?.id) setHasUnread(true);
    };
    const onNewNotification = () => setHasUnreadNotif(true);
    socket.on('receive_message', onReceiveMessage);
    socket.on('new_notification', onNewNotification);
    return () => {
      socket.off('receive_message', onReceiveMessage);
      socket.off('new_notification', onNewNotification);
    };
  }, [socket, session?.user?.id]);

  useEffect(() => {
    if (pathname.startsWith('/Chat')) setHasUnread(false);
    if (pathname.startsWith('/Notification')) setHasUnreadNotif(false);
  }, [pathname]);

  const navItems = [
    { Icon: Home, label: "Home", path: "/" },
    { Icon: Search, label: "Search", path: "/search" },
    { Icon: PlusSquare, label: "Create", path: "/create" },
    { Icon: Heart, label: "Notification", path: "/Notification" },
    { Icon: MessageCircle, label: "Messages", path: "/Chat" },
    { Icon: User, label: "Profile", path: "/User" },
  ];

  const { theme, toggleTheme } = useTheme();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t border-gray-200 dark:border-neutral-800 px-4 py-2 flex justify-around items-center z-50 backdrop-blur-lg bg-opacity-80 dark:bg-opacity-80">
      {navItems.map(({ Icon, label, path }) => {
        const isActive = pathname === path;
        return (
          <Link
            key={label}
            href={path}
            className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-all duration-300 ${
              isActive
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              {label === "Messages" && hasUnread && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white dark:border-black shadow-[0_0_8px_rgba(34,197,94,0.7)] animate-pulse"></span>
              )}
              {label === "Notification" && hasUnreadNotif && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white dark:border-black shadow-[0_0_8px_rgba(34,197,94,0.7)] animate-pulse"></span>
              )}
            </div>
            <span className="text-[9px] font-medium">{label}</span>
          </Link>
        );
      })}
      
      {/* Theme Toggle for Mobile */}
      <button
        onClick={toggleTheme}
        className="flex flex-col items-center gap-1 p-1 text-gray-500 dark:text-gray-400 rounded-xl transition-all duration-300"
      >
        {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        <span className="text-[9px] font-medium">{theme === 'light' ? 'Dark' : 'Light'}</span>
      </button>
    </div>
  );
};

export default BottomNavbar;
