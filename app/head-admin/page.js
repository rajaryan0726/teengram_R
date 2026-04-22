"use client";
import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { getPendingInstitutions, getVerifiedInstitutions, verifyInstitution, rejectInstitution } from '@/actions/superAdminActions';
import { Loader2, Check, X, Eye, FileText, ChevronRight, GraduationCap, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const HeadAdminDashboard = () => {
    const { data: session } = useSession();
    const [pendingInstitutions, setPendingInstitutions] = useState([]);
    const [verifiedInstitutions, setVerifiedInstitutions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'verified'
    const [selectedInst, setSelectedInst] = useState(null); // For Modal

    const openBase64InNewTab = (dataUrl) => {
        if(!dataUrl || typeof dataUrl !== 'string') {
            return alert("This document is missing, corrupted, or was incorrectly uploaded via legacy method.");
        }
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

    const fetchInstitutions = async () => {
        setLoading(true);
        try {
            const [pendingData, verifiedData] = await Promise.all([
                getPendingInstitutions(),
                getVerifiedInstitutions()
            ]);
            setPendingInstitutions(pendingData || []);
            setVerifiedInstitutions(verifiedData || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInstitutions();
    }, []);

    const handleVerify = async (id) => {
        if (!confirm("Are you sure you want to verify this institution?")) return;
        const res = await verifyInstitution(id, session?.user?.id);
        if(res.success) {
            alert("Institution Verified!");
            if(selectedInst) setSelectedInst(null); // Close modal if open
            fetchInstitutions();
        } else {
            alert("Error: " + res.error);
        }
    };

    const handleReject = async (id) => {
        const reason = prompt("Enter reason for rejection:");
        if (!reason) return;
        const res = await rejectInstitution(id, reason, session?.user?.id);
        if(res.success) {
            alert("Institution Rejected");
            if(selectedInst) setSelectedInst(null); // Close modal if open
            fetchInstitutions();
        } else {
            alert("Error: " + res.error);
        }
    };

    const currentList = activeTab === 'pending' ? pendingInstitutions : verifiedInstitutions;

    // --- Components ---
    const InstCard = ({ inst }) => (
        <div key={inst._id} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border-l-4 border-blue-500 border border-t-gray-100 border-r-gray-100 border-b-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                   <GraduationCap className="w-6 h-6 text-blue-500"/> {inst.institution_name}
                </h3>
                <p className="text-sm font-semibold text-blue-600 tracking-wide mt-1 uppercase">{inst.institution_type} • Reg: {inst.institution_registration_number}</p>
                <p className="text-sm text-slate-500 mt-2 line-clamp-1">{inst.address?.city}, {inst.address?.state}</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                <button onClick={() => setSelectedInst(inst)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg font-semibold hover:bg-blue-100 transition whitespace-nowrap">
                    <Eye className="w-4 h-4"/> See Full Details
                </button>
            </div>
        </div>
    );

    const InstModal = () => {
        if(!selectedInst) return null;
        const isPending = selectedInst.status === 'pending';
        
        return (
            <AnimatePresence>
                <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 sm:p-6 pb-20 sm:pb-6 overflow-y-auto backdrop-blur-sm">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-full overflow-hidden my-auto">
                        
                        {/* Modal Header */}
                        <div className="bg-blue-900 p-6 text-white flex justify-between items-center rounded-t-2xl">
                            <div>
                                <h2 className="text-2xl font-bold">{selectedInst.institution_name}</h2>
                                <span className="inline-block mt-2 px-3 py-1 bg-blue-800 rounded-full text-xs font-semibold tracking-wider uppercase shadow-inner">
                                    {selectedInst.institution_type}
                                </span>
                            </div>
                            <button onClick={()=>setSelectedInst(null)} className="text-blue-200 hover:text-white bg-blue-800 hover:bg-blue-700 p-2 rounded-full transition">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="p-6 sm:p-8 overflow-y-auto bg-slate-50 flex-1">
                            <div className="grid md:grid-cols-2 gap-8">
                                
                                {/* Basics & Address */}
                                <div className="space-y-6">
                                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                        <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-500"/> Core Details</h3>
                                        <ul className="space-y-3 text-sm">
                                            <li className="flex justify-between"><span className="text-gray-500">Established:</span> <span className="font-semibold text-slate-700">{selectedInst.year_of_establishment || 'N/A'}</span></li>
                                            <li className="flex justify-between"><span className="text-gray-500">Affiliation/Board:</span> <span className="font-semibold text-slate-700">{selectedInst.affiliation_board_university || 'N/A'}</span></li>
                                            <li className="flex justify-between"><span className="text-gray-500">Reg. Number:</span> <span className="font-semibold text-slate-700">{selectedInst.institution_registration_number || 'N/A'}</span></li>
                                            <li className="flex flex-col mt-2"><span className="text-gray-500 mb-1">Website URL:</span> <a href={selectedInst.official_website_url} target="_blank" className="font-semibold text-blue-600 hover:underline break-all">{selectedInst.official_website_url || 'N/A'}</a></li>
                                        </ul>
                                    </div>
                                    
                                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                        <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4 flex items-center gap-2"><ChevronRight className="w-5 h-5 text-blue-500"/> Full Address</h3>
                                        <p className="text-sm text-slate-700 leading-relaxed">
                                            {selectedInst.address?.line1}<br/>
                                            {selectedInst.address?.line2 && <>{selectedInst.address?.line2}<br/></>}
                                            {selectedInst.address?.city}, {selectedInst.address?.state}<br/>
                                            {selectedInst.address?.country} - {selectedInst.address?.pincode}
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Contact & Documents */}
                                <div className="space-y-6">
                                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                        <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4 flex items-center gap-2"><ChevronRight className="w-5 h-5 text-blue-500"/> Official Contacts</h3>
                                        <ul className="space-y-3 text-sm">
                                            <li className="flex flex-col"><span className="text-gray-500">Official Email:</span> <span className="font-semibold text-slate-700 break-all">{selectedInst.contact?.official_email}</span></li>
                                            <li className="flex justify-between"><span className="text-gray-500">Contact No:</span> <span className="font-semibold text-slate-700">{selectedInst.contact?.contact_number}</span></li>
                                            {selectedInst.contact?.landline_number && <li className="flex justify-between"><span className="text-gray-500">Landline:</span> <span className="font-semibold text-slate-700">{selectedInst.contact?.landline_number}</span></li>}
                                        </ul>
                                    </div>
                                    
                                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                        <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4 flex items-center gap-2"><ChevronRight className="w-5 h-5 text-blue-500"/> Representative (Admin)</h3>
                                        <ul className="space-y-3 text-sm">
                                            <li className="flex justify-between"><span className="text-gray-500">Name:</span> <span className="font-semibold text-slate-700">{selectedInst.representative?.name}</span></li>
                                            <li className="flex justify-between"><span className="text-gray-500">Designation:</span> <span className="font-semibold text-slate-700">{selectedInst.representative?.designation}</span></li>
                                            <li className="flex flex-col"><span className="text-gray-500">Email:</span> <span className="font-semibold text-slate-700 break-all">{selectedInst.representative?.email}</span></li>
                                            <li className="flex justify-between"><span className="text-gray-500">Phone:</span> <span className="font-semibold text-slate-700">{selectedInst.representative?.contact}</span></li>
                                            {selectedInst.representative?.employee_id && <li className="flex justify-between"><span className="text-gray-500">Employee ID:</span> <span className="font-semibold text-slate-700">{selectedInst.representative?.employee_id}</span></li>}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Documents Section */}
                            <div className="mt-6 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-500"/> Uploaded Documents</h3>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    {selectedInst.mandatory_documents?.map((doc, idx) => (
                                        <button key={idx} onClick={() => openBase64InNewTab(doc.file_url || doc.data || doc)} className="flex items-center gap-3 p-3 bg-blue-50 text-left hover:bg-blue-100 border border-blue-200 rounded-lg transition group">
                                            <div className="p-2 bg-blue-600 text-white rounded-md"><FileText className="w-5 h-5"/></div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="text-sm font-semibold text-blue-900 truncate">Mandatory Document {idx+1}</p>
                                                <p className="text-xs text-blue-600 mt-0.5">Click to view securely</p>
                                            </div>
                                        </button>
                                    ))}
                                    {selectedInst.supporting_documents?.map((doc, idx) => (
                                        <button key={idx} onClick={() => openBase64InNewTab(doc.file_url || doc.data || doc)} className="flex items-center gap-3 p-3 bg-slate-50 text-left hover:bg-slate-100 border border-slate-200 rounded-lg transition group">
                                            <div className="p-2 bg-slate-500 text-white rounded-md"><FileText className="w-5 h-5"/></div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="text-sm font-semibold text-slate-700 truncate">Supporting Document {idx+1}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">Click to view</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                {(!selectedInst.mandatory_documents?.length && !selectedInst.supporting_documents?.length) && (
                                    <p className="text-sm text-gray-500 italic">No documents uploaded.</p>
                                )}
                            </div>
                        </div>
                        
                        {/* Modal Actions */}
                        {isPending && (
                            <div className="bg-white p-5 border-t border-gray-200 flex flex-col sm:flex-row gap-3 justify-end rounded-b-2xl">
                                <button onClick={() => handleReject(selectedInst._id)} className="px-6 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg font-bold hover:bg-red-100 transition flex items-center justify-center gap-2">
                                    <X className="w-5 h-5"/> Reject Application
                                </button>
                                <button onClick={() => handleVerify(selectedInst._id)} className="px-8 py-2.5 bg-green-600 text-white rounded-lg font-bold shadow-md hover:bg-green-700 hover:shadow-lg transition flex items-center justify-center gap-2">
                                    <Check className="w-5 h-5"/> Verify & Approve
                                </button>
                            </div>
                        )}
                        {!isPending && (
                            <div className="bg-gray-50 p-5 border-t border-gray-200 flex justify-end rounded-b-2xl">
                                <div className="text-green-600 font-bold flex items-center gap-2 px-4 py-2 bg-green-100 rounded-lg">
                                    <Check className="w-5 h-5"/> Status: Verified Admin
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            </AnimatePresence>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans">
            {/* Header */}
            <div className="bg-blue-900 text-white pt-10 pb-6 px-6 shadow-md">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Super Admin Hub</h1>
                        <p className="text-blue-200 mt-2">Manage and Verify TeenGram Institutions</p>
                    </div>
                    <button onClick={() => signOut({ callbackUrl: '/login' })} className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-red-600 text-white hover:bg-red-700 border border-red-500 rounded-lg text-sm font-bold shadow transition-colors active:scale-95 w-fit">
                        <LogOut className="w-4 h-4"/> Logout
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 mt-8">
                {/* Tabs */}
                <div className="flex gap-4 border-b border-gray-200 mb-8 pb-1 overflow-x-auto">
                    <button 
                        onClick={() => setActiveTab('pending')}
                        className={`pb-3 px-4 font-bold text-lg whitespace-nowrap transition-colors relative ${activeTab === 'pending' ? 'text-blue-700' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        Non-Verified Admins {pendingInstitutions.length > 0 && <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingInstitutions.length}</span>}
                        {activeTab === 'pending' && <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-md" />}
                    </button>
                    <button 
                        onClick={() => setActiveTab('verified')}
                        className={`pb-3 px-4 font-bold text-lg whitespace-nowrap transition-colors relative ${activeTab === 'verified' ? 'text-blue-700' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        Verified Admins
                        {activeTab === 'verified' && <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-md" />}
                    </button>
                </div>
                
                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-blue-500">
                        <Loader2 className="w-10 h-10 animate-spin mb-4"/>
                        <p className="font-semibold text-slate-600 animate-pulse">Loading Institutions...</p>
                    </div>
                ) : currentList.length === 0 ? (
                    <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="w-10 h-10 text-blue-400"/>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">You're all caught up!</h3>
                        <p className="text-gray-500 max-w-sm mx-auto">
                            {activeTab === 'pending' ? 'There are no pending registrations waiting for your approval.' : 'No verified institutions found in the system yet.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {currentList.map((inst) => <InstCard key={inst._id} inst={inst} />)}
                    </div>
                )}
            </div>

            <InstModal />
            
        </div>
    );
};

export default HeadAdminDashboard;
