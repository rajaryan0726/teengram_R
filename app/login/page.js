"use client"
import React from 'react'
import { useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
const page = () => {
  const { data: session } = useSession()
  const router = useRouter();
  useEffect(() => {
    document.title = "Login - TeenGram"
    if (session) {
      router.push('/feed')
    }
  }, [router, session])
  return (
    <div>
      <div className="bg-black flex justify-center items-center h-screen">
        {/* <!-- Left: Image --> */}
        <div className="w-full h-screen hidden lg:block">
          <img src="/landing.png" alt="Teengram" className="object-cover w-full h-75%" />
        </div>
        {/* <!-- Right: Login Form --> */}
        <div className="lg:p-36 md:p-52 sm:20 p-8 w-full lg:w-1/2   shadow-lg">

          <h1 className="px-15 text-3xl text-slate-400 font-serif font-semibold mb-4">TeenGram</h1>
          <form action="#" method="POST">
            <div className="mb-4">
              <label className="block text-gray-600">Username</label>
              <input type="text" id="username" name="username" className="text-white w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:border-blue-500" />
            </div>
            {/* <!-- Password Input --> */}
            <div className="mb-4">
              <label className=" block text-gray-600">Password</label>
              <input type="password" id="password" name="password" className="text-white w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:border-blue-500" />
            </div>
            {/* <!-- Remember Me Checkbox --> */}
            <div className="mb-4 flex items-center">
              <input type="checkbox" id="remember" name="remember" className="text-blue-500" />
              <label className="text-gray-600 ml-2">Remember Me</label>
            </div>
            {/* <!-- Forgot Password Link --> */}
            <div className="mb-6 text-blue-500">
              <a href="#" className="hover:underline">Forgot Password?</a>
            </div>
            {/* <!-- Login Button --> */}
            <a
              href="http://localhost:5173/"
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-md py-2 px-4 w-full text-center block"
            >
              Login
            </a>
          </form>
          {/* <!-- Sign up  Link --> */}
          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              className="w-full max-w-xs font-bold shadow-sm rounded-lg py-3 bg-gray-800 text-white flex items-center justify-center transition-all duration-300 ease-in-out focus:outline-none hover:bg-gray-900 cursor-pointer"
              onClick={() => signIn("github")}
            >
              <span>Sign in with GitHub</span>
            </button>

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

export default page