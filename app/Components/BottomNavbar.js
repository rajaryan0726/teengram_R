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
    <div className="md:hidden fixed bottom-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[400px] glass-panel rounded-full px-4 py-3 flex justify-around items-center z-50 shadow-[0_10px_40px_rgba(0,0,0,0.2)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.8)] border-t border-white/40 dark:border-white/10">
      {navItems.map(({ Icon, label, path }) => {
        const isActive = pathname === path;
        return (
          <Link
            key={label}
            href={path}
            className={`flex flex-col items-center gap-1 p-2 rounded-2xl hover-3d ${
              isActive
                ? 'text-cyan-600 dark:text-cyan-400 bg-white/20 dark:bg-white/10 shadow-[inset_0_2px_10px_rgba(255,255,255,0.3)]'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/10 dark:hover:bg-white/5'
            }`}
          >
            <div className="relative">
              <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px] drop-shadow-md' : 'stroke-2'}`} />
              {label === "Messages" && hasUnread && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-white dark:border-black shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse"></span>
              )}
              {label === "Notification" && hasUnreadNotif && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-white dark:border-black shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse"></span>
              )}
            </div>
          </Link>
        );
      })}
      
      {/* Theme Toggle for Mobile */}
      <button
        onClick={toggleTheme}
        className="flex flex-col items-center gap-1 p-2 text-slate-600 dark:text-slate-300 rounded-2xl hover-3d hover:bg-white/10 dark:hover:bg-white/5"
      >
        <div className="relative">
          {theme === 'light' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
        </div>
      </button>
    </div>
  );
};

export default BottomNavbar;
