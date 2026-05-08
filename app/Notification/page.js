"use client"
import React from 'react'
import Sidebar from '../Components/Sidebar'
import { fetchfriendrequest, accept_request, fetchNotifications, markNotificationsRead, fetchuser } from '@/actions/useractions'
import { joinInvitedCommunity, acceptCommunityRequest, rejectCommunityRequest } from '@/actions/communityActions'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const Page = () => {

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

    // Mark all notifications as read so the green dot clears
    await markNotificationsRead(session.user.email);

    setLoading(false);
  }

  const acceptrequest = async (id) => {
    console.log("id is ", id);
    const r = await accept_request(id);
    // Optimistic update
    setrequest(prev => prev.map(req => req._id === id ? { ...req, request_accepted: true } : req));
  }

  const handleJoinInvite = async (communityId) => {
    let u = await fetchuser(session.user.email);
    await joinInvitedCommunity(u._id, communityId); 
    getdata();
    router.push(`/community/${communityId}`);
  };

  const handleAcceptJoinRequest = async (senderEmail, communityId) => {
    let u = await fetchuser(session.user.email);
    await acceptCommunityRequest(u._id, senderEmail, communityId);
    getdata();
  };
  
  const handleRejectJoinRequest = async (senderEmail, communityId) => {
    let u = await fetchuser(session.user.email);
    await rejectCommunityRequest(u._id, senderEmail, communityId);
    getdata();
  };

  if (loading) return <div className="text-center p-10 text-white">Loading...</div>;

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      <Sidebar className="flex-1" />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-8 relative z-10">
        <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-8 mt-12">

        {/* FRIEND REQUESTS SECTION */}
        <section className="mb-6">
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400 mb-6 drop-shadow-sm border-b border-white/20 pb-2">
            Friend Requests
          </h2>

          <div className="space-y-4">
            {request.length === 0 ? (
              <div className="p-8 text-center glass-panel rounded-3xl">
                <p className="text-slate-500 font-bold">No new requests.</p>
              </div>
            ) : request.map((p, i) => (
              <div key={i} className="flex p-4 glass-card items-center justify-between gap-4 rounded-2xl hover-3d transition-all">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative w-12 h-12 lg:w-14 lg:h-14 rounded-full overflow-hidden border border-white/50 shadow-sm flex-shrink-0">
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
                      <span className="font-bold text-slate-900 dark:text-white truncate block">
                        {p.sender_username || p.sender_email.split('@')[0]}
                      </span>
                    </Link>
                    <p className="text-xs lg:text-sm text-cyan-600 font-bold">wants to connect</p>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {p.request_accepted ? (
                    <span className="px-3 py-1 bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-bold rounded-full border border-green-500/30">Friends!</span>
                  ) : (
                    <button
                      onClick={() => acceptrequest(p._id)}
                      className="p-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl hover:shadow-lg transition-all shadow-md active:scale-95 hover-3d"
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
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400 mb-6 drop-shadow-sm border-b border-white/20 pb-2">
            Notifications
          </h2>

          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="p-8 text-center glass-panel rounded-3xl">
                <p className="text-slate-500 font-bold">No new notifications.</p>
              </div>
            ) : notifications.map((n, i) => (
              <div key={i} className="flex p-4 glass-card items-start gap-4 rounded-2xl hover-3d transition-all">
                <div className="relative flex-shrink-0">
                  <img
                    src={n.sender_profilepic || "/default-avatar.png"}
                    className="w-11 h-11 lg:w-12 lg:h-12 rounded-full object-cover border border-gray-100 dark:border-neutral-800 shadow-sm"
                    alt="avatar"
                  />
                  <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-white dark:border-neutral-900 shadow-sm ${n.type === 'like' ? 'bg-blue-500 text-white' : 'bg-blue-500 text-white'}`}>
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
                    {" "}
                    {n.type === 'like' && 'liked your post'}
                    {n.type === 'comment' && 'commented on your post'}
                    {n.type === 'community_invite' && `invited you to join community "${n.communityName}"`}
                    {n.type === 'community_join_request' && `requested to join your community "${n.communityName}"`}
                  </p>
                  
                  {n.text && n.type === 'comment' && (
                    <div className="mt-1.5 p-2 bg-gray-50 dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700">
                      <p className="text-xs text-gray-600 dark:text-gray-400 italic truncate">"{n.text}"</p>
                    </div>
                  )}

                  {/* Actions for Community Invites / Requests */}
                  {n.type === 'community_invite' && (
                      <div className="mt-3">
                          <button onClick={() => handleJoinInvite(n.communityId)} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
                              Join Community
                          </button>
                      </div>
                  )}

                  {n.type === 'community_join_request' && (
                      <div className="mt-3 flex gap-2">
                          <button onClick={() => handleAcceptJoinRequest(n.sender_email, n.communityId)} className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition">
                              Accept
                          </button>
                          <button onClick={() => handleRejectJoinRequest(n.sender_email, n.communityId)} className="px-4 py-1.5 bg-red-100 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-200 transition">
                              Reject
                          </button>
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

export default Page
