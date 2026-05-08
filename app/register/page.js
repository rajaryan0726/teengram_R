"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerUser } from '@/actions/authActions';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

const RegisterPage = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
        college_or_school_name: '',
        age: '',
        interests: '',
        about: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const submissionData = new FormData();
            for (const key in formData) {
                submissionData.append(key, formData[key]);
            }

            const res = await registerUser(submissionData);
            
            if (res.success) {
                setSuccess(res.message);
                setTimeout(() => router.push('/login'), 2000);
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
        <div className="min-h-screen flex bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 overflow-y-auto">
            <div className="max-w-md w-full m-auto space-y-8 bg-white p-8 rounded-xl shadow-md">
                <div>
                    <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900 border-b pb-4">
                        Register for TeenGram
                    </h2>
                </div>

                {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
                {success && <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm">{success}</div>}

                <form className="mt-8 space-y-4" onSubmit={handleSubmit} suppressHydrationWarning>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="mt-1 block w-full text-gray-900 bg-white p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Username</label>
                        <input type="text" name="username" value={formData.username} onChange={handleInputChange} className="mt-1 block w-full text-gray-900 bg-white p-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email Address</label>
                        <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="mt-1 block w-full text-gray-900 bg-white p-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input type="password" name="password" value={formData.password} onChange={handleInputChange} className="mt-1 block w-full text-gray-900 bg-white p-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">College or School Name</label>
                        <input type="text" name="college_or_school_name" value={formData.college_or_school_name} onChange={handleInputChange} className="mt-1 block w-full text-gray-900 bg-white p-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Age</label>
                        <input type="number" name="age" value={formData.age} onChange={handleInputChange} className="mt-1 block w-full text-gray-900 bg-white p-2 border border-gray-300 rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Interests (Optional)</label>
                        <input type="text" name="interests" value={formData.interests} onChange={handleInputChange} placeholder="e.g., Coding, Sports, Art" className="mt-1 block w-full text-gray-900 bg-white p-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Account Description / Bio (Optional)</label>
                        <textarea name="about" value={formData.about} onChange={handleInputChange} className="mt-1 block w-full text-gray-900 bg-white p-2 border border-gray-300 rounded-md" rows="3"></textarea>
                    </div>

                    <div className="pt-2">
                        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex justify-center items-center">
                            {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : null}
                            {loading ? 'Registering...' : 'Register Account'}
                        </button>
                    </div>
                </form>
                <div className="text-center mt-4">
                    <Link href="/login" className="text-sm text-blue-600 hover:underline">Already have an account? Login here</Link>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
