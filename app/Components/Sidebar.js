'use client';

import React, { useState, useEffect } from "react";
import { usePathname } from 'next/navigation'; // Import hook for active state
import { useSession } from "next-auth/react";
import { useSocket } from "../providers/SocketProvider";
import { checkUnreadMessages } from "@/actions/useractions";

import {
  Home,
  Search,
  Compass,
  Film,
  MessageCircle,
  Heart,
  PlusSquare,
  User,
  Menu,
  Trophy,
  Moon,
  Sun
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "./ThemeProvider";

const Sidebar = () => {
  const pathname = usePathname(); // Get current path
  const { theme, toggleTheme } = useTheme();

  const { data: session } = useSession();
  const { socket } = useSocket();
  const [hasUnread, setHasUnread] = useState(false);

  // Fetch initial unread count and listen for new live messages
  useEffect(() => {
    if (session?.user?.id) {
      checkUnreadMessages(session.user.id).then(setHasUnread);

      const onReceiveMessage = (msg) => {
        // If the new message is NOT sent by us, illuminate the green dot
        if (msg.sender?._id !== session.user.id) {
            setHasUnread(true);
        }
      };

      if (socket) {
        socket.on('receive_message', onReceiveMessage);
      }

      return () => {
        if (socket) {
          socket.off('receive_message', onReceiveMessage);
        }
      };
    }
  }, [session?.user?.id, socket]);

  // Clear unread dot automatically when navigating into the Chat page
  useEffect(() => {
    if (pathname.startsWith('/Chat')) {
      setHasUnread(false);
    }
  }, [pathname]);

  const navItems = [
    { Icon: Home, label: "Home", path: "/" },
    { Icon: Search, label: "Search", path: "/search" },
    { Icon: Compass, label: "Explore", path: "/schoolCompetitions" },
    { Icon: Film, label: "Shorts", path: "/Shorts" },
    { Icon: MessageCircle, label: "Messages", path: "/Chat" },
    { Icon: Heart, label: "Activity", path: "/Notification" },
    { Icon: PlusSquare, label: "Create", path: "/create" },
    { Icon: Trophy, label: "Arena", path: "/teenarena" },
    { Icon: User, label: "Profile", path: "/User" },
  ];

  return (
    <div
      className="hidden md:flex h-screen w-20 lg:w-64 flex-col justify-between py-6 px-3 lg:px-4
                 bg-white dark:bg-black border-r border-gray-200 dark:border-neutral-800 shadow-sm z-50 overflow-y-auto scrollbar-hide transition-colors duration-300"
    >
      {/* Top Logo */}
      <div className="mb-8 flex items-center justify-center lg:justify-start lg:pl-4">
        <h1 className="hidden lg:block text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-500" style={{ fontFamily: 'Brush Script MT, cursive' }}>
          TeenGram
        </h1>
        <div className="lg:hidden w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-orange-500 flex items-center justify-center text-white font-bold text-xl">
          T
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-2 flex-1">
        {navItems.map(({ Icon, label, path }) => {
          const isActive = pathname === path;
          return (
            <Link
              key={label}
              href={path}
              className={`flex items-center gap-4 px-3 py-3 rounded-2xl font-medium transition-all duration-300 group
                    ${isActive
                  ? 'bg-gradient-to-r from-violet-100 to-fuchsia-50 text-violet-700 dark:from-violet-900/40 dark:to-fuchsia-900/40 dark:text-violet-300 shadow-sm transform scale-105'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-neutral-900 dark:hover:text-white'
                }
                `}
            >
              <div className={`relative p-1 rounded-lg transition-colors ${isActive ? '' : 'group-hover:bg-white dark:group-hover:bg-transparent'}`}>
                {label === "Profile" ? (
                  <img
                    src="/landing.png"
                    alt="Profile"
                    className={`w-7 h-7 rounded-full border-2 ${isActive ? 'border-violet-500' : 'border-transparent'}`}
                  />
                ) : (
                  <Icon className={`w-7 h-7 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                )}
                {/* Notification Unread Dot */}
                {label === "Messages" && hasUnread && (
                    <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white dark:border-black shadow-[0_0_10px_rgba(34,197,94,0.7)] animate-pulse"></span>
                )}
              </div>

              <span className="hidden lg:block text-base">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom More Menu */}
      <div className="mt-auto space-y-2">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-neutral-900 dark:hover:text-white transition-all duration-200"
        >
          {theme === 'dark' ? <Sun className="w-7 h-7 text-amber-500" /> : <Moon className="w-7 h-7 text-indigo-500" />}
          <span className="hidden lg:block text-base">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <Link
          href={"/more"}
          className="flex items-center gap-4 px-3 py-3 rounded-2xl font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-neutral-900 dark:hover:text-white transition-all duration-200"
        >
          <Menu className="w-7 h-7" />
          <span className="hidden lg:block text-base">More</span>
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
