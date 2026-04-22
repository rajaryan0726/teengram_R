"use client";
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '../Components/Sidebar';
import { getActiveCommunities, getPublicCommunities, createCommunity, requestJoinCommunity, deleteCommunity, updateCommunity, acceptCommunityRequest, rejectCommunityRequest, searchCommunityInviteUsers, sendCommunityInvite } from '@/actions/communityActions';
import { searchUsersAction, fetchuser } from '@/actions/useractions';
import { Users, Plus, Globe, Shield, Activity, Settings, UserPlus, Check, X, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function CommunityPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [userId, setUserId] = useState(null);
    const [userEmail, setUserEmail] = useState(null);
    
    const [activeCommunities, setActiveCommunities] = useState([]);
    const [publicCommunities, setPublicCommunities] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showManageModal, setShowManageModal] = useState(false);
    const [selectedCommunity, setSelectedCommunity] = useState(null);
    
    // Form States
    const [formData, setFormData] = useState({ name: '', description: '', tagline: '', status: 'public' });
    const [inviteQuery, setInviteQuery] = useState('');
    const [inviteResults, setInviteResults] = useState([]);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push('/login');
        } else if (session?.user?.email) {
            setUserEmail(session.user.email);
            fetchuser(session.user.email).then(u => {
                if (u) {
                    setUserId(u._id);
                    loadData(u._id);
                }
            });
        }
    }, [session, status]);

    const loadData = async (uId = userId) => {
        if (!uId) return;
        const active = await getActiveCommunities(uId);
        setActiveCommunities(active);
        handleSearchPublic(searchQuery, uId);
    };

    const handleSearchPublic = async (q, uId = userId) => {
        if (!uId) return;
        const pubs = await getPublicCommunities(uId, q);
        setPublicCommunities(pubs);
    };

    useEffect(() => {
        const delay = setTimeout(() => handleSearchPublic(searchQuery), 500);
        return () => clearTimeout(delay);
    }, [searchQuery]);

    const handleCreate = async (e) => {
        e.preventDefault();
        const res = await createCommunity(userId, formData);
        if (res.success) {
            setShowCreateModal(false);
            setFormData({ name: '', description: '', tagline: '', status: 'public' });
            loadData();
        } else {
            alert(res.error || "Creation failed");
        }
    };

    const handleJoinRequest = async (communityId) => {
        const res = await requestJoinCommunity(userId, userEmail, communityId);
        if (res.success) {
            alert("Join request sent to the creator!");
            loadData();
        } else {
            alert(res.error || "Failed to send request");
        }
    };

    const handleDelete = async (communityId) => {
        if (confirm("Are you sure you want to delete this community?")) {
            const res = await deleteCommunity(communityId, userId);
            if (res.success) {
                setShowManageModal(false);
                loadData();
            } else {
                alert(res.error || "Failed to delete");
            }
        }
    };

    const handleSearchInvite = async (e) => {
        const q = e.target.value;
        setInviteQuery(q);
        if (q.trim().length > 0) {
            const users = await searchUsersAction(q, userEmail);
            setInviteResults(users);
        } else {
            setInviteResults([]);
        }
    };
    
    const sendInvite = async (recipientEmail) => {
        const res = await sendCommunityInvite(userEmail, recipientEmail, selectedCommunity._id);
        if (res.success) alert("Invite sent!");
        else alert(res.error || "Failed to send");
    };

    return (
        <div className="flex bg-gray-50 dark:bg-black h-screen w-full overflow-hidden">
            <Sidebar className="flex-1" />
            
            <main className="flex-1 p-2 lg:p-8 overflow-y-auto w-full pb-20 md:pb-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    
                    {/* Header */}
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-neutral-800 flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500 flex items-center gap-2">
                                <Users size={32} className="text-blue-600" /> Communities
                            </h1>
                            <p className="text-gray-500 mt-1">Connect, chat, and manage your groups.</p>
                        </div>
                        <button 
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold transition"
                        >
                            <Plus size={20} /> Create Community
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Active Communities */}
                        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-neutral-800">
                            <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-gray-800 dark:text-gray-100">
                                <Activity className="text-green-500" /> Active Communities
                            </h2>
                            <div className="space-y-3">
                                {activeCommunities.length === 0 ? (
                                    <p className="text-gray-500 text-center py-4">You have not joined any communities yet.</p>
                                ) : (
                                    activeCommunities.map(c => (
                                        <div key={c._id} className="p-4 rounded-xl border border-gray-100 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition">
                                            <div className="flex justify-between items-start">
                                                <Link href={`/community/${c._id}`} className="flex-1">
                                                    <h3 className="font-bold text-lg text-blue-600 dark:text-blue-400">{c.name}</h3>
                                                    <p className="text-sm text-gray-500">{c.tagline}</p>
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-md mt-2 inline-block">
                                                        {c.status.toUpperCase()}
                                                    </span>
                                                </Link>
                                                {c.creator.toString() === userId?.toString() && (
                                                    <button onClick={() => { setSelectedCommunity(c); setShowManageModal(true); }} className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                                                        <Settings size={20} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Public Communities */}
                        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-neutral-800">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-gray-100">
                                    <Globe className="text-indigo-500" /> Public Communities
                                </h2>
                            </div>
                            
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search public communities..." 
                                    className="w-full pl-10 pr-4 py-2 border rounded-xl dark:bg-neutral-800 dark:border-neutral-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div className="space-y-3">
                                {publicCommunities.length === 0 ? (
                                    <p className="text-gray-500 text-center py-4">No public communities found.</p>
                                ) : (
                                    publicCommunities.map(c => (
                                        <div key={c._id} className="p-4 rounded-xl border border-gray-100 dark:border-neutral-800 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition">
                                            <div>
                                                <h3 className="font-bold text-gray-900 dark:text-gray-100">{c.name}</h3>
                                                <p className="text-sm text-gray-500 truncate max-w-[200px]">{c.description}</p>
                                            </div>
                                            <button 
                                                onClick={() => handleJoinRequest(c._id)}
                                                disabled={c.pending_requests?.includes(userId?.toString())}
                                                className="px-4 py-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg font-medium text-sm transition disabled:opacity-50"
                                            >
                                                {c.pending_requests?.includes(userId?.toString()) ? 'Requested' : 'Join'}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Create Community Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500">Create Community</h2>
                            <button onClick={() => setShowCreateModal(false)}><X className="text-gray-500 hover:text-black dark:hover:text-white" /></button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Community Name</label>
                                <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-3 border rounded-xl dark:bg-neutral-800 dark:border-neutral-700 outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Tagline</label>
                                <input type="text" value={formData.tagline} onChange={(e) => setFormData({...formData, tagline: e.target.value})} className="w-full p-3 border rounded-xl dark:bg-neutral-800 dark:border-neutral-700 outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description (Max 30 words)</label>
                                <textarea required rows="3" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full p-3 border rounded-xl dark:bg-neutral-800 dark:border-neutral-700 outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Status</label>
                                <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full p-3 border rounded-xl dark:bg-neutral-800 dark:border-neutral-700 outline-none focus:border-blue-500">
                                    <option value="public">Public (Appears in search)</option>
                                    <option value="private">Private (Invite only)</option>
                                </select>
                            </div>
                            <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition">Create</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Manage Community Modal */}
            {showManageModal && selectedCommunity && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500">Manage: {selectedCommunity.name}</h2>
                            <button onClick={() => setShowManageModal(false)}><X className="text-gray-500 hover:text-black dark:hover:text-white" /></button>
                        </div>
                        
                        <div className="space-y-6">
                            {/* Invite Users */}
                            <div className="p-4 border rounded-xl dark:border-neutral-800">
                                <h3 className="font-bold flex items-center gap-2 mb-2"><UserPlus size={18}/> Invite Users</h3>
                                <input 
                                    type="text" 
                                    placeholder="Search users to invite..." 
                                    value={inviteQuery}
                                    onChange={handleSearchInvite}
                                    className="w-full p-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-700 mb-3 outline-none"
                                />
                                <div className="max-h-40 overflow-y-auto space-y-2">
                                    {inviteResults.map(u => (
                                        <div key={u._id} className="flex justify-between items-center p-2 hover:bg-gray-50 dark:hover:bg-neutral-800 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <img src={u.profilepic || 'https://via.placeholder.com/40'} className="w-8 h-8 rounded-full" />
                                                <span className="font-medium text-sm">{u.name}</span>
                                            </div>
                                            <button onClick={() => sendInvite(u.email)} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200">Invite</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Danger Zone */}
                            <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30 rounded-xl">
                                <h3 className="font-bold text-red-600 flex items-center gap-2 mb-2"><Trash2 size={18}/> Danger Zone</h3>
                                <p className="text-sm text-red-500/80 mb-3">Deleting your community removes all messages and members permanently.</p>
                                <button onClick={() => handleDelete(selectedCommunity._id)} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold w-full hover:bg-red-700 transition">Delete Community</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
