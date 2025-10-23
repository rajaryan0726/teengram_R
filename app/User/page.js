"use client"
import React, { useState,useEffect } from 'react'
import Link from 'next/link'
import Sidebar from '../Components/Sidebar'
import { fetchuser } from '@/actions/useractions'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
const page = () => {
    const router=useRouter()
    const {data:session}=useSession()
    const [form, setform] = useState({})
    
    useEffect(() => {
    if(!session){
      router.push("/login")
    }
    else{
      getdata()
    }
    }, [session])
    
    const getdata=async () => {
        let u=await fetchuser(session.user.email)
        setform(u)
        console.log(u);
        
    }

  return (
    <div className='flex'>
        <Sidebar className='flex-1'/>
         <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Profile Header */}
      <div className="flex items-center gap-10 border-2 
     rounded-xl m-2 p-4 
      border-emerald-500">
        {/* Avatar */}
        <div className="w-32 h-32 rounded-full overflow-hidden border">
          <img
            src={form.profilepic}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>

        {/* User Info */}
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-semibold">{form.username}</h2>
           <Link href={{
            pathname:"/Updateuser",
            query:{username:form.email}
           }}> <button
              
              className="px-4 py-1 text-sm border rounded-lg hover:bg-gray-100"
            >
              Edit Profile
            </button></Link>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-4">
            <span>
              <b>coming</b> posts
            </span>
            <span>
              <b>coming</b> followers
            </span>
            <span>
              <b>coming</b> following
            </span>
          </div>

          {/* Bio */}
          <div className="mt-4">
            <p className="font-semibold">{form.name}</p>
            <p className="text-sm">{form.bio}</p>
          </div>
        </div>
      </div>
</div>
    </div>
  )
}

export default page