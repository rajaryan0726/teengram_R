"use client";
import React, { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { registerInstitution, getAdminInstitution } from '@/actions/adminActions';
import { Loader2, Upload, FileText, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const AdminSetupPage = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const [files, setFiles] = useState({});
    
    const [formData, setFormData] = useState({
        institution_name: '',
        institution_type: 'School',
        year_of_establishment: '',
        affiliation_board_university: '',
        institution_registration_number: '',
        official_website_url: '',
        line1: '', line2: '', city: '', state: '', country: '', pincode: '',
        official_email: '', contact_number: '', landline_number: '',
        rep_name: '', rep_designation: '', rep_email: '', rep_contact: '', rep_employee_id: ''
    });

    useEffect(() => {
        // If they bypass auth, make them sign in Google first for their admin_email
        if (status === "unauthenticated" && step > 1) {
             setStep(1);
        }

        if (status === "authenticated" && session?.user?.id) {
            checkExisting();
        }
    }, [status, session]);

    const checkExisting = async () => {
        try {
            const inst = await getAdminInstitution(session.user.id);
            if (inst) {
                if (inst.status === 'verified') {
                    router.push('/admin-panel');
                } else if (inst.status === 'pending') {
                    setSuccessMsg('Your institution registration is currently pending verification.');
                    setStep(5);
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    
    const handleFileChange = (e) => {
        if(e.target.files[0]) {
            setFiles(prev => ({ ...prev, [e.target.name]: e.target.files[0] }));
        }
    };
    
    // Quick local base64 reader to send to server
    const getBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve({ name: file.name, type: file.type, data: reader.result });
            reader.onerror = error => reject(error);
        });
    };

    const submitForm = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');
        
        if (!files.mandatory_doc) {
             setLoading(false);
             return setErrorMsg("At least one mandatory document is required.");
        }

        try {
            // Process files to Base64
            const mandatory = await getBase64(files.mandatory_doc);
            const supporting = files.supporting_doc ? [await getBase64(files.supporting_doc)] : [];
            
            // Build payload
            const payload = {
                institution_name: formData.institution_name,
                institution_type: formData.institution_type,
                year_of_establishment: formData.year_of_establishment,
                affiliation_board_university: formData.affiliation_board_university,
                institution_registration_number: formData.institution_registration_number,
                official_website_url: formData.official_website_url,
                address: {
                    line1: formData.line1, line2: formData.line2, city: formData.city, 
                    state: formData.state, country: formData.country, pincode: formData.pincode
                },
                contact: {
                    official_email: formData.official_email, 
                    contact_number: formData.contact_number, 
                    landline_number: formData.landline_number
                },
                representative: {
                    name: formData.rep_name, designation: formData.rep_designation,
                    email: formData.rep_email, contact: formData.rep_contact, employee_id: formData.rep_employee_id
                },
                mandatory_documents: [mandatory],
                supporting_documents: supporting
            };
            
            // We pass the base64 data to server action where we will upload to cloudinary
            // Note: need to update adminActions slightly to handle this uploading
            // Wait, we can pass as JSON if we do it cleanly
            
            const res = await registerInstitution(payload, session.user.email);
            
            if (res.success) {
                setSuccessMsg(res.message);
                setStep(5); // Success step
                // router.push('/login?message=Registration%20Submitted')
            } else {
                setErrorMsg(res.error);
            }
        } catch (err) {
            setErrorMsg("Failed to submit registration. " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-full overflow-y-auto bg-slate-50 font-sans text-gray-800">
            <div className="min-h-full flex justify-center py-12 px-4">
                <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col">
                
                {/* Header */}
                <div className="bg-slate-900 text-white p-6 md:p-10 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Institution Registry</h1>
                        <p className="text-slate-400 mt-2 text-sm">Official onboarding portal for Schools, Colleges & Universities.</p>
                    </div>
                    <div className="hidden md:flex gap-1 h-2 w-32 bg-slate-800 rounded-full overflow-hidden">
                        {[1,2,3,4].map(i => (
                            <div key={i} className={`flex-1 ${step >= i ? 'bg-blue-500' : 'bg-transparent'}`} />
                        ))}
                    </div>
                </div>

                <div className="p-6 md:p-10 flex-1 flex flex-col">
                    {errorMsg && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-100">{errorMsg}</div>}
                    
                    {/* STEP 1: AUTH */}
                    {step === 1 && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-10">
                            <h2 className="text-xl font-bold">Admin Authentication required</h2>
                            <p className="text-gray-500 max-w-sm">To register an institution, you must authenticate using your official or secure email address via Google.</p>
                            
                            {status === "authenticated" ? (
                                <button onClick={() => setStep(2)} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 shadow-md transition-transform active:scale-95">
                                    Register for Admin Panel 
                                </button>
                            ) : (
                                <button onClick={() => signIn("google")} className="flex items-center gap-3 px-6 py-3 rounded-lg bg-white shadow border border-gray-200 hover:bg-gray-50 font-semibold cursor-pointer">
                                    <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                    Authenticate via Google
                                </button>
                            )}
                        </div>
                    )}

                    {/* Form rendering */}
                    {step > 1 && step < 5 && (
                        <form onSubmit={(e) => { e.preventDefault(); if(step < 4) setStep(step+1); else submitForm(e); }} className="flex-1 flex flex-col">
                            
                            {/* STEP 2: Basic & Address */}
                            {step === 2 && (
                            <div className="space-y-6 block">
                                <h3 className="text-lg font-bold border-b pb-2">Institution Basic Info</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="text-sm font-semibold text-gray-600 block mb-1">Institution Name *</label><input required className="w-full border border-gray-300 rounded p-2" name="institution_name" value={formData.institution_name} onChange={handleChange} /></div>
                                    <div><label className="text-sm font-semibold text-gray-600 block mb-1">Type *</label><select className="w-full border border-gray-300 rounded p-2" name="institution_type" value={formData.institution_type} onChange={handleChange}><option>School</option><option>College</option><option>University</option><option>Coaching</option></select></div>
                                    <div><label className="text-sm font-semibold text-gray-600 block mb-1">Year of Estab.</label><input type="number" className="w-full border border-gray-300 rounded p-2" name="year_of_establishment" value={formData.year_of_establishment} onChange={handleChange} /></div>
                                    <div><label className="text-sm font-semibold text-gray-600 block mb-1">Affiliation / Board</label><input className="w-full border border-gray-300 rounded p-2" name="affiliation_board_university" value={formData.affiliation_board_university} onChange={handleChange} /></div>
                                    <div><label className="text-sm font-semibold text-gray-600 block mb-1">Reg. Number</label><input className="w-full border border-gray-300 rounded p-2" name="institution_registration_number" value={formData.institution_registration_number} onChange={handleChange} /></div>
                                    <div><label className="text-sm font-semibold text-gray-600 block mb-1">Website URL</label><input type="url" className="w-full border border-gray-300 rounded p-2" name="official_website_url" value={formData.official_website_url} onChange={handleChange} /></div>
                                </div>
                                <h3 className="text-lg font-bold border-b pb-2 pt-4">Full Address</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2"><label className="text-sm font-semibold text-gray-600 block mb-1">Line 1 *</label><input required className="w-full border border-gray-300 rounded p-2" name="line1" value={formData.line1} onChange={handleChange} /></div>
                                    <div><label className="text-sm font-semibold text-gray-600 block mb-1">City *</label><input required className="w-full border border-gray-300 rounded p-2" name="city" value={formData.city} onChange={handleChange} /></div>
                                    <div><label className="text-sm font-semibold text-gray-600 block mb-1">State *</label><input required className="w-full border border-gray-300 rounded p-2" name="state" value={formData.state} onChange={handleChange} /></div>
                                    <div><label className="text-sm font-semibold text-gray-600 block mb-1">Country *</label><input required className="w-full border border-gray-300 rounded p-2" name="country" value={formData.country} onChange={handleChange} /></div>
                                    <div><label className="text-sm font-semibold text-gray-600 block mb-1">Pincode *</label><input required className="w-full border border-gray-300 rounded p-2" name="pincode" value={formData.pincode} onChange={handleChange} /></div>
                                </div>
                            </div>
                            )}
                            
                            {/* STEP 3: Contacts & Rep */}
                            {step === 3 && (
                            <div className="space-y-6 block">
                                <h3 className="text-lg font-bold border-b pb-2">Institution Contact</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2"><label className="text-sm font-semibold text-gray-600 block mb-1">Official Email *</label><input type="email" required className="w-full border border-gray-300 rounded p-2" name="official_email" value={formData.official_email} onChange={handleChange} /></div>
                                    <div><label className="text-sm font-semibold text-gray-600 block mb-1">Contact Number *</label><input required className="w-full border border-gray-300 rounded p-2" name="contact_number" value={formData.contact_number} onChange={handleChange} /></div>
                                    <div><label className="text-sm font-semibold text-gray-600 block mb-1">Landline (Optional)</label><input className="w-full border border-gray-300 rounded p-2" name="landline_number" value={formData.landline_number} onChange={handleChange} /></div>
                                </div>
                                
                                <h3 className="text-lg font-bold border-b pb-2 mt-6">Authorized Representative Details</h3>
                                <p className="text-sm text-gray-500 mb-4">You will be designated as the primary ADMIN for this institution.</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="text-sm font-semibold text-gray-600 block mb-1">Full Name *</label><input required className="w-full border border-gray-300 rounded p-2" name="rep_name" value={formData.rep_name} onChange={handleChange} /></div>
                                    <div><label className="text-sm font-semibold text-gray-600 block mb-1">Designation *</label><input required placeholder="Principal/Director/Admin" className="w-full border border-gray-300 rounded p-2" name="rep_designation" value={formData.rep_designation} onChange={handleChange} /></div>
                                    <div><label className="text-sm font-semibold text-gray-600 block mb-1">Official Email *</label><input required type="email" className="w-full border border-gray-300 rounded p-2" name="rep_email" value={formData.rep_email} onChange={handleChange} /></div>
                                    <div><label className="text-sm font-semibold text-gray-600 block mb-1">Contact No. *</label><input required className="w-full border border-gray-300 rounded p-2" name="rep_contact" value={formData.rep_contact} onChange={handleChange} /></div>
                                    <div className="md:col-span-2"><label className="text-sm font-semibold text-gray-600 block mb-1">Employee ID (Optional)</label><input className="w-full border border-gray-300 rounded p-2" name="rep_employee_id" value={formData.rep_employee_id} onChange={handleChange} /></div>
                                </div>
                            </div>
                            )}
                            
                            {/* STEP 4: Documents Upload */}
                            {step === 4 && (
                            <div className="space-y-6 block">
                                <h3 className="text-lg font-bold border-b pb-2 text-blue-600">Secure Document Upload</h3>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 mb-6">
                                    <strong>Mandatory Documents:</strong> Provide at least ONE of the following for verification.
                                    <ul className="list-disc ml-5 mt-2 text-slate-600 space-y-1">
                                        <li>Schools: CBSE/ICSE/State Board Cert. OR UDISE+ Doc</li>
                                        <li>Colleges: UGC Cert., AICTE Approval, AISHE Proof, or Univ. Affiliation</li>
                                    </ul>
                                </div>
                                
                                <div>
                                    <label className="text-sm font-bold text-gray-800 block mb-2">Mandatory Verification Document *</label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 flex flex-col items-center hover:bg-gray-100 transition relative">
                                        <div className="flex bg-white shadow-sm border border-gray-200 rounded-md p-1 px-3 w-full mb-3 overflow-hidden text-sm">
                                            {files.mandatory_doc ? files.mandatory_doc.name : 'No file selected (5-10 MB max, PDF/JPG/PNG)'}
                                        </div>
                                        <label className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded cursor-pointer flex items-center shadow">
                                            <Upload className="w-4 h-4 mr-2"/> Browse Files
                                            <input type="file" name="mandatory_doc" accept=".pdf,image/png,image/jpeg" onChange={handleFileChange} className="hidden" />
                                        </label>
                                    </div>
                                </div>
                                
                                <div className="mt-8">
                                    <label className="text-sm font-bold text-gray-800 block mb-2">Supporting Documents (Optional)</label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center">
                                        <div className="flex bg-gray-50 shadow-sm border border-gray-200 rounded-md p-1 px-3 w-full mb-3 overflow-hidden text-sm text-gray-500">
                                            {files.supporting_doc ? files.supporting_doc.name : 'e.g., NAAC Certificate, Tax proofs'}
                                        </div>
                                        <label className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-medium py-2 px-6 rounded cursor-pointer flex items-center shadow-sm">
                                            <Upload className="w-4 h-4 mr-2 text-gray-500"/> Select File
                                            <input type="file" name="supporting_doc" accept=".pdf,image/png,image/jpeg" onChange={handleFileChange} className="hidden" />
                                        </label>
                                    </div>
                                </div>
                            </div>
                            )}
                            
                            <div className="mt-auto pt-6 flex justify-between border-t border-gray-100 items-center">
                                {step > 2 ? <button type="button" onClick={()=>setStep(step-1)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition">Back</button> : <div/>}
                                
                                {step < 4 ? (
                                    <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium shadow hover:bg-blue-700 transition">Next Step</button>
                                ) : (
                                    <button type="submit" disabled={loading} className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-bold shadow-md hover:bg-green-700 disabled:opacity-50 flex items-center transition">
                                        {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin"/> : <FileText className="w-5 h-5 mr-2"/>} {loading ? 'Submitting...' : 'Submit Application'}
                                    </button>
                                )}
                            </div>
                        </form>
                    )}
                    
                    {step === 5 && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-12 space-y-6">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-green-500 bg-green-50 p-4 rounded-full">
                                <CheckCircle className="w-16 h-16"/>
                            </motion.div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Application Submitted!</h2>
                                <p className="text-gray-500 max-w-md mx-auto mt-2 leading-relaxed">
                                    {successMsg || "Your institution registration has been submitted successfully."} 
                                    <br/><br/>
                                    <strong>Verification will be completed within 12–24 hours.</strong> You will receive an email upon status change.
                                </p>
                            </div>
                            <button onClick={()=>router.push('/login')} className="mt-4 px-8 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-black transition">
                                Return to Login
                            </button>
                        </div>
                    )}
                </div>
            </div>
            </div>
        </div>
    );
};

export default AdminSetupPage;
