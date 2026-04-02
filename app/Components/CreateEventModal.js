"use client";

import React, { useState } from 'react';
import { X, Upload, Calendar, Clock, MapPin, Link as LinkIcon, Building } from 'lucide-react';
import { createEventAction, updateEventAction } from '@/actions/eventActions';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export default function CreateEventModal({ isOpen, onClose, initialData }) {
    const { data: session } = useSession();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const defaultForm = {
        title: '', eventType: 'Hackathon', details: '', organiser: '', 
        posterUrl: '', eventDate: '', timing: '', locationType: 'Offline', locationDetails: ''
    };
    const [formData, setFormData] = useState(defaultForm);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Formatting date for HTML date input (YYYY-MM-DD)
                const d = new Date(initialData.eventDate);
                const dateStr = !isNaN(d) ? d.toISOString().split('T')[0] : '';
                
                setFormData({
                    title: initialData.title || '',
                    eventType: initialData.eventType || 'Hackathon',
                    details: initialData.details || '',
                    organiser: initialData.organiser || '',
                    posterUrl: initialData.posterUrl || '',
                    eventDate: dateStr,
                    timing: initialData.timing || '',
                    locationType: initialData.locationType || 'Offline',
                    locationDetails: initialData.locationDetails || ''
                });
            } else {
                setFormData(defaultForm);
            }
            setSuccess(false);
            setError(null);
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, posterUrl: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!session?.user?.id) {
            setError("You must be logged in to create an event.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            let result;
            if (initialData) {
                result = await updateEventAction(initialData._id, formData, session.user.id);
            } else {
                result = await createEventAction({
                    ...formData,
                    creatorId: session.user.id
                });
            }

            if (result.success) {
                setSuccess(true);
                setTimeout(() => {
                    onClose(result.event); // pass back the event to update local state
                    setSuccess(false);
                    setFormData(defaultForm);
                }, 1500);
            } else {
                setError(result.error || `Failed to ${initialData ? 'update' : 'create'} event`);
            }
        } catch (err) {
            setError("Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sm:p-6">
            <div className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden border border-gray-100 dark:border-neutral-800">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between shrink-0 bg-white dark:bg-neutral-900 z-10">
                    <h2 className="text-xl font-bold font-sans text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="text-2xl">{initialData ? '✏️' : '🎪'}</span> {initialData ? 'Edit Event' : 'Organize Event'}
                    </h2>
                    <button 
                        onClick={() => onClose()}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-gray-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Form Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {success ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                                <span className="text-4xl">🎉</span>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{initialData ? 'Event Updated!' : 'Event Created!'}</h3>
                            <p className="text-gray-500">{initialData ? 'Your event changes have been saved.' : 'Your event has been successfully published to the Arena.'}</p>
                        </div>
                    ) : (
                        <form id="event-form" onSubmit={handleSubmit} className="space-y-6">
                            
                            {error && (
                                <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            {/* Title & Type row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Event Title *</label>
                                    <input 
                                        type="text" required name="title" value={formData.title} onChange={handleChange}
                                        placeholder="E.g., TechNova Hackathon"
                                        className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Category *</label>
                                    <select 
                                        name="eventType" value={formData.eventType} onChange={handleChange}
                                        className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                    >
                                        <option value="Hackathon">Hackathon</option>
                                        <option value="Sports">Sports Competition</option>
                                        <option value="Art">Art Competition</option>
                                        <option value="Festival">Festival Celebration / College Fest</option>
                                        <option value="Seminar">Seminar / Workshop</option>
                                        <option value="Other">Other Competition</option>
                                    </select>
                                </div>
                            </div>

                            {/* Organiser */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                    <Building size={16}/> Organiser *
                                </label>
                                <input 
                                    type="text" required name="organiser" value={formData.organiser} onChange={handleChange}
                                    placeholder="College name, student club, or individual name"
                                    className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                />
                            </div>

                            {/* Date & Time */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Calendar size={16}/> Date *
                                    </label>
                                    <input 
                                        type="date" required name="eventDate" value={formData.eventDate} onChange={handleChange}
                                        className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Clock size={16}/> Timing *
                                    </label>
                                    <input 
                                        type="text" required name="timing" value={formData.timing} onChange={handleChange}
                                        placeholder="e.g. 10:00 AM - 5:00 PM"
                                        className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Location Toggle */}
                            <div className="bg-gray-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-gray-100 dark:border-neutral-800 space-y-4">
                                <div className="flex gap-4">
                                    <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${formData.locationType === 'Offline' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-bold' : 'border-transparent bg-white dark:bg-neutral-900 text-gray-600 dark:text-gray-400'}`}>
                                        <input type="radio" name="locationType" value="Offline" className="hidden" onChange={handleChange} checked={formData.locationType === 'Offline'} />
                                        <MapPin size={18} /> Offline Venue
                                    </label>
                                    <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${formData.locationType === 'Online' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-bold' : 'border-transparent bg-white dark:bg-neutral-900 text-gray-600 dark:text-gray-400'}`}>
                                        <input type="radio" name="locationType" value="Online" className="hidden" onChange={handleChange} checked={formData.locationType === 'Online'} />
                                        <LinkIcon size={18} /> Online Event
                                    </label>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        {formData.locationType === 'Offline' ? 'Venue Address *' : 'Event Link *'}
                                    </label>
                                    <input 
                                        type={formData.locationType === 'Online' ? 'url' : 'text'} 
                                        required name="locationDetails" value={formData.locationDetails} onChange={handleChange}
                                        placeholder={formData.locationType === 'Offline' ? '123 University Campus, Block B' : 'https://meet.google.com/...'}
                                        className="w-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Details/Description */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Event Details *</label>
                                <textarea 
                                    required name="details" value={formData.details} onChange={handleChange}
                                    rows="4"
                                    placeholder="Describe the event, rules, prizes, schedule, etc..."
                                    className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white resize-none"
                                ></textarea>
                            </div>

                            {/* Image Upload */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Event Poster</label>
                                
                                {formData.posterUrl ? (
                                    <div className="relative w-full h-40 bg-gray-100 dark:bg-neutral-800 rounded-xl overflow-hidden border border-gray-200 dark:border-neutral-700 group">
                                        <img src={formData.posterUrl} alt="Poster Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button 
                                                type="button" 
                                                onClick={() => setFormData(prev => ({ ...prev, posterUrl: '' }))}
                                                className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold shadow-lg hover:bg-red-600 transition-colors"
                                            >
                                                Remove Image
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-neutral-700 rounded-xl bg-gray-50 dark:bg-neutral-900/50 hover:bg-gray-100 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer group">
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <Upload className="w-8 h-8 text-gray-400 group-hover:text-blue-500 transition-colors mb-2" />
                                        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium group-hover:text-blue-500 transition-colors">
                                            Click to upload a poster
                                        </span>
                                    </div>
                                )}
                            </div>

                        </form>
                    )}
                </div>

                {/* Footer */}
                {!success && (
                    <div className="px-6 py-4 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900/50 flex justify-end gap-3 shrink-0">
                        <button 
                            type="button" onClick={() => onClose()}
                            className="px-6 py-2.5 rounded-xl font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" form="event-form"
                            disabled={isSubmitting}
                            className="px-8 py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/20"
                        >
                            {isSubmitting ? (initialData ? 'Saving...' : 'Publishing...') : (initialData ? 'Save Changes' : 'Publish Event')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
