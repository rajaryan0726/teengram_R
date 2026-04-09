"use client";
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getPendingUsers, getVerifiedUsers, verifyUser, rejectUser, getSubAdminData } from '@/actions/subAdminActions';
import { Loader2, CheckCircle, XCircle, Users, ExternalLink, ShieldCheck, MailWarning, Eye, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SubAdminPanel = () => {
    const { data: session } = useSession();
    const [subAdminInfo, setSubAdminInfo] = useState(null);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [verifiedUsers, setVerifiedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null); // For detail modal

    const fetchData = async () => {
        setLoading(true);
        const info = await getSubAdminData(session.user.id);
        const p_users = await getPendingUsers(session.user.id);
        const v_users = await getVerifiedUsers(session.user.id);
        setSubAdminInfo(info);
        setPendingUsers(p_users || []);
        setVerifiedUsers(v_users || []);
        setLoading(false);
    };

    useEffect(() => {
        if(session?.user?.id) fetchData();
    }, [session]);

    const handleVerify = async (id) => {
        if (!confirm("Approve this student's registration?")) return;
        const res = await verifyUser(id, session.user.id);
        if(res.success) {
            setSelectedUser(null);
            fetchData();
        }
    };

    const handleReject = async (id) => {
        const reason = prompt("Enter rejection reason (e.g. Invalid ID proof, Not in this class):");
        if (!reason) return;
        const res = await rejectUser(id, reason, session.user.id);
        if(res.success) {
            setSelectedUser(null);
            fetchData();
        }
    };

    const openBase64InNewTab = (dataUrl) => {
        if(!dataUrl) return;
        if(dataUrl.startsWith('http')) return window.open(dataUrl, '_blank');
        try {
            fetch(dataUrl)
                .then(res => res.blob())
                .then(blob => {
                    const blobUrl = URL.createObjectURL(blob);
                    window.open(blobUrl, '_blank');
                });
        } catch (e) {
            console.error(e);
            alert("Could not open document secure link.");
        }
    };

    if (loading) return <div className="h-screen w-full flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-blue-600"/></div>;

    return (
        <div className="h-screen w-full overflow-y-auto bg-slate-50 pb-20 font-sans relative">
            {/* Header Component */}
            <div className="bg-blue-900 text-white pt-10 pb-8 px-6 md:px-10 shadow-md border-b-4 border-blue-700 sticky top-0 z-10">
                <div className="w-full max-w-[1700px] mx-auto flex flex-col md:flex-row md:items-end justify-between">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-3">
                            <ShieldCheck className="w-8 h-8 text-blue-300"/> Teacher / Sub-Admin Panel
                        </h1>
                        <p className="text-blue-200 mt-2 text-lg font-medium">Verify Students & Process Enrollments</p>
                    </div>
                    {subAdminInfo && (
                        <div className="mt-6 md:mt-0 bg-blue-800/50 p-4 rounded-xl border border-blue-700/50 backdrop-blur-sm self-stretch flex flex-col justify-center gap-1.5 md:min-w-[300px]">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-blue-300">Logged in as:</span>
                                <span className="font-bold">{subAdminInfo.name} <span className="text-blue-400">(@{subAdminInfo.username})</span></span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-blue-300">Department:</span>
                                <span className="font-bold">{subAdminInfo.assigned_class_department}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm mt-1 pt-2 border-t border-blue-700">
                                <span className="text-blue-300">Your Auth Code:</span>
                                <code className="bg-blue-900 px-2 py-0.5 rounded text-blue-200 font-mono font-bold tracking-wider">{subAdminInfo.verification_code}</code>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Dashboard Content */}
            <div className="w-full max-w-[1700px] mx-auto px-4 md:px-10 mt-8 mb-16">
                <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
                    
                    {/* Left Column: Pending Students */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                        <div className="bg-orange-50 border-b border-orange-100 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-orange-700">
                                <MailWarning className="w-5 h-5"/> Pending Applications
                            </h2>
                            <span className="bg-orange-600 text-white px-3 py-1 text-sm font-bold rounded-full shadow-inner">
                                {pendingUsers.length}
                            </span>
                        </div>
                        
                        <div className="p-6 overflow-y-auto max-h-[70vh] bg-slate-50/30">
                            <AnimatePresence>
                                {pendingUsers.map(user => (
                                    <motion.div 
                                        key={user._id} 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-all border-l-4 border-orange-400 mb-4 border-y border-r border-gray-200 group relative"
                                    >
                                        <button onClick={() => setSelectedUser(user)} className="absolute top-4 right-4 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 p-2 rounded-lg transition" title="View Full Details">
                                            <Eye className="w-5 h-5"/>
                                        </button>

                                        <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-4 pr-12">
                                            <div className="flex items-center gap-4">
                                                <img src={user.profilepic || '/default-avatar.png'} alt="P" className="w-12 h-12 rounded-full object-cover shadow-sm bg-gray-100"/>
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">{user.name}</h3>
                                                    <p className="text-sm font-medium text-blue-600">@{user.username}</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 mb-4">
                                            <p className="text-sm flex items-center gap-2">
                                                <span className="font-semibold text-slate-700">Course / Class:</span> 
                                                <span className="text-blue-900 font-bold">{user.academic_info?.course || user.academic_info?.standard_class} {user.academic_info?.year && `(Year ${user.academic_info?.year})`}</span>
                                            </p>
                                        </div>
                                        
                                        <div className="flex gap-2 w-full">
                                            <button onClick={()=>handleReject(user._id)} className="flex-1 flex justify-center items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded-lg font-bold hover:bg-red-100 transition whitespace-nowrap">
                                                <XCircle className="w-4 h-4"/> Reject
                                            </button>
                                            <button onClick={()=>handleVerify(user._id)} className="flex-1 flex justify-center items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 shadow transition whitespace-nowrap">
                                                <CheckCircle className="w-4 h-4"/> Approve
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            
                            {pendingUsers.length === 0 && (
                                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                        <CheckCircle className="w-8 h-8 text-blue-400"/>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-700 mb-1">Caught Up!</h3>
                                    <p className="text-sm font-medium">There are no pending students to verify.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Verified Students */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                        <div className="bg-green-50 border-b border-green-100 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-green-700">
                                <Users className="w-5 h-5"/> Enrolled Audience
                            </h2>
                            <span className="bg-green-600 text-white px-3 py-1 text-sm font-bold rounded-full shadow-inner">
                                Total: {verifiedUsers.length}
                            </span>
                        </div>
                        
                        <div className="p-6 overflow-y-auto max-h-[70vh] bg-slate-50/30">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {verifiedUsers.map(user => (
                                    <div key={user._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition group relative pr-12">
                                        <div className="relative">
                                            <img src={user.profilepic || '/default-avatar.png'} alt={user.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-100"/>
                                            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <h3 className="font-bold text-sm text-slate-800 truncate">{user.name}</h3>
                                            <p className="text-xs text-blue-600 font-medium truncate">@{user.username}</p>
                                        </div>
                                        <button onClick={() => setSelectedUser(user)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 p-2 rounded-lg transition opacity-0 group-hover:opacity-100 focus:opacity-100" title="View Full Details">
                                            <Eye className="w-4 h-4"/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                            
                            {verifiedUsers.length === 0 && (
                                <div className="py-12 flex flex-col items-center justify-center text-slate-400 col-span-2">
                                    <Users className="w-12 h-12 text-slate-300 mb-3"/>
                                    <p className="font-medium">No verified students enrolled yet.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* FULL USER DETAILS MODAL */}
            <AnimatePresence>
                {selectedUser && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white max-w-2xl w-full rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                            <div className="bg-blue-900 px-6 py-4 flex justify-between items-center">
                                <h3 className="text-white font-bold text-lg flex items-center gap-2"><Eye className="w-5 h-5 opacity-70"/> User Details Profile</h3>
                                <button onClick={() => setSelectedUser(null)} className="text-blue-200 hover:text-white transition"><X className="w-6 h-6"/></button>
                            </div>
                            <div className="p-6 overflow-y-auto max-h-[75vh]">
                                <div className="flex items-center gap-6 mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100">
                                    <img src={selectedUser.profilepic || '/default-avatar.png'} alt="avatar" className="w-24 h-24 rounded-full object-cover shadow-sm bg-white border-4 border-white"/>
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-800">{selectedUser.name}</h2>
                                        <p className="text-blue-600 font-medium">@{selectedUser.username}</p>
                                        <p className="text-sm text-slate-500 mt-1">{selectedUser.email}</p>
                                        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-bold uppercase tracking-wider">
                                            Status: <span className={selectedUser.status === 'verified' ? 'text-green-600' : 'text-orange-600'}>{selectedUser.status}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-6 mb-8">
                                    <div>
                                        <h4 className="font-bold text-slate-700 mb-3 border-b pb-2">Academic Information</h4>
                                        <div className="space-y-3 text-sm">
                                            <p><span className="text-slate-500 w-24 inline-block">Institution:</span> <span className="font-semibold text-slate-800 flex-1">{selectedUser.academic_info?.institution_name || 'N/A'}</span></p>
                                            <p><span className="text-slate-500 w-24 inline-block">Course/Class:</span> <span className="font-semibold text-slate-800 flex-1">{selectedUser.academic_info?.course || selectedUser.academic_info?.standard_class || 'N/A'}</span></p>
                                            <p><span className="text-slate-500 w-24 inline-block">Year:</span> <span className="font-semibold text-slate-800 flex-1">{selectedUser.academic_info?.year || 'N/A'}</span></p>
                                            <p><span className="text-slate-500 w-24 inline-block">Role No:</span> <span className="font-semibold text-slate-800 flex-1">{selectedUser.academic_info?.roll_no || 'N/A'}</span></p>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-700 mb-3 border-b pb-2">Personal Information</h4>
                                        <div className="space-y-3 text-sm">
                                            <p><span className="text-slate-500 w-24 inline-block">DOB:</span> <span className="font-semibold text-slate-800 flex-1">{new Date(selectedUser.dob).toLocaleDateString() || 'N/A'}</span></p>
                                            <p><span className="text-slate-500 w-24 inline-block">Gender:</span> <span className="font-semibold text-slate-800 flex-1 capitalize">{selectedUser.gender || 'N/A'}</span></p>
                                            <p><span className="text-slate-500 w-24 inline-block">Bio:</span> <span className="font-semibold text-slate-800 flex-1">{selectedUser.bio || 'N/A'}</span></p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-bold text-slate-700 mb-3 border-b pb-2">Verification Documents</h4>
                                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                                                <ShieldCheck className="w-5 h-5"/>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">Identity Fast-Check</p>
                                                <p className="text-xs text-slate-500">Student ID Card Proof</p>
                                            </div>
                                        </div>
                                        {selectedUser.id_card_base64 || selectedUser.id_card_url ? (
                                            <button onClick={() => openBase64InNewTab(selectedUser.id_card_base64 || selectedUser.id_card_url)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-blue-700 transition flex items-center gap-2">
                                                <ExternalLink className="w-4 h-4"/> View Document
                                            </button>
                                        ) : (
                                            <span className="text-slate-400 text-sm italic font-medium">Not Uploaded</span>
                                        )}
                                    </div>
                                </div>

                                {selectedUser.status === 'pending' && (
                                    <div className="mt-8 pt-6 border-t border-slate-100 flex gap-4">
                                        <button onClick={()=>handleReject(selectedUser._id)} className="flex-1 flex justify-center items-center gap-2 bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl font-bold hover:bg-red-100 transition whitespace-nowrap">
                                            <XCircle className="w-5 h-5"/> Reject Application
                                        </button>
                                        <button onClick={()=>handleVerify(selectedUser._id)} className="flex-1 flex justify-center items-center gap-2 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 shadow-md transition whitespace-nowrap">
                                            <CheckCircle className="w-5 h-5"/> Approve
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SubAdminPanel;
