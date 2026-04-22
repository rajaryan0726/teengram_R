"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { fetchuser } from '@/actions/useractions';
import { fetchCommunityDetails, fetchCommunityMessages, sendCommunityMessage, removeCommunityMember, leaveCommunity, toggleSilentMode } from '@/actions/communityActions';
import { ArrowLeft, Send, Users, LogOut, BellOff, Bell, UserMinus, ShieldAlert, Paperclip, X } from 'lucide-react';
import Link from 'next/link';
import Sidebar from '@/app/Components/Sidebar';

export default function CommunityChatPage() {
    const { id } = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    
    const [userId, setUserId] = useState(null);
    const [community, setCommunity] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [mediaUrl, setMediaUrl] = useState('');
    const [mediaType, setMediaType] = useState('');
    const [isCreator, setIsCreator] = useState(false);
    
    const [showMembers, setShowMembers] = useState(false);
    
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!session?.user?.email) return;
        fetchuser(session.user.email).then(u => {
            if (u) {
                setUserId(u._id);
                loadCommunity(u._id);
            }
        });
    }, [session]);

    const loadCommunity = async (uId = userId) => {
        const c = await fetchCommunityDetails(id);
        if (!c) {
            router.push('/community');
            return;
        }
        setCommunity(c);
        setIsCreator(c.creator._id.toString() === uId.toString());
        loadMessages();
    };

    const loadMessages = async () => {
        const msgs = await fetchCommunityMessages(id);
        setMessages(msgs);
        setTimeout(scrollToBottom, 100);
    };

    useEffect(() => {
        const interval = setInterval(() => {
            if (id) loadMessages();
        }, 3000);
        return () => clearInterval(interval);
    }, [id]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) { alert("File size too large! Please upload under 20MB."); return; }
        
        const type = file.type.startsWith('image/') ? 'image' : 'video';
        const reader = new FileReader();
        reader.onloadend = () => {
            setMediaUrl(reader.result);
            setMediaType(type);
        };
        reader.readAsDataURL(file);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageInput.trim() && !mediaUrl) return;
        const res = await sendCommunityMessage(userId, id, messageInput, mediaUrl, mediaType);
        if (res.success) {
            setMessageInput('');
            setMediaUrl('');
            setMediaType('');
            loadMessages();
        } else {
            alert(res.error);
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (confirm("Remove this member?")) {
            await removeCommunityMember(userId, memberId, id);
            loadCommunity();
        }
    };

    const handleLeave = async () => {
        if (confirm("Are you sure you want to leave this community?")) {
            const res = await leaveCommunity(userId, id);
            if (res.success) router.push('/community');
            else alert(res.error);
        }
    };

    const handleToggleSilent = async () => {
        const newSilent = !community.silent;
        const res = await toggleSilentMode(userId, id, newSilent);
        if (res.success) {
            setCommunity({ ...community, silent: newSilent });
        }
    };

    if (!community) return <div className="p-10 text-center">Loading community...</div>;

    return (
        <div className="flex bg-gray-50 dark:bg-black h-screen w-full overflow-hidden">
            <Sidebar className="hidden md:flex flex-1" />
            
            <main className="flex-1 flex flex-col h-full bg-white dark:bg-neutral-900 border-x border-gray-100 dark:border-neutral-800">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center bg-white dark:bg-neutral-900 z-10">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <Link href="/community" className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="font-bold text-xl flex items-center gap-2">
                                {community.name} {community.silent && <BellOff size={16} className="text-red-500" />}
                            </h1>
                            <p className="text-xs text-gray-500">{community.members.length} members</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isCreator && (
                            <button onClick={handleToggleSilent} className={`p-2 rounded-xl transition ${community.silent ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300'} hidden sm:block`} title="Toggle Silent Mode">
                                {community.silent ? <BellOff size={20} /> : <Bell size={20} />}
                            </button>
                        )}
                        <button onClick={() => setShowMembers(true)} className="p-2 bg-blue-100 text-blue-600 rounded-xl transition" title="Members">
                            <Users size={20} />
                        </button>
                        {!isCreator && (
                            <button onClick={handleLeave} className="p-2 bg-red-100 text-red-600 rounded-xl transition" title="Leave Community">
                                <LogOut size={20} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-black/50">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <ShieldAlert size={48} className="mb-4 opacity-50" />
                            <p>Welcome to {community.name}!</p>
                            <p className="text-sm">Be the first to say hello.</p>
                        </div>
                    ) : (
                        messages.map((m, i) => {
                            const isMe = m.sender._id.toString() === userId?.toString();
                            return (
                                <div key={m._id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4 items-end gap-2`}>
                                    {!isMe && <img src={m.sender.profilepic || 'https://via.placeholder.com/30'} alt="avatar" className="w-8 h-8 rounded-full" />}
                                    <div className={`max-w-[75%] rounded-2xl p-3 shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 text-gray-900 dark:text-gray-100 rounded-bl-none'}`}>
                                        {!isMe && <p className="text-xs font-bold text-blue-500 mb-1">{m.sender.name}</p>}
                                        
                                        {m.mediaUrl && m.mediaType === 'image' && (
                                            <img src={m.mediaUrl} alt="attachment" className="rounded-xl w-full max-h-64 object-cover mb-2" />
                                        )}
                                        {m.mediaUrl && m.mediaType === 'video' && (
                                            <video src={m.mediaUrl} controls className="rounded-xl w-full max-h-64 bg-black mb-2" />
                                        )}
                                        
                                        {m.content && <p className="whitespace-pre-wrap word-break">{m.content}</p>}
                                        
                                        <div className={`text-[10px] mt-1 text-right opacity-70 flex justify-end items-center gap-1`}>
                                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Chat Input */}
                {community.silent && !isCreator ? (
                    <div className="p-4 bg-white dark:bg-neutral-900 border-t border-gray-100 dark:border-neutral-800 text-center text-red-500 font-semibold flex items-center justify-center gap-2">
                        <BellOff size={18} /> Announcements Mode (Only Admin can message)
                    </div>
                ) : (
                    <div className="bg-white dark:bg-neutral-900 border-t border-gray-100 dark:border-neutral-800 flex flex-col">
                        {mediaUrl && (
                            <div className="p-3 border-b flex items-center justify-between bg-gray-50 dark:bg-neutral-800/50">
                                <div className="flex items-center gap-2">
                                    {mediaType === 'image' ? (
                                        <img src={mediaUrl} className="h-14 w-14 object-cover rounded shadow" alt="Preview"/>
                                    ) : (
                                        <video src={mediaUrl} className="h-14 w-14 object-cover rounded shadow"/>
                                    )}
                                    <span className="text-sm font-medium">Attachment ready</span>
                                </div>
                                <button onClick={() => { setMediaUrl(''); setMediaType(''); }} className="p-1 text-gray-500 hover:text-red-500"><X size={20}/></button>
                            </div>
                        )}
                        <form onSubmit={handleSendMessage} className="p-4 flex gap-2 items-center">
                            <input 
                                type="file" 
                                accept="image/*,video/*" 
                                className="hidden" 
                                ref={fileInputRef} 
                                onChange={handleFileChange}
                            />
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 bg-gray-100 text-gray-500 hover:text-blue-600 rounded-full dark:bg-neutral-800 transition">
                                <Paperclip size={20} />
                            </button>
                            <input
                                type="text"
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                placeholder="Message the community..."
                                className="flex-1 bg-gray-100 dark:bg-neutral-800 border-none rounded-full px-6 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <button type="submit" disabled={!messageInput.trim() && !mediaUrl} className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:opacity-50 transition shadow-md">
                                <Send size={20} className="ml-1" />
                            </button>
                        </form>
                    </div>
                )}
            </main>

            {/* Members Modal */}
            {showMembers && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-md p-6 max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Users size={20} className="text-blue-500" /> Members ({community.members.length})
                            </h2>
                            <button onClick={() => setShowMembers(false)} className="text-gray-500 hover:text-black dark:hover:text-white">x</button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {community.members.map(member => (
                                <div key={member._id} className="flex justify-between items-center p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-800 border border-transparent dark:border-neutral-800/50">
                                    <div className="flex items-center gap-3">
                                        <img src={member.profilepic || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full" />
                                        <div>
                                            <p className="font-bold text-sm">
                                                {member.name} {member._id.toString() === community.creator._id.toString() && <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 rounded">Creator</span>}
                                            </p>
                                            <p className="text-xs text-gray-500">@{member.username}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Creator Tool: Remove Member */}
                                    {isCreator && member._id.toString() !== community.creator._id.toString() && (
                                        <button 
                                            onClick={() => handleRemoveMember(member._id)}
                                            className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition"
                                            title="Remove member"
                                        >
                                            <UserMinus size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
