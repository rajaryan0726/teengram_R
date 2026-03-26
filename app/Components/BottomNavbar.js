'use client';

import React from 'react';
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

const BottomNavbar = () => {
  const pathname = usePathname();

  const navItems = [
    { Icon: Home, label: "Home", path: "/" },
    { Icon: Search, label: "Search", path: "/search" },
    { Icon: PlusSquare, label: "Create", path: "/create" },
    { Icon: Heart, label: "Activity", path: "/Notification" },
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
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
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
