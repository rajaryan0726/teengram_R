"use client"
import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '../Components/Sidebar'
import { useSession } from 'next-auth/react'
import {
  fetchuser,
  makefriend,
  accept_request,
  checkfriendstatus,
  checkuserrequeststatus,
  fetchFollowersAction,
  fetchFollowingAction,
  fetchpost
} from '@/actions/useractions'
import { motion } from 'framer-motion'
import { MessageCircle, UserPlus, UserCheck, Clock, Check } from 'lucide-react'

const ViewFriendsPage = () => {
  const { data: session } = useSession();
  const searchParams = useSearchParams()

  const [friend, setFriend] = useState(null)
  const [loading, setLoading] = useState(true)

  // Stats
  const [followers, setFollowers] = useState([])
  const [following, setFollowing] = useState([])
  const [posts, setPosts] = useState([])

  // Connection Status
  const [connectionStatus, setConnectionStatus] = useState('none') // 'none', 'pending_sent', 'pending_received', 'friends'
  const [requestId, setRequestId] = useState(null) // Needed for accepting requests

  useEffect(() => {
    const friendEmail = searchParams.get('friend_email')
    const userEmail = session?.user?.email || searchParams.get('user_email');

    if (friendEmail && userEmail) {
      loadProfileData(friendEmail, userEmail);
    }
  }, [session, searchParams])

  const loadProfileData = async (friendEmail, userEmail) => {
    try {
      setLoading(true);

      // 1. Fetch User Basics
      const f = await fetchuser(friendEmail);
      setFriend(f);

      if (f?._id) {
        // 2. Fetch Stats
        const [postsData, followersData, followingData] = await Promise.all([
          fetchpost(f._id),
          fetchFollowersAction(friendEmail),
          fetchFollowingAction(friendEmail)
        ]);

        setPosts(postsData || []);
        setFollowers(followersData || []);
        setFollowing(followingData || []);

        // 3. Determine Connection Status
        // A. Did I send a request?
        const myRequest = await checkfriendstatus(userEmail, friendEmail);

        // B. Did they send me a request?
        const theirRequest = await checkuserrequeststatus(userEmail, friendEmail);

        if (myRequest) {
          if (myRequest.request_accepted) setConnectionStatus('friends');
          else setConnectionStatus('pending_sent');
        } else if (theirRequest) {
          if (theirRequest.request_accepted) setConnectionStatus('friends');
          else {
            setConnectionStatus('pending_received');
            setRequestId(theirRequest._id);
          }
        } else {
          setConnectionStatus('none');
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleSendRequest = async () => {
    if (!session || !friend) return;
    try {
      setConnectionStatus('pending_sent'); // Optimistic
      await makefriend(session.user.email, friend.email, session.user.image);
    } catch (error) {
      console.error("Failed to send request", error);
      setConnectionStatus('none'); // Revert
    }
  }

  const handleAcceptRequest = async () => {
    if (!requestId) return;
    try {
      setConnectionStatus('friends'); // Optimistic
      await accept_request(requestId);
    } catch (error) {
      console.error("Failed to accept request", error);
      setConnectionStatus('pending_received'); // Revert
    }
  }

  if (loading) {
    return (
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar className="flex-1" />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
        </main>
      </div>
    )
  }

  if (!friend) {
    return (
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar className="flex-1" />
        <main className="flex-1 flex items-center justify-center text-gray-500">
          User not found.
        </main>
      </div>
    )
  }

  return (
    <div className="flex bg-gray-50 h-screen w-full overflow-hidden">
      <Sidebar className="flex-1" />

      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* --- Profile Header Card --- */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden relative border border-gray-100">
            {/* Background Banner */}
            <div className="h-40 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500"></div>

            <div className="px-8 pb-8">
              <div className="relative flex flex-col md:flex-row items-end -mt-16 mb-6 gap-6">

                {/* Avatar */}
                <div className="relative group">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
                    <img
                      src={friend.profilepic || "https://via.placeholder.com/150"}
                      alt="Profile"
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  {/* Verification Badge */}
                  {friend.verified && (
                    <div className="absolute bottom-2 right-2 bg-blue-500 text-white p-1 rounded-full border-2 border-white shadow-sm" title="Verified Student">
                      <Check size={16} strokeWidth={3} />
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 w-full md:w-auto text-center md:text-left">
                  <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 leading-tight">{friend.name}</h1>
                      <p className="text-violet-600 font-medium">@{friend.username}</p>

                      {(friend.institute_name || friend.university) && (
                        <div className="flex items-center justify-center md:justify-start gap-2 mt-2 text-sm text-gray-500 font-medium bg-gray-50 w-fit px-3 py-1 rounded-lg border border-gray-100 mx-auto md:mx-0">
                          <span>🎓</span>
                          <span>{friend.institute_name}</span>
                          {friend.university && <span>• {friend.university}</span>}
                        </div>
                      )}
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex gap-3">
                      {/* 1. Message Button (Only if friends) */}
                      {connectionStatus === 'friends' && (
                        <Link href={{ pathname: "/Chat", query: { friend_email: friend.email } }}>
                          <button className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 transition-all shadow-sm">
                            <MessageCircle size={18} />
                            <span>Message</span>
                          </button>
                        </Link>
                      )}

                      {/* 2. Connection Button */}
                      {connectionStatus === 'friends' ? (
                        <button disabled className="flex items-center gap-2 px-6 py-2.5 bg-green-100 text-green-700 font-bold rounded-xl cursor-default">
                          <UserCheck size={18} />
                          <span>Friends</span>
                        </button>
                      ) : connectionStatus === 'pending_sent' ? (
                        <button disabled className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-500 font-bold rounded-xl cursor-default">
                          <Clock size={18} />
                          <span>Requested</span>
                        </button>
                      ) : connectionStatus === 'pending_received' ? (
                        <button onClick={handleAcceptRequest} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all">
                          <UserPlus size={18} />
                          <span>Accept Request</span>
                        </button>
                      ) : (
                        <button onClick={handleSendRequest} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all">
                          <UserPlus size={18} />
                          <span>Connect</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {friend.bio && (
                    <div className="mt-6 max-w-2xl text-gray-600 leading-relaxed bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50 text-left">
                      <span className="text-xl mr-2">❝</span>{friend.bio}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-6">
                <div className="text-center p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                  <span className="block text-2xl font-black text-gray-900">{posts.length}</span>
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Posts</span>
                </div>
                <div className="text-center p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                  <span className="block text-2xl font-black text-gray-900">{followers.length}</span>
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Followers</span>
                </div>
                <div className="text-center p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                  <span className="block text-2xl font-black text-gray-900">{following.length}</span>
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Following</span>
                </div>
              </div>
            </div>
          </div>

          {/* --- Content Grid (Posts) --- */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 pl-2">
              📸 Posts
            </h2>

            {posts.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
                <div className="text-5xl mb-4">📭</div>
                <p className="text-gray-500 font-medium">No posts yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {posts.map((post, i) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    key={post._id || i}
                    className="bg-white p-6 rounded-3xl shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <img src={friend.profilepic} className="w-10 h-10 rounded-full object-cover border border-gray-100" alt="avatar" />
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{friend.name}</h4>
                        <p className="text-xs text-gray-400">{new Date(post.createdAt || Date.now()).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <p className="text-gray-800 leading-relaxed mb-4 flex-1">
                      {post.content}
                    </p>

                    {/* Media Rendering */}
                    {post.mediaType === 'image' && (
                      <div className="rounded-xl overflow-hidden mb-3 border border-gray-100">
                        <img src={post.mediaUrl} alt="Post media" className="w-full h-auto object-cover max-h-[400px]" />
                      </div>
                    )}
                    {post.mediaType === 'video' && (
                      <div className="rounded-xl overflow-hidden mb-3 border border-gray-100 bg-black">
                        <video src={post.mediaUrl} controls className="w-full h-auto max-h-[400px]" />
                      </div>
                    )}

                    {post.caption && (
                      <div className="mt-auto pt-4 border-t border-gray-50">
                        <p className="text-sm font-medium text-violet-600 italic">
                          ✨ {post.caption}
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}

export default ViewFriendsPage
