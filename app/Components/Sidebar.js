'use client';

import React, { useState, useEffect } from "react";
import { usePathname } from 'next/navigation'; // Import hook for active state
import { useSession, signOut } from "next-auth/react";
import { useSocket } from "../providers/SocketProvider";
import { checkUnreadMessages, checkUnreadNotifications } from "@/actions/useractions";

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
  Sun,
  LogOut,
  ShieldCheck,
  ShieldHalf,
  Users
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "./ThemeProvider";

const Sidebar = () => {
  const pathname = usePathname(); // Get current path
  const { theme, toggleTheme } = useTheme();

  const { data: session } = useSession();
  const { socket } = useSocket();
  const [hasUnread, setHasUnread] = useState(false);
  const [hasUnreadNotif, setHasUnreadNotif] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

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

  // Fetch initial unread notifications and listen for real-time notification events
  useEffect(() => {
    if (session?.user?.email) {
      checkUnreadNotifications(session.user.email).then(setHasUnreadNotif);

      const onNewNotification = () => {
        setHasUnreadNotif(true);
      };

      if (socket) {
        socket.on('new_notification', onNewNotification);
      }

      return () => {
        if (socket) {
          socket.off('new_notification', onNewNotification);
        }
      };
    }
  }, [session?.user?.email, socket]);

  // Clear unread dots automatically when navigating into Chat or Notification pages
  useEffect(() => {
    if (pathname.startsWith('/Chat')) {
      setHasUnread(false);
    }
    if (pathname.startsWith('/Notification')) {
      setHasUnreadNotif(false);
    }
  }, [pathname]);

  const navItems = [
    { Icon: Home, label: "Home", path: "/" },
    { Icon: Search, label: "Search", path: "/search" },
    { Icon: Compass, label: "Explore", path: "/schoolCompetitions" },
    { Icon: Film, label: "Shorts", path: "/Shorts" },
    { Icon: MessageCircle, label: "Messages", path: "/Chat" },
    { Icon: Heart, label: "Notification", path: "/Notification" },
    { Icon: PlusSquare, label: "Create", path: "/create" },
    { Icon: Trophy, label: "Arena", path: "/teenarena" },
    { Icon: Users, label: "Community", path: "/community" },
  ];

  if (session?.user?.role === 'HEAD_ADMIN' || session?.user?.role === 'SUPER_ADMIN') {
    navItems.push({ Icon: ShieldCheck, label: "Admin Panel", path: "/head-admin" });
  } else if (session?.user?.role === 'ADMIN') {
    navItems.push({ Icon: ShieldCheck, label: "Admin Panel", path: "/admin-panel" });
  } else if (session?.user?.role === 'SUB_ADMIN') {
    navItems.push({ Icon: ShieldHalf, label: "Sub-Admin Panel", path: "/sub-admin-panel" });
  }

  navItems.push({ Icon: User, label: "Profile", path: "/User" });

  return (
    <div className="hidden md:block p-4 h-screen z-50 pointer-events-none">
      <div
        className={`pointer-events-auto h-full ${isCollapsed ? 'w-20' : 'w-20 lg:w-64'} flex flex-col justify-between py-6 px-3 lg:px-4
                   glass-panel rounded-3xl overflow-y-auto custom-scrollbar transition-all duration-500 shadow-[0_10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.6)]`}
      >
        {/* Top Logo */}
        <div 
          className={`mb-8 flex items-center justify-center ${isCollapsed ? '' : 'lg:justify-start lg:pl-4'} cursor-pointer hover-3d`}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <h1 className={`${isCollapsed ? 'hidden' : 'hidden lg:block'} text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-500 drop-shadow-md`} style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '-1px' }}>
            TeenGram
          </h1>
          <div className={`${isCollapsed ? 'flex' : 'lg:hidden'} w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 items-center justify-center text-white font-black text-2xl shadow-[0_0_20px_rgba(6,182,212,0.5)]`}>
            TG
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-3 flex-1">
          {navItems.map(({ Icon, label, path }) => {
            const isActive = pathname === path;
            return (
              <Link
                key={label}
                href={path}
                className={`flex items-center gap-4 px-3 py-3 rounded-2xl font-bold transition-all duration-300 group hover-3d
                      ${isActive
                    ? 'bg-white/40 dark:bg-white/10 text-cyan-600 dark:text-cyan-400 shadow-[inset_0_2px_10px_rgba(255,255,255,0.4)] dark:shadow-[inset_0_2px_10px_rgba(255,255,255,0.1)] border border-white/50 dark:border-white/5'
                    : 'text-slate-600 hover:bg-white/30 dark:text-slate-300 dark:hover:bg-white/5'
                  }
                  `}
              >
                <div className="relative p-1">
                  {label === "Profile" ? (
                    <img
                      src="/landing.png"
                      alt="Profile"
                      className={`w-7 h-7 rounded-full object-cover shadow-sm ${isActive ? 'ring-2 ring-cyan-500' : ''}`}
                    />
                  ) : (
                    <Icon className={`w-7 h-7 ${isActive ? 'stroke-[2.5px] drop-shadow-md' : 'stroke-2'}`} />
                  )}
                  {/* Unread Dots */}
                  {label === "Messages" && hasUnread && (
                      <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-red-500 border-2 border-white dark:border-black shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse"></span>
                  )}
                  {label === "Notification" && hasUnreadNotif && (
                      <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-red-500 border-2 border-white dark:border-black shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse"></span>
                  )}
                </div>

                <span className={`${isCollapsed ? 'hidden' : 'hidden lg:block'} text-base tracking-wide`}>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom More Menu */}
        <div className="mt-auto space-y-3 relative pt-4">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl font-bold text-slate-600 hover:bg-white/30 dark:text-slate-300 dark:hover:bg-white/5 hover-3d transition-all duration-300"
          >
            {theme === 'dark' ? <Sun className="w-7 h-7 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" /> : <Moon className="w-7 h-7 text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
            <span className={`${isCollapsed ? 'hidden' : 'hidden lg:block'} text-base tracking-wide`}>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl font-bold text-slate-600 hover:bg-white/30 dark:text-slate-300 dark:hover:bg-white/5 hover-3d transition-all duration-300"
          >
            <Menu className="w-7 h-7" />
            <span className={`${isCollapsed ? 'hidden' : 'hidden lg:block'} text-base tracking-wide`}>More</span>
          </button>

          {showMoreMenu && (
            <div className={`absolute bottom-20 ${isCollapsed ? 'left-4 w-[160px]' : 'left-0 w-[200px]'} glass-panel rounded-2xl flex flex-col p-2 z-50 mb-2 animate-fade-in-up`}>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 font-bold transition-colors w-full"
              >
                <LogOut className="w-5 h-5" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
