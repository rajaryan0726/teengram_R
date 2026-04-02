"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/app/Components/Sidebar';
import { fetchEventsByCategoryAction } from '@/actions/eventActions';
import { Calendar, Clock, MapPin, Building, Link as LinkIcon, User, ChevronLeft } from 'lucide-react';
import EventDetailsModal from '@/app/Components/EventDetailsModal';
import CreateEventModal from '@/app/Components/CreateEventModal';
import { useSession } from 'next-auth/react';

const categoryTitles = {
    hackathon: 'Hackathons',
    sports: 'Sports Competitions',
    art: 'Art Competitions',
    festival: 'Festivals & College Fests',
    seminar: 'Seminars & Workshops',
    other: 'Other Events'
};

export default function CategoryPage() {
    const params = useParams();
    const router = useRouter();
    const categoryQuery = params.category; // e.g., "hackathon"
    
    const { data: session } = useSession();
    
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);

    useEffect(() => {
        const loadEvents = async () => {
            setIsLoading(true);
            const fetchedEvents = await fetchEventsByCategoryAction(categoryQuery);
            setEvents(fetchedEvents);
            setIsLoading(false);
        };
        loadEvents();
    }, [categoryQuery]);

    const displayTitle = categoryTitles[categoryQuery.toLowerCase()] || 'Events';

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-black transition-colors duration-300">
            <Sidebar className="flex-1" />
            
            <main className="flex-1 overflow-y-auto w-full pb-20 md:pb-0">
                <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
                    {/* Header */}
                    <div className="mb-10">
                        <button 
                            onClick={() => router.push('/teenarena')}
                            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium mb-6 hover:-translate-x-1 transition-transform"
                        >
                            <ChevronLeft size={20} /> Back to Arena
                        </button>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white capitalize">
                            {displayTitle}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
                            {isLoading ? 'Loading upcoming events...' : `Found ${events.length} upcoming event${events.length === 1 ? '' : 's'}`}
                        </p>
                    </div>

                    {/* Events Grid */}
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map(n => (
                                <div key={n} className="bg-white dark:bg-neutral-900 rounded-3xl p-6 h-80 animate-pulse border border-gray-100 dark:border-neutral-800">
                                    <div className="w-full h-32 bg-gray-200 dark:bg-neutral-800 rounded-xl mb-4"></div>
                                    <div className="h-6 bg-gray-200 dark:bg-neutral-800 rounded w-3/4 mb-3"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-neutral-800 rounded w-1/2 mb-6"></div>
                                </div>
                            ))}
                        </div>
                    ) : events.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-gray-100 dark:border-neutral-800 border-dashed">
                            <div className="w-24 h-24 bg-gray-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6">
                                <span className="text-4xl">📭</span>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No events found</h3>
                            <p className="text-gray-500 max-w-md">There are currently no upcoming events in this category. Be the first to organize one!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {events.map((evt) => (
                                <div 
                                    key={evt._id} 
                                    onClick={() => setSelectedEvent(evt)}
                                    className="group cursor-pointer bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-neutral-800 shadow-sm hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-500/30 transition-all duration-300 flex flex-col h-full"
                                >
                                    {/* Poster / Fallback Header */}
                                    <div className="h-48 relative overflow-hidden bg-gradient-to-br from-blue-100 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/10 flex-shrink-0">
                                        {evt.posterUrl ? (
                                            <img src={evt.posterUrl} alt={evt.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-5xl opacity-50">🎪</span>
                                            </div>
                                        )}
                                        {/* Organiser Badge */}
                                        <div className="absolute top-4 left-4 bg-white/90 dark:bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white shadow-sm max-w-[80%]">
                                            <User size={12} className="text-blue-500"/> 
                                            <span className="truncate">{evt.creatorId?.username || 'Anonymous'}</span>
                                        </div>
                                    </div>

                                    {/* Card Content */}
                                    <div className="p-6 flex flex-col flex-1">
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {evt.title}
                                        </h3>
                                        <div className="flex items-center gap-2 mb-4 text-sm text-gray-600 dark:text-gray-400 font-medium truncate">
                                            <Building size={14}/> {evt.organiser}
                                        </div>

                                        <div className="space-y-2 mt-auto mb-6">
                                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                                    <Calendar size={14} />
                                                </div>
                                                <span className="font-medium">{new Date(evt.eventDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                                <div className="w-8 h-8 rounded-full bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                                                    <MapPin size={14} />
                                                </div>
                                                <span className="font-medium truncate">
                                                    {evt.locationType === 'Online' ? 'Online Event' : evt.locationDetails}
                                                </span>
                                            </div>
                                        </div>

                                        <button className="w-full py-3 rounded-xl bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-white font-semibold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Event Details Modal */}
            <EventDetailsModal 
                event={selectedEvent} 
                onClose={() => setSelectedEvent(null)}
                currentUserId={session?.user?.id}
                onEventDeleted={(deletedId) => {
                    setEvents(prev => prev.filter(e => e._id !== deletedId));
                }}
                onEdit={(evtToEdit) => {
                    setEditingEvent(evtToEdit);
                    setSelectedEvent(null);
                }}
            />

            {/* Edit Event Modal */}
            <CreateEventModal 
                isOpen={!!editingEvent}
                initialData={editingEvent}
                onClose={(updatedEvent) => {
                    setEditingEvent(null);
                    if (updatedEvent) {
                        setEvents(prev => prev.map(e => e._id === updatedEvent._id ? updatedEvent : e));
                    }
                }}
            />
        </div>
    );
}
