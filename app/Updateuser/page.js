"use client"
import React from 'react'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { updateProfile, fetchuser } from '@/actions/useractions'

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setform(prev => ({ ...prev, profilepic: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    // NOTE: e is FormData when using action prop
    // We need to pass the current username/email as the "oldusername" identifier
    // In the original code, it was passing form.email. 
    // We will ensure we pass the correct identifier expected by the backend.

    let a = await updateProfile(e, form.email)
    console.log("profile updated")
    router.push("/User")
  }

  return (
    <div>
      <div className='flex justify-center items-center bg-slate-600'>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <form action={handleSubmit} className="w-full max-w-md">
            <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Edit Profile</h2>

              {/* Profile Pic Upload */}
              <div className="flex flex-col items-center mb-4">
                <img
                  src={form.profilepic ? form.profilepic : "https://via.placeholder.com/100"}
                  alt="profilpic"
                  className="w-24 h-24 rounded-full object-cover mb-2"
                />

                {/* Hidden input to send the Base64 string with FormData */}
                <input type="hidden" name="profilepic" value={form.profilepic || ""} />

                <input
                  type="file"
                  accept="image/*"
                  className="text-sm text-gray-600"
                  onChange={handleFileChange}
                />
              </div>


              {/* Email */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  value={form.email ? form.email : ""}
                  readOnly
                  type="email"
                  name="email" id="email"
                  className="w-full border px-3 py-2 rounded-lg mt-1 bg-gray-100 text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                {/* Username */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <input
                    value={form.username ? form.username : ""}
                    onChange={handleChange}
                    type="text"
                    name="username" id="username"
                    className="w-full border px-3 py-2 rounded-lg mt-1 text-gray-900"
                  />
                </div>

                {/* Name */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700">Name as per the Institute idcard</label>
                  <input
                    className="w-full border px-3 py-2 rounded-lg mt-1 text-gray-900"
                    value={form.name ? form.name : ""}
                    onChange={handleChange}
                    type="text"
                    name="name" id="name"
                  />
                </div>

                {/* Bio */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700">Bio</label>
                  <input className="w-full border px-3 py-2 rounded-lg mt-1 text-gray-900"
                    value={form.bio ? form.bio : ""}
                    onChange={handleChange}
                    type="text"
                    name="bio" id="bio"
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700">Your Age</label>
                  <input className="w-full border px-3 py-2 rounded-lg mt-1 text-gray-900"
                    value={form.age ? form.age : ""}
                    onChange={handleChange}
                    type="text"
                    name="age" id="age"
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700">Institue Name</label>
                  <input className="w-full border px-3 py-2 rounded-lg mt-1 text-gray-900"
                    value={form.institute_name ? form.institute_name : ""}
                    onChange={handleChange}
                    type="text"
                    name="institute_name" id="institute_name"
                  />
                </div>

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700">Univeristy Name</label>
                  <input className="w-full border px-3 py-2 rounded-lg mt-1 text-gray-900"
                    value={form.university ? form.university : ""}
                    onChange={handleChange}
                    type="text"
                    name="university" id="university"
                  />
                </div>

              </div>{/* Buttons */}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => { router.push("/User") }}
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300"
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