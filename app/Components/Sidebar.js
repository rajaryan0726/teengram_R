import React from "react";

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
  const navItems = [
    { Icon: Home, label: "Home", path: "/" },
    { Icon: Search, label: "Search", path: "/search" },
    { Icon: Compass, label: "ExploreEvents", path: "/schoolCompetitions" },
    { Icon: Film, label: "Find Friends", path: "/friends" },
    { Icon: MessageCircle, label: "Messages", path: "/messages" },
    { Icon: Heart, label: "Notifications", path: "/Notification" },
    { Icon: PlusSquare, label: "Create", path: "/create" },
    { Icon: Trophy, label: "TeenArena", path: "/teenarena" },
    { Icon: User, label: "Profile", path: "/User" },
  ];

  return (
    <div
      className="sticky top-0 h-screen w-64 flex flex-col justify-between px-4 py-6
                 bg-gradient-to-b from-teal-400 to-sky-500 shadow-md
                 overflow-y-auto"
    >
      {/* Top Logo */}
      <div className="mb-8 flex items-center justify-center">
        <h1 className="text-2xl font-serif text-white drop-shadow-lg">
          TeenGram
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-2">
        {navItems.map(({ Icon, label, path }) => (
          <Link
            key={label}
            href={path}
            className="flex items-center gap-3 px-3 py-2 rounded-lg font-semibold
                       text-white hover:bg-white hover:bg-opacity-20 hover:text-teal-700
                       hover:shadow-md transition duration-200"
          >
            {label === "Profile" ? (
              <img
                src="/landing.png"
                alt="Profile"
                className="w-6 h-6 rounded-full border border-white"
              />
            ) : (
              <Icon className="w-6 h-6" />
            )}
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom More Menu */}
      <div>
        <Link
          href={"/more"}
          className="flex items-center gap-3 px-3 py-2 rounded-lg font-semibold
                     text-white hover:bg-white hover:bg-opacity-20 hover:text-teal-700
                     hover:shadow-md transition duration-200"
        >
          <Menu className="w-6 h-6" />
          <span>More</span>
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
