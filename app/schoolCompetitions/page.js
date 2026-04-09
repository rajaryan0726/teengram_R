"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from "../Components/Sidebar";
import { fetchuser, fetchExploreFeed } from '@/actions/useractions';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Play, Trophy, Image as ImageIcon, AlignLeft, Compass } from 'lucide-react';
import Link from 'next/link';
import PostModal from '../Components/PostModal';
import EventDetailsModal from '../Components/EventDetailsModal';

export default function ExplorePage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [feedData, setFeedData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [currentUserDb, setCurrentUserDb] = useState(null);

    useEffect(() => {
        if (!session) {
            router.push('/login');
        } else {
            getExploreData();
        }
    }, [session]);

    const getExploreData = async () => {
        try {
            setLoading(true);
            let u = await fetchuser(session.user.email);
            setCurrentUserDb(u);
            let exploreData = await fetchExploreFeed(session.user.email, u._id);
            setFeedData(exploreData);
        } catch (error) {
            console.error("Failed to fetch explore feed", error);
        } finally {
            setLoading(false);
        }
    };

    const handleItemClick = (item) => {
        if (item.feedType === 'event') {
            setSelectedEvent(item);
        } else {
            setSelectedPost(item);
        }
    };

    const handlePostUpdate = (updatedPost) => {
        setFeedData(prevFeed => prevFeed.map(post => 
            post._id === updatedPost._id ? updatedPost : post
        ));
    };

    const renderCardContent = (item) => {
        if (item.feedType === 'event') {
            return (
                <div className="relative group cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-md transform transition duration-300 hover:scale-[1.02]">
                    <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md p-1.5 rounded-full z-10 text-white">
                        <Trophy size={16} />
                    </div>
                    {item.posterUrl ? (
                        <img src={item.posterUrl} alt={item.title} className="w-full object-cover rounded-2xl" />
                    ) : (
                        <div className="p-6 text-white min-h-[150px] flex flex-col justify-between">
                            <h3 className="font-bold text-lg leading-tight">{item.title}</h3>
                            <div className="mt-4">
                                <p className="text-xs font-medium text-cyan-100 uppercase tracking-widest">{item.eventType}</p>
                                <p className="text-sm font-semibold mt-1">{new Date(item.eventDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="flex items-center gap-2">
                            <img src={item.profilepic} className="w-6 h-6 rounded-full border border-white/50" alt="creator" />
                            <span className="text-xs text-white font-medium">{item.user_name}</span>
                        </div>
                    </div>
                </div>
            );
        }

        if (item.feedType === 'short') {
            return (
                <div className="relative group cursor-pointer overflow-hidden rounded-2xl bg-black shadow-md transform transition duration-300 hover:scale-[1.02]">
                    <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md p-1.5 rounded-full z-10 text-white">
                        <Play size={16} className="fill-white" />
                    </div>
                    <video 
                        src={item.mediaUrl} 
                        className="w-full object-cover max-h-[400px]" 
                        muted 
                        loop 
                        playsInline 
                        onMouseEnter={(e) => {
                            const playPromise = e.target.play();
                            if (playPromise !== undefined) {
                                playPromise.catch(() => {});
                            }
                        }} 
                        onMouseLeave={(e) => e.target.pause()} 
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="flex items-center gap-2 mb-1">
                            <img src={item.profilepic} className="w-6 h-6 rounded-full border border-white/50" alt="creator" />
                            <span className="text-xs text-white font-medium">{item.user_name}</span>
                        </div>
                        <p className="text-xs text-white line-clamp-2">{item.caption || item.content}</p>
                    </div>
                </div>
            );
        }

        // Default to Regular Post
        return (
            <div className="relative group cursor-pointer overflow-hidden rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm transform transition duration-300 hover:scale-[1.02]">
                <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md p-1.5 rounded-full z-10 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.mediaUrl ? <ImageIcon size={16} /> : <AlignLeft size={16} />}
                </div>

                {item.mediaUrl ? (
                    item.mediaType === 'video' ? (
                        <video src={item.mediaUrl} className="w-full object-cover max-h-[300px]" muted loop />
                    ) : (
                        <img src={item.mediaUrl} alt="post media" className="w-full object-cover max-h-[300px]" />
                    )
                ) : (
                    <div className="p-5 min-h-[120px] flex items-center bg-gray-50 dark:bg-neutral-800">
                        <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-4 font-medium italic">"{item.content}"</p>
                    </div>
                )}
                
                <div className="p-3">
                    <div className="flex items-center gap-2">
                        <img src={item.profilepic} className="w-6 h-6 rounded-full border border-gray-200 dark:border-neutral-700" alt="creator" />
                        <span className="text-xs text-gray-700 dark:text-gray-300 font-semibold truncate">{item.user_name}</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex bg-gray-50 dark:bg-black min-h-screen w-full transition-colors">
            <Sidebar className="flex-1" />

            <main className="flex-1 p-2 md:p-6 lg:p-8 overflow-y-auto custom-scrollbar pb-20 md:pb-8 w-full max-w-[100vw] overflow-x-hidden">
                <div className="max-w-7xl mx-auto">
                    
                    <header className="mb-8 pl-12 md:pl-0">
                        <h1 className="text-3xl lg:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-500 mb-2">Explore</h1>
                        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">Discover personalized posts, shorts, and arena events tailored just for you.</p>
                    </header>

                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : feedData.length === 0 ? (
                        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                            <Compass size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-lg">Nothing to explore yet!</p>
                            <p className="text-sm mt-2">Try following more people or adding content.</p>
                        </div>
                    ) : (
                        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                            {feedData.map((item, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => handleItemClick(item)}
                                    className="break-inside-avoid shadow-sm rounded-2xl border border-gray-200/50 dark:border-neutral-800/50 hover:shadow-xl hover:shadow-blue-500/10 transition-shadow cursor-pointer"
                                >
                                   <div className="w-full h-full">
                                    {renderCardContent(item)}
                                   </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Centralized Post & Short Modal */}
            <PostModal 
                isOpen={!!selectedPost} 
                onClose={() => setSelectedPost(null)} 
                post={selectedPost} 
                currentUser={currentUserDb}
                onUpdate={handlePostUpdate}
            />

            {/* Event Details Modal */}
            <EventDetailsModal 
                event={selectedEvent} 
                onClose={() => setSelectedEvent(null)}
                currentUserId={currentUserDb?._id}
                onEventDeleted={(deletedId) => {
                    setFeedData(prev => prev.filter(e => e._id !== deletedId));
                    setSelectedEvent(null);
                }}
                onEdit={(evtToEdit) => {
                    // Editing from Explore page is optional, 
                    // but we clear the modal for now if they click edit.
                    // To fully support editing here, we'd need CreateEventModal too.
                    setSelectedEvent(null);
                    router.push(`/teenarena/${evtToEdit.eventType?.toLowerCase() || 'other'}`);
                }}
            />
        </div>
    );
}
