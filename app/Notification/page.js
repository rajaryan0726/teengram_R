"use client"
import React from 'react'
import Sidebar from '../Components/Sidebar'
import { fetchfriendrequest, accept_request, fetchNotifications } from '@/actions/useractions'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const page = () => {

  const router = useRouter()
  const { data: session } = useSession();
  const [request, setrequest] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    if (!session) {
      router.push("/login")
    }
    else {
      getdata()
    }

  }, [session])

  const getdata = async () => {
    // Fetch Friend Requests
    let r = await fetchfriendrequest(session.user.email)
    setrequest(r);

    // Fetch Notifications (Likes/Comments)
    let n = await fetchNotifications(session.user.email)
    setNotifications(n);

    setLoading(false);
  }

  const acceptrequest = async (id) => {
    console.log("id is ", id);
    const r = await accept_request(id);
    // Optimistic update
    setrequest(prev => prev.map(req => req._id === id ? { ...req, request_accepted: true } : req));
  }

  if (loading) return <div className="text-center p-10 text-white">Loading...</div>;

  return (
    <div className="flex">
      <Sidebar className="flex-1" />
      <div className="w-full mx-auto py-6 bg-slate-600 min-h-screen">

        {/* FRIEND REQUESTS SECTION */}
        <section className="mb-6 w-1/2 m-auto">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3 border-b pb-2">
            Friend Requests
          </h2>

          {request.length === 0 ? <p className="text-gray-300">No new requests.</p> : request.map((p, i) => (
            <div key={i} className="flex px-3 py-2 bg-white dark:bg-gray-800 items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 my-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white">
                  <img
                    className="w-full h-full object-cover"
                    src={p.sender_profilepic}
                    alt="Profile"
                  />
                </div>
                <div>
                  <Link className='cursor-pointer hover:underline' href={{
                    pathname: "/ViewFriends",
                    query: { friend_email: p.sender_email }
                  }}>
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      {p.sender_username || p.sender_email.split('@')[0]}
                    </span>
                  </Link>
                  <p className="text-sm text-gray-500">wants to connect</p>
                </div>
              </div>

              <div className="flex gap-2">
                {p.request_accepted ? (
                  <span className="text-green-500 text-sm font-bold">Friends!</span>
                ) : (
                  <>
                    <button
                      onClick={() => acceptrequest(p._id)}
                      className="p-1.5 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
                      title="Accept"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {/* Reject button logic could be added here */}
                  </>
                )}
              </div>
            </div>))}
        </section>

        {/* NOTIFICATIONS SECTION (Merged Likes & Comments) */}
        <section className="mb-6 w-1/2 m-auto">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3 border-b pb-2">
            Notifications
          </h2>

          {notifications.length === 0 ? <p className="text-gray-300">No new notifications.</p> : notifications.map((n, i) => (
            <div key={i} className="flex px-3 py-3 bg-white dark:bg-gray-800 items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 my-3 shadow-sm">
              {/* Icon based on type */}
              <div className="relative">
                <img
                  src={n.sender_profilepic}
                  className="w-10 h-10 rounded-full object-cover border border-gray-200"
                  alt="avatar"
                />
                <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border border-white ${n.type === 'like' ? 'bg-pink-100 text-pink-500' : 'bg-blue-100 text-blue-500'}`}>
                  {n.type === 'like' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  <span className="font-bold">{n.sender_username || n.sender_email.split('@')[0]}</span> {n.type === 'like' ? 'liked your post' : 'commented on your post'}
                </p>
                {n.text && n.type === 'comment' && (
                  <p className="text-xs text-gray-500 italic mt-0.5 is-truncated">"{n.text}"</p>
                )}
                <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </section>

      </div>
    </div>
  )
}

export default page