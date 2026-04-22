"use client";
import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { getAdminInstitution, getSubAdmins, createSubAdmin, deleteSubAdmin, updateSubAdmin, getVerifiedUsersBySubAdmin } from '@/actions/adminActions';
import { Loader2, UserPlus, Trash2, Edit2, Download, X, Save, Users, ChevronRight, FileText, LogOut, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AdminPanel = () => {
    const { data: session } = useSession();
    const [institution, setInstitution] = useState(null);
    const [subAdmins, setSubAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Form state
    const [newSubAdmin, setNewSubAdmin] = useState({ name: '', username: '', email: '', password: '', assigned_class_department: '' });
    const [creating, setCreating] = useState(false);

    // Edit state
    const [selectedEdit, setSelectedEdit] = useState(null);

    // Verified Users View state
    const [viewVerifiedSubAdmin, setViewVerifiedSubAdmin] = useState(null);
    const [verifiedUsersList, setVerifiedUsersList] = useState([]);
    const [loadingVerified, setLoadingVerified] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        const inst = await getAdminInstitution(session.user.id);
        setInstitution(inst);
        if (inst) {
            const subs = await getSubAdmins(inst._id);
            setSubAdmins(subs || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (session?.user?.id) fetchData();
    }, [session]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreating(true);
        const res = await createSubAdmin(newSubAdmin, institution._id, session.user.id);
        if (res.success) {
            alert("Sub-admin created successfully!");
            setNewSubAdmin({ name: '', username: '', email: '', password: '', assigned_class_department: '' });
            fetchData();
        } else {
            alert("Error: " + res.error);
        }
        setCreating(false);
    };

    const handleEditSave = async (e) => {
        e.preventDefault();
        setCreating(true);
        const res = await updateSubAdmin(selectedEdit._id, selectedEdit);
        if (res.success) {
            alert("Sub-admin updated successfully!");
            setSelectedEdit(null);
            fetchData();
        } else {
            alert("Error: " + res.error);
        }
        setCreating(false);
    };

    const handleShowVerified = async (subAdmin) => {
        setViewVerifiedSubAdmin(subAdmin);
        setLoadingVerified(true);
        const users = await getVerifiedUsersBySubAdmin(subAdmin.user._id);
        setVerifiedUsersList(users || []);
        setLoadingVerified(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to remove this Sub-Admin?")) return;
        const res = await deleteSubAdmin(id);
        if(res.success) {
            alert("Deleted successfully");
            fetchData();
        }
    };

    const downloadPDF = (sa) => {
        const doc = new jsPDF();
        doc.setFontSize(24);
        doc.setTextColor(30, 58, 138); // blue-900
        doc.text("Sub-Admin Credentials", 20, 30);
        
        doc.setFontSize(14);
        doc.setTextColor(51, 65, 85); // slate-700
        doc.text(`Institution: ${institution.institution_name}`, 20, 45);
        
        // Draw a line
        doc.setDrawColor(200, 212, 228);
        doc.line(20, 55, 190, 55);

        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42); // slate-900
        
        doc.text(`Name:`, 20, 75);
        doc.text(sa.name, 60, 75);
        
        doc.text(`Username:`, 20, 90);
        doc.text(sa.username, 60, 90);
        
        doc.text(`Email:`, 20, 105);
        doc.text(sa.user?.email || 'N/A', 60, 105);
        
        doc.text(`Department:`, 20, 120);
        doc.text(sa.assigned_class_department, 60, 120);
        
        const passwordText = sa.plain_password ? sa.plain_password : "(Hidden - Please reset via Edit Panel)";
        doc.text(`Password:`, 20, 135);
        doc.text(passwordText, 60, 135);
        
        doc.text(`Login Code:`, 20, 150);
        doc.text(sa.verification_code || 'N/A', 60, 150);
        
        // Box around code
        doc.setDrawColor(37, 99, 235);
        doc.rect(58, 144, 60, 9);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 113, 133); // gray-500
        doc.text("Keep this document secure. Provide it directly to the designated teacher/staff.", 20, 185);
        
        doc.save(`${sa.username}_credentials.pdf`);
    };

    const downloadStudentListPDF = () => {
        const doc = new jsPDF();
        
        doc.setFontSize(22);
        doc.setTextColor(30, 58, 138); 
        doc.text("Student Registration Credentials", 14, 22);
        
        doc.setFontSize(11);
        doc.setTextColor(100, 113, 133);
        doc.text(`Institution: ${institution?.institution_name || 'N/A'}`, 14, 30);
        doc.text("Distribute these specific verification codes to your students to allow them to register.", 14, 36);

        const tableColumn = ["Sub-Admin / Teacher Name", "Verification Code", "Department / Class"];
        const tableRows = [];

        subAdmins.forEach(sa => {
            const rowData = [
                sa.name,
                sa.verification_code || "N/A",
                sa.assigned_class_department
            ];
            tableRows.push(rowData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            styles: { fontSize: 11, cellPadding: 5 }
        });

        const safeName = institution?.institution_name ? institution.institution_name.replace(/\s+/g, '_') : 'Institution';
        doc.save(`${safeName}_Student_Codes.pdf`);
    };

    if (loading) return <div className="h-screen w-full flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-blue-600"/></div>;
    if (!institution) return <div className="h-screen w-full flex items-center justify-center bg-slate-50 flex-col"><h1 className="text-2xl font-bold text-slate-800">No institution linked.</h1></div>;

    return (
        <div className="h-screen w-full overflow-y-auto bg-slate-50 pb-20 font-sans relative">
            {/* Header */}
            <div className="bg-blue-900 text-white pt-10 pb-8 px-6 md:px-10 shadow-md border-b-4 border-blue-700">
                <div className="w-full max-w-[1700px] mx-auto flex flex-col md:flex-row md:items-end justify-between">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Institution Hub</h1>
                        <p className="text-blue-200 mt-2 text-lg font-medium">{institution.institution_name}</p>
                    </div>
                    <div className="mt-4 md:mt-0 flex items-center gap-4">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-500/20 text-green-300 border border-green-500/30 rounded-full text-sm font-semibold shadow-inner">
                            <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>
                            Verified Institution
                        </div>
                        <button onClick={() => window.location.href = '/'} className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white hover:bg-blue-700 border border-blue-500 rounded-full text-sm font-bold shadow transition-colors active:scale-95">
                            <Home className="w-4 h-4"/> Go to TeenGram
                        </button>
                        <button onClick={() => signOut({ callbackUrl: '/login' })} className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-600 text-white hover:bg-red-700 border border-red-500 rounded-full text-sm font-bold shadow transition-colors active:scale-95">
                            <LogOut className="w-4 h-4"/> Logout
                        </button>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-[1700px] mx-auto px-4 md:px-10 mt-8 mb-16">
                <div className="grid md:grid-cols-3 xl:grid-cols-4 gap-8">
                    
                    {/* Add SubAdmin Form */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 col-span-1 h-fit">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-blue-900 border-b border-gray-100 pb-3">
                            <UserPlus className="w-5 h-5 text-blue-500"/> Add Sub-Admin
                        </h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="text-sm font-bold text-slate-700">Full Name</label>
                                <input required className="w-full border border-gray-200 p-2.5 rounded-lg mt-1.5 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors placeholder-slate-400" value={newSubAdmin.name} onChange={e=>setNewSubAdmin({...newSubAdmin, name: e.target.value})} placeholder="e.g. John Doe"/>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700">Username</label>
                                <div className="relative mt-1.5 flex items-center">
                                    <span className="absolute left-3 text-gray-400 font-medium">@</span>
                                    <input required className="w-full border border-gray-200 p-2.5 pl-8 rounded-lg text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors placeholder-slate-400" value={newSubAdmin.username} onChange={e=>setNewSubAdmin({...newSubAdmin, username: e.target.value})} placeholder="username"/>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700">Email Address</label>
                                <input required type="email" className="w-full border border-gray-200 p-2.5 rounded-lg mt-1.5 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors placeholder-slate-400" value={newSubAdmin.email} onChange={e=>setNewSubAdmin({...newSubAdmin, email: e.target.value})} placeholder="e.g. teacher@school.edu"/>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700">Password</label>
                                <input required type="password" className="w-full border border-gray-200 p-2.5 rounded-lg mt-1.5 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors placeholder-slate-400" value={newSubAdmin.password} onChange={e=>setNewSubAdmin({...newSubAdmin, password: e.target.value})} placeholder="Create a secure password"/>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700">Class / Department</label>
                                <input required placeholder="e.g. Class 10A / CS Dept" className="w-full border border-gray-200 p-2.5 rounded-lg mt-1.5 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors placeholder-slate-400" value={newSubAdmin.assigned_class_department} onChange={e=>setNewSubAdmin({...newSubAdmin, assigned_class_department: e.target.value})}/>
                            </div>
                            <button type="submit" disabled={creating} className="w-full bg-blue-600 text-white font-bold py-3 mt-4 rounded-xl shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:bg-blue-700 transition flex justify-center items-center gap-2 disabled:opacity-70">
                                {creating ? <Loader2 className="w-5 h-5 animate-spin"/> : <UserPlus className="w-5 h-5"/>}
                                {creating ? 'Creating...' : 'Create Sub-Admin'}
                            </button>
                        </form>
                    </div>

                    {/* SubAdmins List */}
                    <div className="col-span-1 md:col-span-2 xl:col-span-3">
                        <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 h-full overflow-hidden">
                            <h2 className="text-xl font-bold mb-6 text-blue-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                                <span className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><UserPlus className="w-4 h-4"/></span> 
                                Active Sub-Admins
                            </h2>
                            <div className="overflow-x-auto pb-4">
                                <table className="w-full text-left border-collapse min-w-[700px]">
                                    <thead className="bg-slate-50 text-slate-600 text-sm uppercase tracking-wider">
                                        <tr>
                                            <th className="p-4 rounded-tl-xl font-semibold">Name & Username</th>
                                            <th className="p-4 font-semibold">Department</th>
                                            <th className="p-4 font-semibold">Verification Code</th>
                                            <th className="p-4 font-semibold text-center">Verified Users</th>
                                            <th className="p-4 font-semibold text-center">Credentials</th>
                                            <th className="p-4 text-center rounded-tr-xl font-semibold">Manage</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {subAdmins.map(sa => (
                                            <tr key={sa._id} className="border-b border-gray-50 hover:bg-blue-50/50 transition-colors group">
                                                <td className="p-4">
                                                    <div className="font-bold text-slate-800">{sa.name}</div>
                                                    <div className="text-xs text-blue-600 font-medium mt-0.5">@{sa.username}</div>
                                                    <div className="text-xs text-slate-500 mt-0.5">{sa.user?.email}</div>
                                                </td>
                                                <td className="p-4 text-slate-600 font-medium">{sa.assigned_class_department}</td>
                                                <td className="p-4">
                                                    <code className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-md font-mono font-bold tracking-wider shadow-sm">{sa.verification_code}</code>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <span className="font-bold text-slate-800 text-lg">{sa.verified_users_count || 0}</span>
                                                        <button onClick={() => handleShowVerified(sa)} className="text-xs mt-1 text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition-colors flex items-center gap-1">
                                                            Details <ChevronRight className="w-3 h-3"/>
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button onClick={() => downloadPDF(sa)} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 shadow-sm transition flex items-center justify-center gap-2 mx-auto">
                                                        <Download className="w-4 h-4"/> PDF
                                                    </button>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={()=>setSelectedEdit(sa)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2.5 rounded-lg cursor-pointer transition" title="Edit Sub-Admin">
                                                            <Edit2 className="w-5 h-5"/>
                                                        </button>
                                                        <button onClick={()=>handleDelete(sa._id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2.5 rounded-lg cursor-pointer transition opacity-70 group-hover:opacity-100 focus:opacity-100" title="Remove Sub-Admin">
                                                            <Trash2 className="w-5 h-5"/>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {subAdmins.length === 0 && (
                                    <div className="p-12 text-center text-slate-500 bg-slate-50/50 rounded-b-xl border border-dashed border-gray-200 mt-4 mx-2">
                                        <UserPlus className="w-12 h-12 text-slate-300 mx-auto mb-3"/>
                                        <p className="font-medium text-lg text-slate-600">No Sub-Admins yet</p>
                                        <p className="text-sm mt-1">Use the form to create accounts for your teachers.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* VERIFIED USERS MODAL */}
            <AnimatePresence>
                {viewVerifiedSubAdmin && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white max-w-2xl w-full rounded-2xl shadow-xl overflow-hidden border border-slate-200 flex flex-col max-h-[80vh]">
                            <div className="bg-blue-900 px-6 py-5 flex justify-between items-center text-white shrink-0">
                                <div>
                                    <h3 className="font-bold text-xl flex items-center gap-2"><Users className="w-5 h-5 opacity-80"/> Verified Users</h3>
                                    <p className="text-blue-200 text-sm mt-1">Verified by Sub-Admin: <span className="text-white font-semibold">{viewVerifiedSubAdmin.name}</span></p>
                                </div>
                                <button onClick={() => setViewVerifiedSubAdmin(null)} className="text-blue-200 hover:text-white bg-blue-800/50 hover:bg-blue-700 p-2 rounded-full transition"><X className="w-6 h-6"/></button>
                            </div>
                            
                            <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                                {loadingVerified ? (
                                    <div className="flex flex-col items-center justify-center py-12">
                                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3"/>
                                        <p className="text-slate-500 font-medium">Loading users...</p>
                                    </div>
                                ) : verifiedUsersList.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
                                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3"/>
                                        <p className="font-semibold text-lg text-slate-700">No users verified yet</p>
                                        <p className="text-sm text-slate-500 mt-1">This sub-admin hasn't verified any students.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {verifiedUsersList.map((vu, idx) => (
                                            <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                                                        {vu.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800">{vu.name}</h4>
                                                        <p className="text-xs text-slate-500">{vu.email}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">@{vu.username}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* EDIT MODAL */}
            <AnimatePresence>
                {selectedEdit && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white max-w-lg w-full rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                            <div className="bg-blue-900 px-6 py-4 flex justify-between items-center">
                                <h3 className="text-white font-bold text-lg flex items-center gap-2"><Edit2 className="w-5 h-5 opacity-70"/> Edit Sub-Admin</h3>
                                <button onClick={() => setSelectedEdit(null)} className="text-blue-200 hover:text-white transition"><X className="w-6 h-6"/></button>
                            </div>
                            <form onSubmit={handleEditSave} className="p-6 space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-slate-700">Full Name</label>
                                    <input required className="w-full border border-gray-200 p-2.5 rounded-lg mt-1.5 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors" value={selectedEdit.name} onChange={e=>setSelectedEdit({...selectedEdit, name: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700">Username</label>
                                    <div className="relative mt-1.5 flex items-center">
                                        <span className="absolute left-3 text-gray-400 font-medium">@</span>
                                        <input required className="w-full border border-gray-200 p-2.5 pl-8 rounded-lg text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors" value={selectedEdit.username} onChange={e=>setSelectedEdit({...selectedEdit, username: e.target.value})}/>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700">Email Address</label>
                                    <input required type="email" className="w-full border border-gray-200 p-2.5 rounded-lg mt-1.5 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors" value={selectedEdit.email || selectedEdit.user?.email} onChange={e=>setSelectedEdit({...selectedEdit, email: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700">Department</label>
                                    <input required className="w-full border border-gray-200 p-2.5 rounded-lg mt-1.5 text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors" value={selectedEdit.assigned_class_department} onChange={e=>setSelectedEdit({...selectedEdit, assigned_class_department: e.target.value})}/>
                                </div>
                                <div className="mt-6 pt-4 border-t border-slate-100">
                                    <label className="text-sm font-bold text-slate-700 block text-blue-600 mb-1">Reset Password (Optional)</label>
                                    <p className="text-xs text-slate-500 mb-2">Leave blank if you do not want to change the password.</p>
                                    <input type="password" placeholder="Enter new password to reset" className="w-full border border-gray-200 p-2.5 rounded-lg text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors" value={selectedEdit.password || ''} onChange={e=>setSelectedEdit({...selectedEdit, password: e.target.value})}/>
                                </div>
                                <div className="pt-4 flex justify-end gap-3 mt-4">
                                    <button type="button" onClick={() => setSelectedEdit(null)} className="px-5 py-2.5 rounded-lg text-slate-600 font-semibold hover:bg-slate-100 transition">Cancel</button>
                                    <button type="submit" disabled={creating} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold shadow hover:bg-blue-700 transition flex items-center justify-center gap-2">
                                        {creating ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>} Save Changes
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* CREDENTIAL FOR STUDENT BUTTON */}
            <button 
                onClick={downloadStudentListPDF}
                className="fixed bottom-8 right-8 z-40 bg-blue-600 hover:bg-blue-700 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgba(37,99,235,0.4)] px-6 py-4 rounded-full font-bold flex items-center justify-center gap-3 transition-all hover:-translate-y-1 active:scale-95"
            >
                <FileText className="w-6 h-6"/>
                Credential for Student
            </button>
        </div>
    );
};

export default AdminPanel;
