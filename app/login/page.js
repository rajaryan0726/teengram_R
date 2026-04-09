"use client"
import React, { useState, useEffect, Suspense } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link';

const LoginContent = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const errorMsg = searchParams.get('error');

  useEffect(() => {
    document.title = "Login - TeenGram"
    if (errorMsg === 'deleted') {
       alert("Your account no longer exists in our system. You have been logged out.");
    }
    if (session) {
      if (session?.user?.status === "deleted") {
         signOut({ redirect: false }).then(() => {
            router.push('/login');
         });
      } else if (session?.user?.status === "pending") {
         alert("Your account is not verified yet. Please complete registration and wait for approval.");
         // Note: the middleware prevents them from going to /feed.
      } else {
         if (session?.user?.role === "SUPER_ADMIN") router.push('/head-admin')
         else if (session?.user?.role === "ADMIN") router.push('/admin-panel')
         else if (session?.user?.role === "SUB_ADMIN") router.push('/sub-admin-panel')
         else router.push('/feed')
      }
    }
  }, [router, session, errorMsg])

  const handleTestingLogin = async (e) => {
    e.preventDefault();
    if (!username) return;
    setLoading(true);
    const res = await signIn("credentials", {
      username,
      password,
      code,
      redirect: false
    });
    
    if (res?.error) {
       if (res.error === "Verification Code Required") {
           setShowCodeInput(true);
       } else {
           alert(res.error || "Login failed");
       }
       setLoading(false);
    } else {
       router.push('/feed');
    }
  };

  return (
    <div>
      <div className="bg-black flex justify-center items-center h-screen">
        {/* <!-- Left: Image --> */}
        <div className="w-full h-screen hidden lg:block">
          <img src="/landing.png" alt="Teengram" className="object-cover w-full h-75%" />
        </div>
        {/* <!-- Right: Login Form --> */}
        <div className="lg:p-36 md:p-40 sm:p-20 p-6 w-full lg:w-1/2 shadow-lg">

          <h1 className="text-3xl lg:text-4xl text-slate-400 font-serif font-semibold mb-6 text-center lg:text-left">TeenGram</h1>
          <form onSubmit={handleTestingLogin}>
            <div className="mb-4">
              <label className="block text-gray-600">Username or Email</label>
              <input 
                type="text" 
                id="username" 
                name="username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="text-white w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:border-blue-500 bg-gray-900" 
                required
              />
            </div>
            {/* <!-- Password Input --> */}
            <div className="mb-4">
              <label className=" block text-gray-600">Password</label>
              <input 
                type="password" 
                id="password" 
                name="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-white w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:border-blue-500 bg-gray-900" 
              />
            </div>
            
            {showCodeInput && (
              <div className="mb-4 bg-blue-900/40 border border-blue-500 p-4 rounded-lg animate-pulse shadow-inner">
                <label className="block text-blue-300 font-bold mb-1">Verification Code Required (Sub-Admins Only)</label>
                <input 
                  type="text" 
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter your verification code"
                  className="text-white w-full border border-blue-500 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-900" 
                  required={showCodeInput}
                />
              </div>
            )}
            
            {/* <!-- Remember Me Checkbox --> */}
            <div className="mb-4 flex items-center">
              <input type="checkbox" id="remember" name="remember" className="text-blue-500" />
              <label className="text-gray-600 ml-2">Remember Me</label>
            </div>
            
            {/* <!-- Login Button --> */}
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold rounded-md py-2 px-4 w-full text-center block mb-4"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
            <div className="flex justify-between text-sm text-blue-500 mb-6">
                <Link href="/register" className="hover:underline">Register as User</Link>
                <Link href="/admin-setup" className="hover:underline">Admin Setup (Institutions)</Link>
            </div>
          </form>
          {/* <!-- Sign up  Link --> */}
          <div className="mt-2 flex flex-col items-center gap-3">
            
            <button
              className="w-full max-w-xs font-bold shadow-sm rounded-lg py-3 bg-white border border-gray-200 text-gray-800 flex items-center justify-center transition-all duration-300 ease-in-out focus:outline-none hover:bg-gray-50 cursor-pointer"
              onClick={() => signIn("google")}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign in with Google
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const Page = () => {
    return (
        <Suspense fallback={<div className="h-screen flex justify-center items-center">Loading...</div>}>
            <LoginContent />
        </Suspense>
    )
}

export default Page
