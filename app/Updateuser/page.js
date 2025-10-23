"use client"
import React from 'react'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { updateProfile,fetchuser } from '@/actions/useractions'

const page = () => {
    const searchParams = useSearchParams()

    const router = useRouter()
    const { data: session, update } = useSession()
    const [form, setform] = useState({})

    useEffect(() => {
        if (!session) {
            router.push("/login")
        }
        const email = searchParams.get('email')
        // if (username) {
            getdata(email)
        //}
    }, [router, session])

    const getdata = async (email) => {
      console.log(email)
        // let u = await fetchuser(username)
        let u = await fetchuser(session.user.email)

        setform(u)
        console.log(u);
        
    }
    const handleChange = (e) => {
        setform({ ...form, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
      console.log("My username",form.email)
        let a = await updateProfile(e, form.email)
        console.log("profile updated")
        router.push("/User")
    }

    return (
       <div>
  <div className='flex justify-center items-center bg-slate-600'>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <form action={handleSubmit}>
        <div className="bg-white p-6 rounded-xl w-96 shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Edit Profile</h2>

          {/* Profile Pic Upload */}
          <div className="flex flex-col items-center mb-4">
            <img
              src={form.profilepic ? form.profilepic : "https://via.placeholder.com/100"}
              alt="profilpic"
              className="w-24 h-24 rounded-full object-cover mb-2"
            />
            <input
              type="file"
              accept="image/*"
              className="text-sm"
              // onChange={handleFileChange} (optional)
            />
          </div>

        
          {/* Email */}
          <div className="mb-3">
            <label className="block text-sm font-medium">Email</label>
            <input
            value={form.email?form.email:""}
              readOnly
              type="email"
              name="email" id="email"
              className="w-full border px-3 py-2 rounded-lg mt-1" 
            />
          </div>

<div>
          {/* Username */}
          <div className="mb-3">
            <label className="block text-sm font-medium">Username</label>
            <input
            value={form.username?form.username:""}
            onChange={handleChange}
              type="text"
              name="username" id="username"
              className="w-full border px-3 py-2 rounded-lg mt-1" 
            />
          </div>

          {/* Name */}
          <div className="mb-3">
            <label className="block text-sm font-medium">Your Parent given Name</label>
            <input
              className="w-full border px-3 py-2 rounded-lg mt-1"
               value={form.name?form.name:""}
            onChange={handleChange}
              type="text"
              name="name" id="name"
            />
          </div>

          {/* Bio */}
          <div className="mb-3">
            <label className="block text-sm font-medium">Bio</label>
            <input className="w-full border px-3 py-2 rounded-lg mt-1"
            value={form.bio?form.bio:""}
            onChange={handleChange}
              type="text"
              name="bio" id="bio"
              rows="3"
              
            />          
</div>
          
        </div>{/* Buttons */}
          <div className="flex justify-end gap-3 mt-4">
            <button
             onClick={() => { router.push("/User") }}
              className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
            >
              Save
            </button>
          </div>
          </div>
      </form>
    </div>
  </div>
</div>

    )
}

export default page