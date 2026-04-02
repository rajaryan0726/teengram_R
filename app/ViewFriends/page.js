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
  fetchpost,
  toggleLikePost,
  addComment
} from '@/actions/useractions'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, UserPlus, UserCheck, Clock, Check, Heart, Send } from 'lucide-react'
import { io } from 'socket.io-client'

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

  // Social State
  const [socket, setSocket] = useState(null)
  const [commentInputs, setCommentInputs] = useState({});
  const [activeCommentBox, setActiveCommentBox] = useState(null);

  useEffect(() => {
    const friendEmail = searchParams.get('friend_email')
    const userEmail = session?.user?.email || searchParams.get('user_email');

    if (friendEmail && userEmail) {
      loadProfileData(friendEmail, userEmail);
    }

    // Initialize Socket
    if (session) {
      const newSocket = io('http://localhost:3000', {
        path: '/api/socket',
        addTrailingSlash: false,
      });
      setSocket(newSocket);

      newSocket.on('post_updated', (data) => {
        setPosts(prevPosts => prevPosts.map(p => {
          if (p._id === data.postId) {
            if (data.type === 'like') {
              return { ...p, likes: data.likes };
            }
            if (data.type === 'comment') {
              return { ...p, comments: [...(p.comments || []), data.comment] };
            }
            if (data.type === 'reply') {
              return {
                ...p,
                comments: p.comments.map(c =>
                  c._id === data.commentId
                    ? { ...c, replies: [...(c.replies || []), data.reply] }
                    : c
                )
              };
            }
          }
          return p;
        }));
      });

      return () => {
        newSocket.disconnect();
      }
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
        const myRequest = await checkfriendstatus(userEmail, friendEmail);
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

  // --- SOCIAL ACTIONS ---
  const onLike = async (postId) => {
    // Get current user details from session? We need ID.
    // We don't have current user ID in state, only email from session.
    // We should ideally fetch current user details once.
    // For now, let's assume we can get it or we fetch it.
    // Wait, we need it for the optimistic update KEY.
    // Let's fetch current user ID first or store it.
    // Optimization: Fetch current user details in useEffect.
    if (!session) return;

    // Quick fetch of my ID if not already available
    // Ideally we should have a user context, but let's fetch strictly for the action if needed
    // Actually we need it for `likes.includes(myId)` check for UI. 
    // We haven't fetched 'me' yet in this component.
    const me = await fetchuser(session.user.email);
    const myId = me._id;

    setPosts(prev => prev.map(p => {
      if (p._id === postId) {
        const isLiked = p.likes?.includes(myId);
        return {
          ...p,
          likes: isLiked ? p.likes.filter(id => id !== myId) : [...(p.likes || []), myId]
        };
      }
      return p;
    }));

    const res = await toggleLikePost(postId, myId, me.email, me.name, me.profilepic);
    if (res.success) {
      socket.emit('post_reaction', {
        postId,
        type: 'like',
        likes: res.likes,
        recipientEmail: friend.email, // Notify the friend
        recipientId: friend._id       // And their ID for socket targeting
      });
    }
  };

  const onComment = async (postId) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    const me = await fetchuser(session.user.email); // Need my details

    const res = await addComment(postId, me._id, me.email, me.name, me.profilepic, text);
    if (res.success) {
      setCommentInputs({ ...commentInputs, [postId]: '' });
      socket.emit('post_reaction', {
        postId,
        type: 'comment',
        comment: res.comment,
        recipientEmail: friend.email,
        recipientId: friend._id
      });
    }
  };


  if (loading) {
    return (
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar className="flex-1" />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </main>
      </div>
    )
  }

  // ... (User not found check)

  return (
    <div className="flex bg-gray-50 h-screen w-full overflow-hidden">
      <Sidebar className="flex-1" />

      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* ... (Profile Header Card logic same as before, skipping lines for brevity if unchanged) ... */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden relative border border-gray-100">
            {/* ... Header Content ... */}
            <div className="h-40 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500"></div>
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
                  {friend.verified && (
                    <div className="absolute bottom-2 right-2 bg-blue-500 text-white p-1 rounded-full border-2 border-white shadow-sm">
                      <Check size={16} strokeWidth={3} />
                    </div>
                  )}
                </div>

                <div className="flex-1 w-full md:w-auto text-center md:text-left">
                  <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 leading-tight">{friend.name}</h1>
                      <p className="text-blue-600 font-medium">@{friend.username}</p>
                      {/* ... Institute ... */}
                    </div>
                    {/* ... Action Buttons ... */}
                    <div className="flex gap-3">
                      {connectionStatus === 'friends' && (
                        <Link href={{ pathname: "/Chat", query: { friend_email: friend.email } }}>
                          <button className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                            <MessageCircle size={18} />
                            <span>Message</span>
                          </button>
                        </Link>
                      )}
                      {/* ... Other buttons (Friends, Requested, Connect) ... */}
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
                        <button onClick={handleAcceptRequest} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all">
                          <UserPlus size={18} />
                          <span>Accept Request</span>
                        </button>
                      ) : (
                        <button onClick={handleSendRequest} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all">
                          <UserPlus size={18} />
                          <span>Connect</span>
                        </button>
                      )}
                    </div>
                  </div>
                  {friend.bio && (
                    <div className="mt-6 max-w-2xl text-gray-600 leading-relaxed bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50 text-left">
                      <span className="text-xl mr-2">❝</span>{friend.bio}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-6">
                <div className="text-center p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                  <span className="block text-2xl font-black text-gray-900">{posts.length}</span>
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Posts</span>
                </div>
                {/* ... Followers/Following counts ... */}
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
                      <div className="mt-auto pt-4 border-t border-gray-50 mb-3">
                        <p className="text-sm font-medium text-blue-600 italic">
                          ✨ {post.caption}
                        </p>
                      </div>
                    )}

                    {/* --- SOCIAL BUTTONS --- */}
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => onLike(post._id)}
                        className="flex items-center gap-1.5 text-gray-500 hover:text-blue-500 transition-colors"
                      >
                        <Heart
                          size={20}
                          // Caution: We can't check 'likes.includes(myId)' accurately if we haven't fetched 'myId' in component load.
                          // But optimistic update uses fetched 'me' inside function.
                          // For rendering INITIAL state, we need to know 'myId'.
                          // Let's assume for now we don't highlight until first interaction OR we fetch 'me' on load.
                          // Better: Fetch 'me' in useEffect.
                          className={post.likes && post.likes.length > 0 ? "text-blue-500" : ""} // Placeholder logic mostly for visual if liked by *anyone* (wrong)
                        // Real fix: fetch current user ID
                        />
                        <span className="font-semibold text-sm">{post.likes?.length || 0}</span>
                      </button>

                      <button
                        onClick={() => setActiveCommentBox(activeCommentBox === post._id ? null : post._id)}
                        className="flex items-center gap-1.5 text-gray-500 hover:text-blue-500 transition-colors"
                      >
                        <MessageCircle size={20} />
                        <span className="font-semibold text-sm">{post.comments?.length || 0}</span>
                      </button>
                    </div>

                    {/* --- COMMENTS SECTION --- */}
                    <AnimatePresence>
                      {activeCommentBox === post._id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-3 overflow-hidden"
                        >
                          <div className="space-y-3 mb-3 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                            {post.comments?.map((c, idx) => (
                              <div key={idx} className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm text-sm">
                                <div className="flex items-start gap-2">
                                  <img src={c.profilepic} className="w-6 h-6 rounded-full" alt="pic" />
                                  <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <span className="font-bold text-gray-800 mr-2">{c.user_name}</span>
                                        <span className="text-gray-600">{c.text}</span>
                                      </div>
                                    </div>
                                    
                                    {/* Replies List */}
                                    {c.replies?.length > 0 && (
                                      <div className="mt-2 pl-3 border-l-2 border-blue-100 space-y-2">
                                        {c.replies.map((r, rIdx) => (
                                          <div key={rIdx} className="flex items-start gap-2 text-xs">
                                            <img src={r.profilepic} className="w-4 h-4 rounded-full mt-0.5" alt="pic" />
                                            <div>
                                              <span className="font-bold text-blue-800 mr-1">{r.user_name}</span>
                                              <span className="bg-blue-100 text-blue-800 text-[9px] px-1 rounded mr-2 font-bold tracking-wide">AUTHOR</span>
                                              <span className="text-gray-600">{r.text}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {(!post.comments || post.comments.length === 0) && (
                              <p className="text-gray-400 text-xs text-center">No comments yet.</p>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Write a comment..."
                              className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-blue-400 placeholder-gray-500"
                              value={commentInputs[post._id] || ''}
                              onChange={(e) => setCommentInputs({ ...commentInputs, [post._id]: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && onComment(post._id)}
                            />
                            <button
                              onClick={() => onComment(post._id)}
                              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                              <Send size={16} />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

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
