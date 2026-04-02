"use client";

import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, Building, Link as LinkIcon, ExternalLink, Download } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { fetchuser } from '@/actions/useractions';
import html2canvas from 'html2canvas';

import { deleteEventAction } from '@/actions/eventActions';

export default function EventDetailsModal({ event, onClose, currentUserId, onEventDeleted, onEdit }) {
    const { data: session } = useSession();
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [userDetails, setUserDetails] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const cardRef = React.useRef(null);

    React.useEffect(() => {
        if (event && session?.user?.email) {
            const getUserProfile = async () => {
                const u = await fetchuser(session.user.email);
                setUserDetails(u);
            };
            getUserProfile();
        }
    }, [event, session]);

    if (!event) return null;

    const isCreator = currentUserId && event.creatorId?._id === currentUserId;

    const handleDelete = async () => {
        setIsDeleting(true);
        const res = await deleteEventAction(event._id, currentUserId);
        setIsDeleting(false);
        if (res.success) {
            if (onEventDeleted) onEventDeleted(event._id);
            onClose();
        } else {
            alert(res.error || "Failed to delete event");
            setShowDeleteConfirm(false);
        }
    };

    const handleDownloadPass = async () => {
        if (!cardRef.current) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2 });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `${event.title.replace(/\s+/g, '_')}_Pass.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error("Error generating pass:", error);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sm:p-6">
            <div className="bg-white dark:bg-neutral-900 w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100 dark:border-neutral-800">
                
                {/* Header (with sticky positioning) */}
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    {isCreator && (
                        <>
                            {showDeleteConfirm ? (
                                <div className="flex bg-white dark:bg-black rounded-full shadow-lg overflow-hidden border border-red-200 dark:border-red-900/50">
                                    <button 
                                        onClick={handleDelete} disabled={isDeleting}
                                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors"
                                    >
                                        {isDeleting ? 'Deleting...' : 'Confirm'}
                                    </button>
                                    <button 
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300 font-bold text-sm transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <button 
                                        onClick={() => onEdit(event)}
                                        className="px-4 py-2 bg-white/80 hover:bg-white dark:bg-black/60 dark:hover:bg-black backdrop-blur-md rounded-full transition-colors text-blue-600 dark:text-blue-400 font-bold text-sm shadow-lg border border-white/20 dark:border-white/10"
                                    >
                                        Edit
                                    </button>
                                    <button 
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="px-4 py-2 bg-white/80 hover:bg-white dark:bg-black/60 dark:hover:bg-black backdrop-blur-md rounded-full transition-colors text-red-600 dark:text-red-400 font-bold text-sm shadow-lg border border-white/20 dark:border-white/10"
                                    >
                                        Delete
                                    </button>
                                </>
                            )}
                        </>
                    )}
                    <button 
                        onClick={onClose}
                        className="p-2 bg-white/80 hover:bg-white dark:bg-black/60 dark:hover:bg-black backdrop-blur-md rounded-full transition-colors text-gray-900 dark:text-white shadow-lg border border-white/20 dark:border-white/10"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Body (Scrollable) */}
                <div className="overflow-y-auto custom-scrollbar flex-1 relative">
                    
                    {/* Poster Header */}
                    <div className="w-full h-64 md:h-80 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-900/20 relative flex-shrink-0">
                        {event.posterUrl ? (
                            <img src={event.posterUrl} alt={event.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-8xl opacity-50">🎪</span>
                            </div>
                        )}
                        {/* Gradient Overlay for text readability later if needed */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    </div>

                    {/* Content Section */}
                    <div className="p-6 md:p-8 relative -mt-16">
                        {/* Floating Date Badge */}
                        <div className="inline-flex flex-col items-center justify-center bg-white dark:bg-neutral-800 px-6 py-3 rounded-2xl shadow-xl border border-gray-100 dark:border-neutral-700 mb-6 relative z-10">
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                {new Date(event.eventDate).toLocaleDateString(undefined, { month: 'short' })}
                            </span>
                            <span className="text-3xl font-black text-gray-900 dark:text-white leading-none">
                                {new Date(event.eventDate).getDate()}
                            </span>
                        </div>

                        <div className="mb-8">
                            <span className="inline-block px-3 py-1 mb-4 rounded-lg bg-gray-100 dark:bg-neutral-800 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">
                                {event.eventType}
                            </span>
                            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
                                {event.title}
                            </h2>
                            <div className="flex items-center gap-3">
                                <img src={event.creatorId?.profilepic || "/default-avatar.png"} className="w-10 h-10 rounded-full border-2 border-white dark:border-neutral-700 shadow-sm" />
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Posted by</p>
                                    <Link href={{ pathname: "/ViewFriends", query: { friend_email: event.creatorId?.email } }} className="font-bold text-gray-900 dark:text-white hover:underline">
                                        @{event.creatorId?.username}
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50 dark:bg-neutral-800/50 rounded-2xl border border-gray-100 dark:border-neutral-800 mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                    <Building size={24} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-0.5">Organiser</p>
                                    <p className="font-bold text-gray-900 dark:text-white">{event.organiser}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-0.5">Timing</p>
                                    <p className="font-bold text-gray-900 dark:text-white">{event.timing}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 md:col-span-2">
                                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                    {event.locationType === 'Online' ? <LinkIcon size={24} /> : <MapPin size={24} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-0.5">
                                        {event.locationType === 'Online' ? 'Event Link' : 'Venue Address'}
                                    </p>
                                    {event.locationType === 'Online' ? (
                                        <a href={event.locationDetails} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2 truncate">
                                            {event.locationDetails} <ExternalLink size={14} />
                                        </a>
                                    ) : (
                                        <p className="font-bold text-gray-900 dark:text-white break-words">{event.locationDetails}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <div className="flex items-center justify-between border-b border-gray-200 dark:border-neutral-800 pb-3 mb-4">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">About the Event</h3>
                                
                                {event.locationType === 'Offline' && userDetails && (
                                    <button 
                                        onClick={handleDownloadPass}
                                        disabled={isDownloading}
                                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-wait"
                                    >
                                        <Download size={16} />
                                        {isDownloading ? 'Generating...' : 'Download Pass'}
                                    </button>
                                )}
                            </div>
                            <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                {event.details}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Hidden Pass Template for Download (Using inline styles to avoid html2canvas oklch parsing errors with Tailwind v4) */}
            {event.locationType === 'Offline' && userDetails && (
                <div className="fixed top-[-9999px] left-[-9999px]">
                    <div ref={cardRef} className="w-[600px] h-[350px] rounded-3xl p-1 relative overflow-hidden shadow-2xl flex font-sans" style={{ background: 'linear-gradient(to bottom right, #4c1d95, #701a75)', color: '#ffffff' }}>
                        {/* Inner stroke border */}
                        <div className="absolute inset-2 border rounded-2xl z-0 pointer-events-none" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}></div>

                        {/* Background Decor */}
                        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 rounded-full blur-3xl mix-blend-screen z-0" style={{ backgroundColor: 'rgba(217, 70, 239, 0.3)' }}></div>
                        <div className="absolute bottom-[-50px] left-[-50px] w-64 h-64 rounded-full blur-3xl mix-blend-screen z-0" style={{ backgroundColor: 'rgba(124, 58, 237, 0.4)' }}></div>

                        {/* Left Side: Event Details */}
                        <div className="flex-1 flex flex-col p-8 z-10 border-r relative" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                            <span className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#f0abfc' }}>TeenArena Entry Pass</span>
                            <h2 className="text-3xl font-extrabold leading-tight mb-4 flex-1">{event.title}</h2>
                            
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                                        <Building size={14} style={{ color: '#c4b5fd' }}/>
                                    </div>
                                    <p className="font-semibold truncate" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{event.organiser}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                                        <Calendar size={14} style={{ color: '#c4b5fd' }}/>
                                    </div>
                                    <p className="font-semibold" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                                        {new Date(event.eventDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                                        <Clock size={14} style={{ color: '#c4b5fd' }}/>
                                    </div>
                                    <p className="font-semibold" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{event.timing}</p>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Participant Details */}
                        <div className="w-64 flex flex-col p-8 z-10 relative" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                            {/* Hole punches for aesthetics */}
                            <div className="absolute top-0 bottom-0 left-[-8px] flex flex-col justify-between py-6">
                                <div className="w-4 h-4 rounded-full opacity-50" style={{ backgroundColor: '#111111' }}></div>
                                <div className="w-4 h-4 rounded-full opacity-50" style={{ backgroundColor: '#111111' }}></div>
                                <div className="w-4 h-4 rounded-full opacity-50" style={{ backgroundColor: '#111111' }}></div>
                            </div>

                            <span className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Participant</span>
                            <h3 className="text-xl font-bold mb-6 border-b pb-2 truncate" style={{ color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                                {userDetails.name || userDetails.username}
                            </h3>

                            <div className="space-y-4 text-sm mt-auto">
                                <div>
                                    <p className="uppercase text-[10px] font-black tracking-wider mb-0.5" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>University / College</p>
                                    <p className="font-semibold truncate" style={{ color: '#ffffff' }}>{userDetails.university || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="uppercase text-[10px] font-black tracking-wider mb-0.5" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Institute ID</p>
                                    <p className="font-semibold truncate" style={{ color: '#ffffff' }}>{userDetails.institute_name || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="uppercase text-[10px] font-black tracking-wider mb-0.5" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Age Validation</p>
                                    <p className="font-semibold" style={{ color: '#ffffff' }}>{userDetails.age ? `${userDetails.age} Years` : 'Age Unspecified'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
