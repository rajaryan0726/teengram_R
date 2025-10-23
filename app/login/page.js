"use client"
import React from 'react'
import { useEffect } from 'react'
import { useSession,signIn,signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
const page = () => {
    const {data:session}=useSession()
    const router=useRouter();
    useEffect(() => {
      document.title="Login - TeenGram"
      if(session){
        router.push('/feed')
      }
    }, [router,session])    
  return (
    <div>
        <div className="bg-black flex justify-center items-center h-screen">
    {/* <!-- Left: Image --> */}
<div className="w-full h-screen hidden lg:block">
  <img src="/landing.png" alt="Teengram" className="object-cover w-full h-75%"/>
</div>
{/* <!-- Right: Login Form --> */}
<div className="lg:p-36 md:p-52 sm:20 p-8 w-full lg:w-1/2   shadow-lg">

  <h1 className="px-15 text-3xl text-slate-400 font-serif font-semibold mb-4">TeenGram</h1>
  <form action="#" method="POST">
    <div className="mb-4">
      <label  className="block text-gray-600">Username</label>
      <input type="text" id="username" name="username" className="text-white w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:border-blue-500" autocomplete="off"/>
    </div>
    {/* <!-- Password Input --> */}
    <div className="mb-4">
      <label  className=" block text-gray-600">Password</label>
      <input type="password" id="password" name="password" className="text-white w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:border-blue-500" autocomplete="off"/>
    </div>
    {/* <!-- Remember Me Checkbox --> */}
    <div className="mb-4 flex items-center">
      <input type="checkbox" id="remember" name="remember" className="text-blue-500"/>
      <label  className="text-gray-600 ml-2">Remember Me</label>
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
  <div className="mt-6 text-blue-500 text-center">
    <button className="w-full max-w-xs font-bold shadow-sm rounded-lg py-3 bg-indigo-100 text-gray-800 flex items-center justify-center transition-all duration-300 ease-in-out focus:outline-none hover:shadow focus:shadow-sm focus:shadow-outline cursor-pointer" onClick={() =>  signIn("github")}>Sign up Here</button>
  </div>
</div>
</div>
    </div>
  )
}

export default page