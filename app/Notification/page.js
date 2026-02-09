"use client"
import React from 'react'
import Sidebar from '../Components/Sidebar'
import { fetchfriendrequest, accept_request } from '@/actions/useractions'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const page = () => {

  const router = useRouter()
  const { data: session } = useSession();
  const [request, setrequest] = useState([])
  const [response, setresponse] = useState(false)
  useEffect(() => {

    if (!session) {
      router.push("/login")
    }
    else {
      getdata()
    }

  }, [session])

  const getdata = async () => {
    console.log(session.user.email);

    let r = await fetchfriendrequest(session.user.email)
    setrequest(r);
    console.log("got all the notification");

  }

  const acceptrequest = async (id) => {
    console.log("id is ", id);
    const r = await accept_request(id);
    console.log(r.request_accepted);
    setresponse(true);

  }

  return (
    <div className='flex'>
      <Sidebar className="flex-1" />
      <div className="w-full mx-auto py-6 bg-slate-600">
        {/* FRIEND REQUESTS SECTION */}
        <section className="mb-6 w-1/2 m-auto">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3 border-b pb-2">
            Friend Requests
          </h2>

          {request.map((p, i) => (
            <div key={i} className="flex  items-center justify-center px-3 py-2 bg-white dark:bg-gray-800  gap-3 rounded-lg border border-gray-200 dark:border-gray-700 my-3 shadow-sm">
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-r from-purple-400 via-blue-500 to-red-400">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-gray-200 rounded-full border-2 border-white overflow-hidden">
                  <img
                    className="w-full h-full object-cover rounded-full"
                    src={p.sender_profilepic}
                    alt="Emma"
                  />
                </div>
              </div>
              <div className="flex-1">
                <Link className='cursor-pointer' href={{
                  pathname: "/ViewFriends",
                  query: { friend_email: p.sender_email }
                }}><span className="font-mono text-gray-700 dark:text-gray-300">
                    <span className="font-bold">{p.sender_username || p.sender_email.split('@')[0]}</span> would like to connect with you
                  </span>
                </Link>
              </div>
              <div className="flex gap-2">
                {/* Accept Button */}
                {p.request_accepted ? (
                  <h2 className="text-green-600 font-semibold animate-bounce">
                    You are friends
                  </h2>
                ) : (
                  <>
                    <button
                      onClick={() => acceptrequest(p._id)}
                      className="p-2 text-green-600 hover:text-green-800"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>

                    <button className="p-2 text-red-500 hover:text-red-700">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>))}


        </section>

        {/* POST LIKE SECTION */}
        <section className="mb-6 w-1/2 m-auto">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3 border-b pb-2">
            Post Likes
          </h2>

          <div className="flex justify-between px-3 py-2 bg-white dark:bg-gray-800 items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 my-3 shadow-sm">
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-r from-purple-400 via-blue-500 to-red-400">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-gray-200 rounded-full border-2 border-white overflow-hidden">
                <img
                  className="w-full h-full object-cover rounded-full"
                  src="https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=1170&q=80"
                  alt="Tom"
                />
              </div>
            </div>
            <div className="flex-1">
              <span className="font-mono text-gray-700 dark:text-gray-300">
                Tom liked one of your posts
              </span>
            </div>
            <div className="p-2 text-pink-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </section>

        {/* COMMENT NOTIFICATION SECTION */}
        <section className='w-1/2 m-auto'>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3 border-b pb-2">
            Comments
          </h2>

          <div className="flex justify-between px-3 py-2 bg-white dark:bg-gray-800 items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 my-3 shadow-sm">
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-r from-purple-400 via-blue-500 to-red-400">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-gray-200 rounded-full border-2 border-white overflow-hidden">
                <img
                  className="w-full h-full object-cover rounded-full"
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=687&q=80"
                  alt="Andrea"
                />
              </div>
            </div>
            <div className="flex-1">
              <span className="font-mono text-gray-700 dark:text-gray-300">
                Andrea commented on your post
              </span>
            </div>
            <div className="p-2 text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default page