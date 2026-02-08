'use client';

import React from "react";
import { usePathname } from 'next/navigation'; // Import hook for active state

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
} from "lucide-react";
import Link from "next/link";

const Sidebar = () => {
  const pathname = usePathname(); // Get current path

  const navItems = [
    { Icon: Home, label: "Home", path: "/" },
    { Icon: Search, label: "Search", path: "/search" },
    { Icon: Compass, label: "Explore", path: "/schoolCompetitions" },
    { Icon: Film, label: "Shorts", path: "/friends" }, // Renamed for social feel
    { Icon: MessageCircle, label: "Messages", path: "/Chat" },
    { Icon: Heart, label: "Activity", path: "/Notification" },
    { Icon: PlusSquare, label: "Create", path: "/create" },
    { Icon: Trophy, label: "Arena", path: "/teenarena" },
    { Icon: User, label: "Profile", path: "/User" },
  ];

  return (
    <div
      className="hidden md:flex h-screen w-20 lg:w-64 flex-col justify-between py-6 px-3 lg:px-4
                 bg-white/80 backdrop-blur-xl border-r border-gray-200 shadow-sm z-50 transition-all duration-300"
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
                  ? 'bg-gradient-to-r from-violet-100 to-fuchsia-50 text-violet-700 shadow-sm transform scale-105'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
                `}
            >
              <div className={`p-1 rounded-lg transition-colors ${isActive ? '' : 'group-hover:bg-white'}`}>
                {label === "Profile" ? (
                  <img
                    src="/landing.png"
                    alt="Profile"
                    className={`w-7 h-7 rounded-full border-2 ${isActive ? 'border-violet-500' : 'border-transparent'}`}
                  />
                ) : (
                  <Icon className={`w-7 h-7 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                )}
              </div>

              <span className="hidden lg:block text-base">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom More Menu */}
      <div className="mt-auto">
        <Link
          href={"/more"}
          className="flex items-center gap-4 px-3 py-3 rounded-2xl font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
        >
          <Menu className="w-7 h-7" />
          <span className="hidden lg:block text-base">More</span>
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
