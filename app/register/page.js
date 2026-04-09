"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerUser, validateVerificationCode } from '@/actions/authActions';
import { Loader2, Upload, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const RegisterPage = () => {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [idCardFile, setIdCardFile] = useState(null);
    
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        state: '',
        academic_type: 'School', // School or College
        standard_class: '',
        course: '',
        year: '',
        email: '',
        username: '',
        password: '',
        teacher_name: '',
        verification_code: '',
        institute_name: '',
        university_name: '',
        id_card_url: '',
        id_card_file_id: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const nextStep = async () => {
        setError('');
        if (step === 1) {
            if (!formData.name || !formData.age || !formData.state) return setError("Please fill all fields");
        }
        if (step === 2) {
            if (formData.academic_type === 'School' && !formData.standard_class) return setError("Class required");
            if (formData.academic_type === 'College' && (!formData.course || !formData.year)) return setError("Course/Year required");
        }
        if (step === 3) {
            if (!formData.email || !formData.username || !formData.password) return setError("Account info required");
        }
        if (step === 4) {
            if (!formData.teacher_name) return setError("Class Teacher's name required.");
            if (!formData.verification_code) return setError("Verification code required to map you to an institution.");
            
            // Validate code via Server Action to fill Institute details BEFORE going to step 5
            setLoading(true);
            const res = await validateVerificationCode(formData.verification_code, formData.teacher_name);
            setLoading(false);
            if (!res.success) return setError(res.error);
            
            setFormData(prev => ({ ...prev, institute_name: res.institutionName }));
        }
        setStep(step + 1);
    };

    const prevStep = () => {
        setStep(step - 1);
        setError('');
    };
    
    // Quick local cloudinary upload. In prod, you'd probably upload via signed URL or server action.
    // Given the prompt allowed using Cloudinary, we'll do an unsigned upload from client for simplicity, 
    // or we could send Base64 to server to upload from server. We'll send Base64 to server in real, but since we don't
    // have a server action for pure upload, let's just assume we send Base64 to registerUser action which handles it?
    // Wait, Cloudinary unsigned works easily. Let's do unsigned client upload.
    const uploadToCloudinary = async (file) => {
        const data = new FormData();
        data.append('file', file);
        data.append('upload_preset', 'unsigned_preset'); // Must configure this in cloudinary
        // If unsigned preset is not available, we have to upload on server. 
        // For safe fallback, we'll just read as Base64 here, but send to an api route or server action if possible.
        // Let's implement reading file as Data URI since the spec originally mentioned uploading to Cloudinary
        // and base64 was previous approach. To avoid complexity without explicit endpoints, we can pass Base64
        // to a new server action or just use next-cloudinary.
        // Actually, we'll just mock the upload for now or assume signed upload. Let's use Base64 locally just to pass
        // to our server action, which we will modify to handle the cloudinary upload securely.
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result); // This is base64
            reader.onerror = error => reject(error);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            let base64Image = '';
            if (idCardFile) {
                base64Image = await uploadToCloudinary(idCardFile);
            } else {
                 setLoading(false);
                 return setError("ID Card is required.");
            }

            const submissionData = new FormData();
            for (const key in formData) {
                submissionData.append(key, formData[key]);
            }
            // Temporarily use the _url field to hold base64 payload to be processed on server
            submissionData.append('id_card_base64', base64Image); 
            // NOTE: We need to modify authActions to upload base64 to cloudinary

            const res = await registerUser(submissionData);
            
            if (res.success) {
                setSuccess(res.message);
                setTimeout(() => router.push('/login'), 4000);
            } else {
                setError(res.error);
            }
        } catch (err) {
            setError("Something went wrong during registration.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-full overflow-y-auto bg-gray-50">
            <div className="min-h-full flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 border-b pb-4">
                    Register for TeenGram
                </h2>
                
                {/* Stepper */}
                <div className="flex justify-between items-center mt-6 px-4">
                    {[1, 2, 3, 4, 5].map((item) => (
                        <div key={item} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= item ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                            {item}
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    
                    {error && <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
                    {success && <div className="mb-4 bg-green-50 text-green-600 p-3 rounded-lg text-sm">{success}</div>}

                    <form onSubmit={step === 5 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }}>
                        
                        <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                <h3 className="text-lg font-medium text-gray-900">Basic Details</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Full Name (As per ID)</label>
                                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="mt-1 block w-full text-gray-900 bg-white p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Age</label>
                                    <input type="number" name="age" value={formData.age} onChange={handleInputChange} className="mt-1 block w-full text-gray-900 bg-white p-2 border border-gray-300 rounded-md shadow-sm" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">State</label>
                                    <input type="text" name="state" value={formData.state} onChange={handleInputChange} className="mt-1 block w-full text-gray-900 bg-white p-2 border border-gray-300 rounded-md shadow-sm" required />
                                </div>
                                <div className="pt-4">
                                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Next</button>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                <h3 className="text-lg font-medium text-gray-900">Academic Info</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Current Level</label>
                                    <select name="academic_type" value={formData.academic_type} onChange={handleInputChange} className="mt-1 block w-full text-gray-900 bg-white p-2 border border-gray-300 rounded-md shadow-sm">
                                        <option value="School">School</option>
                                        <option value="College">College / University</option>
                                    </select>
                                </div>
                                
                                {formData.academic_type === 'School' ? (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Standard / Class</label>
                                        <input type="text" name="standard_class" value={formData.standard_class} onChange={handleInputChange} placeholder="e.g. 10th, 12th" className="mt-1 block w-full text-gray-900 bg-white p-2 border border-gray-300 rounded-md shadow-sm" required />
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Course</label>
                                            <input type="text" name="course" value={formData.course} onChange={handleInputChange} placeholder="e.g. B.Tech CS, BSC" className="mt-1 block w-full text-gray-900 bg-white p-2 border border-gray-300 rounded-md shadow-sm" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Year</label>
                                            <input type="text" name="year" value={formData.year} onChange={handleInputChange} placeholder="e.g. 1st Year, 2nd Year" className="mt-1 block w-full text-gray-900 bg-white p-2 border border-gray-300 rounded-md shadow-sm" required />
                                        </div>
                                    </>
                                )}
                                <div className="pt-4 flex gap-2">
                                    <button type="button" onClick={prevStep} className="w-full bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300">Back</button>
                                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Next</button>
                                </div>
                            </motion.div>
                        )}
                        
                        {step === 3 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                <h3 className="text-lg font-medium text-gray-900">Account Credentials</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email</label>
                                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="mt-1 block w-full text-gray-900 bg-white p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Username</label>
                                    <input type="text" name="username" value={formData.username} onChange={handleInputChange} className="mt-1 block w-full text-gray-900 bg-white p-2 border border-gray-300 rounded-md shadow-sm" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Password</label>
                                    <input type="password" name="password" value={formData.password} onChange={handleInputChange} className="mt-1 block w-full text-gray-900 bg-white p-2 border border-gray-300 rounded-md shadow-sm" required />
                                </div>
                                <div className="pt-4 flex gap-2">
                                    <button type="button" onClick={prevStep} className="w-full bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300">Back</button>
                                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Next</button>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                <h3 className="text-lg font-medium text-gray-900">Institution Verification</h3>
                                <p className="text-sm text-gray-500">To securely register, you must identify your assigned Teacher and supply their unique Verification Code.</p>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Class Teacher / Sub-Admin's Name</label>
                                    <input type="text" name="teacher_name" value={formData.teacher_name} placeholder="e.g. John Doe" onChange={handleInputChange} className="mt-1 block w-full text-gray-900 bg-white p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 font-semibold" required />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Verification Code</label>
                                    <input type="text" name="verification_code" value={formData.verification_code} placeholder="TG-SCH-XXXXXX" onChange={handleInputChange} className="mt-1 block w-full text-gray-900 bg-white p-3 font-mono text-center tracking-widest text-lg border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 uppercase" required />
                                </div>
                                
                                <div className="pt-4 flex gap-2">
                                    <button type="button" onClick={prevStep} className="w-full bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300">Back</button>
                                    <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center">
                                       {loading ? <Loader2 className="animate-spin w-5 h-5"/> : 'Verify Code & Next'}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 5 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 text-center">
                                <h3 className="text-lg font-medium text-gray-900">Upload ID Card</h3>
                                <p className="text-sm text-gray-500">Uploading your current student ID card is mandatory for manual verification by your institution.</p>
                                
                                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-blue-500 transition relative">
                                    {idCardFile ? (
                                        <>
                                            <img src={URL.createObjectURL(idCardFile)} className="w-32 h-32 object-contain rounded-lg mb-2" />
                                            <span className="text-sm text-green-600 flex items-center font-medium"><CheckCircle className="w-4 h-4 mr-1"/> Selected</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-10 h-10 text-blue-500 mb-2"/>
                                            <span className="text-sm text-gray-500">Tap to upload picture</span>
                                        </>
                                    )}
                                    <input type="file" accept="image/*" onChange={(e)=>{if(e.target.files[0]) setIdCardFile(e.target.files[0])}} className="hidden" />
                                </label>

                                <div className="pt-4 flex gap-2">
                                    <button type="button" onClick={prevStep} disabled={loading} className="w-full bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300">Back</button>
                                    <button type="submit" disabled={loading || !idCardFile} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center">
                                       {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2"/> : ''} {loading ? 'Submitting...' : 'Register Account'}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                        </AnimatePresence>

                    </form>
                </div>
            </div>
            </div>
        </div>
    );
};

export default RegisterPage;
