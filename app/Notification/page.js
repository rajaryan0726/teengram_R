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
      <main className="flex-1 min-h-screen bg-gray-50 dark:bg-black pb-20 md:pb-8">
        <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-8">

        {/* FRIEND REQUESTS SECTION */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3 border-b pb-2">
            Friend Requests
          </h2>

          <div className="space-y-3">
            {request.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 shadow-sm">
                <p className="text-gray-400 font-medium">No new requests.</p>
              </div>
            ) : request.map((p, i) => (
              <div key={i} className="flex p-4 bg-white dark:bg-neutral-900 items-center justify-between gap-4 rounded-2xl border border-gray-100 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative w-12 h-12 lg:w-14 lg:h-14 rounded-full overflow-hidden border-2 border-white dark:border-neutral-800 shadow-sm flex-shrink-0">
                    <img
                      className="w-full h-full object-cover"
                      src={p.sender_profilepic || "/default-avatar.png"}
                      alt="Profile"
                    />
                  </div>
                  <div className="min-w-0">
                    <Link className='cursor-pointer hover:underline block' href={{
                      pathname: "/ViewFriends",
                      query: { friend_email: p.sender_email }
                    }}>
                      <span className="font-bold text-gray-900 dark:text-white truncate block">
                        {p.sender_username || p.sender_email.split('@')[0]}
                      </span>
                    </Link>
                    <p className="text-xs lg:text-sm text-gray-500 font-medium">wants to connect</p>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {p.request_accepted ? (
                    <span className="px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-bold rounded-full">Friends!</span>
                  ) : (
                    <button
                      onClick={() => acceptrequest(p._id)}
                      className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                      title="Accept Request"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>))}
          </div>
        </section>

        {/* NOTIFICATIONS SECTION (Merged Likes & Comments) */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3 border-b pb-2">
            Notifications
          </h2>

          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 shadow-sm">
                <p className="text-gray-400 font-medium">No new notifications.</p>
              </div>
            ) : notifications.map((n, i) => (
              <div key={i} className="flex p-4 bg-white dark:bg-neutral-900 items-start gap-4 rounded-2xl border border-gray-100 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow">
                <div className="relative flex-shrink-0">
                  <img
                    src={n.sender_profilepic || "/default-avatar.png"}
                    className="w-11 h-11 lg:w-12 lg:h-12 rounded-full object-cover border border-gray-100 dark:border-neutral-800 shadow-sm"
                    alt="avatar"
                  />
                  <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-white dark:border-neutral-900 shadow-sm ${n.type === 'like' ? 'bg-pink-500 text-white' : 'bg-indigo-500 text-white'}`}>
                    {n.type === 'like' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">
                    <span className="font-bold text-gray-900 dark:text-white">{n.sender_username || n.sender_email.split('@')[0]}</span> 
                    {" "}{n.type === 'like' ? 'liked your post' : 'commented on your post'}
                  </p>
                  {n.text && n.type === 'comment' && (
                    <div className="mt-1.5 p-2 bg-gray-50 dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700">
                      <p className="text-xs text-gray-600 dark:text-gray-400 italic truncate">"{n.text}"</p>
                    </div>
                  )}
                  <p className="text-[10px] font-medium text-gray-400 mt-2 uppercase tracking-wider">{new Date(n.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        </div>
      </main>
    </div>
  )
}

export default page