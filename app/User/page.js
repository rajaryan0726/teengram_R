"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Sidebar from '../Components/Sidebar'
import { fetchuser, find_following, fetchfriendrequest, upload_written_post } from '@/actions/useractions'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
const page = () => {
  const router = useRouter()
  const { data: session } = useSession()
  const [form, setform] = useState({})
  const [followers, setfollowers] = useState([])
  const [following, setfollowing] = useState([])

  const [post, setpost] = useState(false)
  const [seefollower, setseefollower] = useState(true);

  const [Written_form, setWritten_form] = useState({})//to store the content for a written post
  useEffect(() => {
    if (!session) {
      router.push("/login")
    }
    else {
      getdata()
    }
  }, [session])

  const getdata = async () => {
    let u = await fetchuser(session.user.email)
    setform(u)

    let follo = await find_following(session.user.email)
    setfollowing(follo);
    let folowing = await fetchfriendrequest(session.user.email)
    setfollowers(folowing)
  }

  const handleChange = (e) => {
    setWritten_form({ ...Written_form, [e.target.name]: e.target.value })
  }
  const handleSubmit = async (e) => {
    console.log(Written_form.user_id, Written_form.caption);
    let a = await upload_written_post(e, form._id, form.institute_name, form.university_name)
    if (a) {
      alert("post uploaded")
    }

  }

  return (
    <>
      <div className='flex'>
        <Sidebar className='flex-1' />
        <div className='flex flex-col w-full'>
          <div className="flex justify-center items-center max-w-4xl mx-auto px-4 py-6">
            {/* Profile Header */}
            <div className="flex items-center gap-10 border-2 
     rounded-xl m-2 p-4 
      border-emerald-500">
              {/* Avatar */}
              <div className='flex flex-col items-center justify-center gap-5'>
                <div className="flex flex-row w-32 h-32 rounded-full overflow-hidden border">
                  <img
                    src={form.profilepic}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                <Link href={{
                  pathname: "/verify",
                  query: { name: form.name, institute_name: form.institute_name }
                }}> <button className='cursor-pointer border-2 hover:bg-green-200 rounded-2xl m-auto p-2 flex items-center justify-center'>Verify Profile</button></Link>
              </div>

              {/* User Info */}
              <div className="flex-1">
                <div className="flex items-center gap-4">

                  <h2 className="text-2xl font-semibold">{form.username}</h2>
                  <Link href={{
                    pathname: "/Updateuser",
                    query: { username: form.email }
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
                    <b onClick={() => { setseefollower(true) }}>{followers.length}</b> followers
                  </span>
                  <span>
                    <b onClick={() => { setseefollower(false) }}>{following.length}</b> following
                  </span>
                </div>

                {/* Bio */}
                <div className="mt-4">
                  <p className="font-semibold">{form.name}</p>
                  <p className="text-sm">{form.bio}</p>
                </div>
              </div>
              <button onClick={() => { setpost(true) }}>Post Now!</button>
            </div>
          </div>


          {post ? <>
            <div className="max-w-2xl mx-auto my-5 bg-white rounded-lg shadow-xl p-8 border border-gray-200">
              <form action={handleSubmit} >
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Write to laugh, to learn, to understand, to share</h2>
                <div className="mb-6">
                  <label htmlFor="post-content" className="block text-gray-700 font-semibold mb-2">Post Content</label>
                  <textarea value={Written_form.content ? Written_form.content:""} onChange={handleChange}
                  type="text" name='content' 
                    id="content"
                    rows="6"
                    placeholder="What's on your mind? Share your thoughts with others let your thoughts shine!!!"
                    className="w-full px-4 py-3 text-gray-700 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
                    required
                  ></textarea>
                </div>

                <div className="mb-6">
                  <label htmlFor="caption" className="block text-gray-700 font-semibold mb-2">Caption</label>
                  <div className="relative flex items-stretch">
                    <input
                      type="text"
                      id="caption"
                      name="caption"
                      value={Written_form.caption?Written_form.caption:""}
                      onChange={handleChange}
                      placeholder="Add a caption, or generate one..."
                      className="flex-grow px-4 py-3 text-gray-700 bg-gray-100 rounded-lg rounded-r-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
                    />
                    <button
                      
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-r-lg transition-colors duration-200"
                      
                    >
                      Generate
                    </button>
                  </div>
                </div>

                <div className="text-center">
                  <button
                    type="submit"
                    className="w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-transform transform hover:scale-105 duration-300"
                  >
                    Post Content
                  </button>
                </div>
              </form>
            </div>

          </> :
            <div className='flex flex-row gap-20 w-full bg-amber-300'>
              <div className='w-1/2'>Your post will come here</div>
              {seefollower ? <div className='w-1/2'>Your foollower heheheheh</div> : <div className='w-1/2'>Your following will be here and when click on followe you will see follower</div>}

            </div>}
        </div>
      </div>

    </>

  )
}

export default page