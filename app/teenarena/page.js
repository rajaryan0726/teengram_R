"use client";

import React, { useState } from 'react';
import Sidebar from '../Components/Sidebar';
import Link from 'next/link';
import { Trophy, Code, Palette, Music, BookOpen, Sparkles, Plus } from 'lucide-react';
import CreateEventModal from '../Components/CreateEventModal';

const categories = [
    { id: 'hackathon', name: 'Hackathon', icon: Code, color: 'from-blue-500 to-cyan-400', desc: 'Coding marathons & tech innovations' },
    { id: 'sports', name: 'Sports', icon: Trophy, color: 'from-sky-500 to-red-500', desc: 'Tournaments & athletic meets' },
    { id: 'art', name: 'Art', icon: Palette, color: 'from-blue-500 to-cyan-400', desc: 'Exhibitions & creative showcases' },
    { id: 'festival', name: 'Festival', icon: Music, color: 'from-blue-500 to-cyan-500', desc: 'College fests & cultural nights' },
    { id: 'seminar', name: 'Seminar', icon: BookOpen, color: 'from-emerald-500 to-teal-400', desc: 'Workshops & guest lectures' },
    { id: 'other', name: 'Other', icon: Sparkles, color: 'from-sky-400 to-yellow-500', desc: 'Miscellaneous competitions' },
];

export default function TeenArena() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-transparent transition-colors duration-300">
            <Sidebar className="flex-1" />
            
            <main className="flex-1 overflow-y-auto w-full pb-20 md:pb-0 relative z-10">
                <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 mt-12">
                    {/* Header */}
                    <div className="glass-panel rounded-[2rem] p-8 mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400 mb-4 tracking-tight drop-shadow-sm">
                                TeenArena
                            </h1>
                            <p className="text-slate-600 dark:text-slate-300 font-bold text-lg max-w-2xl">
                                Discover, participate, or organize the best college fests, hackathons, and tournaments. Your stage awaits.
                            </p>
                        </div>
                        
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="group flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-8 py-4 rounded-2xl font-black shadow-[0_10px_30px_rgba(6,182,212,0.4)] hover-3d transition-all"
                        >
                            <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300 drop-shadow-md" />
                            Organize Event
                        </button>
                    </div>

                    {/* Categories Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {categories.map((cat) => {
                            const Icon = cat.icon;
                            return (
                                <Link 
                                    key={cat.id} 
                                    href={`/teenarena/${cat.id}`}
                                    className="group relative overflow-hidden glass-card rounded-[1.5rem] p-8 hover-3d transition-all duration-300"
                                >
                                    {/* Background glow effect on hover */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none`}></div>
                                    
                                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center mb-6 shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                                        <Icon className="w-8 h-8 text-white drop-shadow-md" />
                                    </div>
                                    
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-cyan-500 transition-colors drop-shadow-sm">
                                        {cat.name}
                                    </h3>
                                    
                                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                                        {cat.desc}
                                    </p>
                                    
                                    <div className="absolute right-8 bottom-8 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                        <div className="w-10 h-10 rounded-full bg-white/40 dark:bg-black/40 shadow-inner flex items-center justify-center border border-white/50">
                                            <span className="text-xl font-black text-cyan-600 dark:text-cyan-400">→</span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* Create Event Modal */}
            <CreateEventModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
            />
        </div>
    );
}
