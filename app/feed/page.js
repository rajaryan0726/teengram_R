"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Sidebar from '../Components/Sidebar'
import { fetchuser, fetchHomeFeed, fetchFeedMoments, markMomentViewed, toggleLikePost, addComment, replyToComment } from '@/actions/useractions'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MessageCircle, Send, X, Play } from 'lucide-react'
import { useSocket } from '../providers/SocketProvider'

const SegmentedCircle = ({ count, hasViewedAll, profilepic }) => {
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const gap = count > 1 ? 4 : 0; 
    const segmentLength = count > 1 ? (circumference - gap * count) / count : circumference;
    
    return (
       <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
            <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="50%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
            </defs>
            <circle 
               cx="32" cy="32" r={radius} 
               fill="transparent" 
               stroke={hasViewedAll ? "#d1d5db" : "url(#gradient)"} 
               strokeWidth="2.5" 
               strokeDasharray={`${segmentLength} ${gap}`} 
            />
          </svg>
          <img src={profilepic} className="w-[54px] h-[54px] rounded-full object-cover border-[3px] border-white dark:border-neutral-900 absolute z-10" />
       </div>
    );
}

const Page = () => {
  const router = useRouter()
  const { data: session } = useSession()
  const [form, setform] = useState({})
  const [feedPosts, setFeedPosts] = useState([])
  const [moments, setMoments] = useState([])
  
  const [commentInputs, setCommentInputs] = useState({});
  const [activeCommentBox, setActiveCommentBox] = useState(null); 
  const [replyInputs, setReplyInputs] = useState({});
  const [activeReplyBox, setActiveReplyBox] = useState(null); 

  const { socket, onlineUsers } = useSocket();
  const [activeMomentGroup, setActiveMomentGroup] = useState(null)
  const [activeMomentIndex, setActiveMomentIndex] = useState(0)
  const [showViewers, setShowViewers] = useState(false)
  
  useEffect(() => {
    if (!session) {
      router.push("/login")
    } else {
      getdata()
    }
  }, [session])

  useEffect(() => {
    if (!socket) return;

    const handlePostUpdate = (data) => {
        setFeedPosts(prevPosts => prevPosts.map(p => {
          if (p._id === data.postId) {
            if (data.type === 'like') return { ...p, likes: data.likes };
            if (data.type === 'comment') return { ...p, comments: [...(p.comments || []), data.comment] };
            if (data.type === 'reply') {
              return { 
                ...p, 
                comments: p.comments.map(c => 
                  c._id === data.commentId ? { ...c, replies: [...(c.replies || []), data.reply] } : c
                ) 
              };
            }
          }
          return p;
        }));
    };

    socket.on('post_updated', handlePostUpdate);
    return () => socket.off('post_updated', handlePostUpdate);
  }, [socket]);

  const getdata = async () => {
    let u = await fetchuser(session.user.email)
    setform(u)

    let posts = await fetchHomeFeed(session.user.email, u._id);
    setFeedPosts(posts)

    let m = await fetchFeedMoments(session.user.email, u._id);
    setMoments(m)
  }

  const onLike = async (postId) => {
    setFeedPosts(prev => prev.map(p => {
      if (p._id === postId && p.user_id !== form._id) {
        const isLiked = p.likes?.includes(form._id);
        return { ...p, likes: isLiked ? p.likes.filter(id => id !== form._id) : [...(p.likes || []), form._id] };
      }
      return p;
    }));

    const res = await toggleLikePost(postId, form._id, form.email, form.name, form.profilepic);
    if (res.success && socket) {
      socket.emit('post_reaction', { postId, type: 'like', likes: res.likes, recipientEmail: null });
    }
  };

  const onComment = async (postId) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    const res = await addComment(postId, form._id, form.email, form.name, form.profilepic, text);
    if (res.success && socket) {
      setCommentInputs({ ...commentInputs, [postId]: '' });
      socket.emit('post_reaction', { postId, type: 'comment', comment: res.comment, recipientEmail: null });
    }
  };

  const onReply = async (postId, commentId) => {
    const text = replyInputs[commentId];
    if (!text || !text.trim()) return;

    const res = await replyToComment(postId, commentId, form._id, form.email, form.name, form.profilepic, text);
    if (res.success && socket) {
      setReplyInputs({ ...replyInputs, [commentId]: '' });
      setActiveReplyBox(null);
      socket.emit('post_reaction', { postId, type: 'reply', commentId, reply: res.reply, recipientEmail: null });
    }
  };

  const openMomentGroup = async (group) => {
    setActiveMomentGroup(group);
    setActiveMomentIndex(0);
    setShowViewers(false);
    
    const m = group[0];
    if (m.user_id !== form._id) {
        await markMomentViewed(m._id, form._id, form.username || form.email.split('@')[0], form.profilepic)
        setMoments(prev => prev.map(mom => mom._id === m._id && !hasViewedMoment(mom) ? {...mom, viewers: [...(mom.viewers||[]), {user_id: form._id, profilepic: form.profilepic, username: form.username}]} : mom))
    }
  }

  const navigateMoment = async (direction) => {
     let newIdx = activeMomentIndex + direction;
     if(newIdx < 0 || newIdx >= activeMomentGroup.length) {
         setActiveMomentGroup(null);
         return;
     }

     setActiveMomentIndex(newIdx);
     setShowViewers(false);
     
     const m = activeMomentGroup[newIdx];
     if (m.user_id !== form._id) {
        await markMomentViewed(m._id, form._id, form.username || form.email.split('@')[0], form.profilepic)
        setMoments(prev => prev.map(mom => mom._id === m._id && !hasViewedMoment(mom) ? {...mom, viewers: [...(mom.viewers||[]), {user_id: form._id, profilepic: form.profilepic, username: form.username}]} : mom))
     }
  }

  const hasViewedMoment = (m) => {
      if(m.user_id === form._id) return true;
      return m.viewers?.some(v => v.user_id === form._id)
  }

  return (
    <div className="flex bg-gray-50 dark:bg-black h-screen w-full overflow-hidden transition-colors">
      <Sidebar className="flex-1" />

      <main className="flex-1 p-2 lg:p-8 overflow-y-auto custom-scrollbar pb-20 md:pb-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
            
          {/* Moments Section (Top on mobile, Right side on desktop) */}
          <div className="lg:col-start-3 lg:row-start-1">
             <div className="bg-white dark:bg-neutral-900 rounded-2xl lg:rounded-3xl shadow-sm border border-gray-100 dark:border-neutral-800 py-3 px-2 lg:p-6 lg:sticky lg:top-4">
                <h3 className="hidden lg:block font-bold text-gray-800 dark:text-gray-100 mb-6 font-serif text-lg">Moments</h3>
                <div className="flex flex-row lg:flex-col gap-3 lg:gap-4 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto lg:max-h-[75vh] custom-scrollbar pb-2 px-1 lg:px-2">
                   <Link href="/User" className="flex flex-col lg:flex-row items-center gap-2 lg:gap-4 min-w-[70px] cursor-pointer group shrink-0 w-full">
                      <div className="relative w-16 h-16 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex justify-center items-center bg-gray-50 dark:bg-neutral-800 group-hover:bg-gray-100 dark:group-hover:bg-neutral-700 transition shrink-0">
                         <span className="text-2xl text-gray-400 dark:text-gray-500">+</span>
                      </div>
                      <span className="text-xs lg:text-sm font-semibold text-center lg:text-left text-gray-700 dark:text-gray-300">Add Moment</span>
                   </Link>

                {(() => {
                    const groupedMoments = moments.reduce((acc, m) => {
                        if (!acc[m.user_id]) acc[m.user_id] = [];
                        acc[m.user_id].push(m);
                        return acc;
                    }, {});

                    const groupedMomentsArray = Object.values(groupedMoments);
                    groupedMomentsArray.sort((a, b) => {
                        if (a[0].user_id === form._id) return -1;
                        if (b[0].user_id === form._id) return 1;
                        return 0;
                    });

                    return groupedMomentsArray.map((userMoments, i) => {
                        const firstMoment = userMoments[0];
                        const allViewed = userMoments.every(m => hasViewedMoment(m));

                        return (
                            <div key={i} onClick={() => openMomentGroup(userMoments)} className="flex flex-col lg:flex-row items-center gap-2 lg:gap-4 min-w-[70px] cursor-pointer group shrink-0 w-full transition">
                                <SegmentedCircle count={userMoments.length} hasViewedAll={allViewed} profilepic={firstMoment.profilepic} />
                                <span className="text-xs lg:text-sm font-semibold tracking-wide text-center lg:text-left text-gray-700 dark:text-gray-200 truncate w-full px-1">
                                    {firstMoment.user_id === form._id ? 'You' : firstMoment.user_name || firstMoment.user_id}
                                </span>
                            </div>
                        )
                    });
                })()}
             </div>
             </div>
          </div>

          {/* Feed Posts */}
          <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1 space-y-6 pb-20">
            {feedPosts.length === 0 ? (
                <div className="text-center py-10 text-gray-400">No posts on your feed yet. Go follow some friends!</div>
            ) : (
                feedPosts.map((p, i) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      key={i}
                      className="bg-white dark:bg-neutral-900 p-4 lg:p-5 rounded-2xl lg:rounded-3xl shadow-lg border border-gray-100 dark:border-neutral-800 relative"
                    >
                      <div className="flex items-center justify-between mb-3 lg:mb-4">
                        <Link href={p.user_id === form._id ? "/User" : { pathname: "/ViewFriends", query: { friend_email: p.user_email || p.user_id } }} className="flex items-center gap-2 lg:gap-3 group relative">
                            <div className="relative">
                                <img src={p.profilepic} className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover border-2 border-gray-100 dark:border-neutral-700 group-hover:border-blue-400 transition" alt="avatar" />
                                {onlineUsers?.has(p.user_id) && (
                                    <span className="absolute bottom-0 right-0 w-3 h-3 lg:w-3.5 lg:h-3.5 bg-green-500 border-2 border-white dark:border-neutral-900 rounded-full shadow-sm animate-pulse"></span>
                                )}
                            </div>
                            <div>
                                <h4 className="font-bold text-sm lg:text-base text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition">{p.user_name}</h4>
                                <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400">{new Date(p.createdAt).toLocaleDateString()} at {new Date(p.createdAt).toLocaleTimeString([], {timeStyle: 'short'})}</p>
                            </div>
                        </Link>
                      </div>

                      <p className="text-sm lg:text-base text-gray-800 dark:text-gray-200 leading-relaxed mb-3 lg:mb-4">{p.content}</p>

                      {p.mediaType === 'image' && (
                        <div className="rounded-xl lg:rounded-2xl overflow-hidden mb-3 lg:mb-4 border border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-black">
                          <img src={p.mediaUrl} alt="Post media" className="w-full h-auto object-cover max-h-[400px] lg:max-h-[600px]" />
                        </div>
                      )}
                      {p.mediaType === 'video' && (
                        <div className="rounded-xl lg:rounded-2xl overflow-hidden mb-3 lg:mb-4 border border-gray-100 dark:border-neutral-800 bg-black">
                          <video src={p.mediaUrl} controls className="w-full h-auto max-h-[400px] lg:max-h-[600px]" />
                        </div>
                      )}

                      {p.caption && (
                        <div className="pl-4 border-l-4 border-blue-200 dark:border-blue-900 italic text-blue-700 dark:text-blue-300 text-sm mb-4 font-medium">
                          {p.caption}
                        </div>
                      )}

                      {/* Controls */}
                      <div className="flex items-center gap-6 pt-3 border-t border-gray-100 dark:border-neutral-800">
                        <button
                          onClick={() => p.user_id !== form._id && onLike(p._id)}
                          className={`flex items-center gap-1.5 transition-colors ${p.user_id === form._id ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60' : 'text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400'}`}
                        >
                          <Heart
                            size={24}
                            fill={p.likes?.includes(form._id) ? "currentColor" : "none"}
                            className={p.likes?.includes(form._id) ? "text-blue-500 dark:text-blue-400" : ""}
                          />
                          <span className="font-semibold">{p.likes?.length || 0}</span>
                        </button>

                        <button
                          onClick={() => setActiveCommentBox(activeCommentBox === p._id ? null : p._id)}
                          className="flex items-center gap-1.5 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                        >
                          <MessageCircle size={24} />
                          <span className="font-semibold">{p.comments?.length || 0}</span>
                        </button>
                      </div>

                      {/* Comments */}
                      <AnimatePresence>
                        {activeCommentBox === p._id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-4 overflow-hidden"
                          >
                            <div className="space-y-3 mb-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                              {p.comments?.map((c, idx) => (
                                <div key={idx} className="bg-gray-50 dark:bg-neutral-800/50 p-3 rounded-2xl text-sm border border-transparent dark:border-neutral-800">
                                  <div className="flex items-start gap-2">
                                    <img src={c.profilepic} className="w-7 h-7 rounded-full mt-1" alt="pic" />
                                    <div className="flex-1">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <span className="font-bold text-gray-900 dark:text-gray-100 mr-2">{c.user_name}</span>
                                          <span className="text-gray-700 dark:text-gray-300 leading-snug">{c.text}</span>
                                        </div>
                                        {p.user_id === form._id && (
                                            <button 
                                            onClick={() => setActiveReplyBox(activeReplyBox === c._id ? null : c._id)}
                                            className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 font-bold tracking-wide"
                                            >
                                            Reply
                                            </button>
                                        )}
                                      </div>
                                      
                                      {c.replies?.length > 0 && (
                                        <div className="mt-3 pl-3 border-l-2 border-blue-200 dark:border-blue-900/50 space-y-3">
                                          {c.replies.map((r, rIdx) => (
                                            <div key={rIdx} className="flex items-start gap-2 text-xs">
                                              <img src={r.profilepic} className="w-5 h-5 rounded-full mt-0.5" alt="pic" />
                                              <div>
                                                <span className="font-bold text-blue-800 dark:text-blue-300 mr-1">{r.user_name}</span>
                                                {r.user_id === p.user_id && <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-[9px] px-1 rounded mr-2 font-bold tracking-wide">AUTHOR</span>}
                                                <span className="text-gray-600 dark:text-gray-400">{r.text}</span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {activeReplyBox === c._id && p.user_id === form._id && (
                                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-neutral-700">
                                          <input
                                            type="text"
                                            placeholder="Write a reply..."
                                            className="flex-1 px-3 py-1.5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-400 transition"
                                            value={replyInputs[c._id] || ''}
                                            onChange={(e) => setReplyInputs({ ...replyInputs, [c._id]: e.target.value })}
                                            onKeyDown={(e) => { if (e.key === 'Enter') onReply(p._id, c._id); e.stopPropagation(); }}
                                          />
                                          <button
                                            onClick={() => onReply(p._id, c._id)}
                                            className="px-3 bg-blue-500 text-white text-xs font-semibold rounded-lg hover:bg-blue-600 transition-colors uppercase tracking-wider"
                                          >
                                            Send
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="flex gap-2 items-center pt-2">
                              {/* Current User Pic */}
                              <img src={form.profilepic} className="w-8 h-8 rounded-full border border-gray-200 dark:border-neutral-700 object-cover" />
                              <input
                                type="text"
                                placeholder="Add a comment..."
                                className="flex-1 px-4 py-2 bg-gray-50 dark:bg-neutral-800 border-0 rounded-full text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-gray-400"
                                value={commentInputs[p._id] || ''}
                                onChange={(e) => setCommentInputs({ ...commentInputs, [p._id]: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && onComment(p._id)}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                ))
            )}
          </div>
        </div>
      </main>

      {/* Moment Viewer Modal */}
      <AnimatePresence>
          {activeMomentGroup && activeMomentGroup[activeMomentIndex] && (() => {
              const activeMoment = activeMomentGroup[activeMomentIndex];
              return (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 lg:p-8"
              >
                  {/* Invisible Navigation Zones */}
                  <div className="absolute inset-y-0 left-0 w-1/3 z-[5] cursor-pointer" onClick={() => navigateMoment(-1)}></div>
                  <div className="absolute inset-y-0 right-0 w-2/3 z-[5] cursor-pointer" onClick={() => navigateMoment(1)}></div>

                  <button onClick={() => setActiveMomentGroup(null)} className="absolute top-4 right-4 lg:top-8 lg:right-8 text-white/50 hover:text-white z-20 bg-black/50 p-2 rounded-full backdrop-blur-md transition">
                      <X size={32} />
                  </button>

                  <div className="relative w-full max-w-md h-[80vh] bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center justify-center">
                      
                      {/* Segment Progress Bars */}
                      <div className="absolute top-2 left-3 right-3 z-20 flex gap-1">
                         {activeMomentGroup.map((_, idx) => (
                             <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-md">
                                 <div className={`h-full bg-white transition-all duration-300 ${idx <= activeMomentIndex ? 'w-full' : 'w-0'}`}></div>
                             </div>
                         ))}
                      </div>

                      <div className="absolute top-5 left-4 z-10 flex items-center gap-3 backdrop-blur-md bg-black/30 px-3 py-2 rounded-2xl">
                          <img src={activeMoment.profilepic} className="w-10 h-10 rounded-full border border-white/20 z-10 relative" />
                          <div className="text-white relative z-10">
                              <p className="font-semibold text-sm drop-shadow-md">{activeMoment.user_name}</p>
                              <p className="text-[10px] text-white/70 drop-shadow-md">{new Date(activeMoment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                          </div>
                      </div>

                      {activeMoment.mediaType === 'image' ? (
                          <img src={activeMoment.mediaUrl} className="w-full h-full object-contain pointer-events-none" />
                      ) : (
                          <video src={activeMoment.mediaUrl} autoPlay controls={false} loop playsInline className="w-full h-full object-contain pointer-events-none" />
                      )}

                      {activeMoment.caption && (
                          <div className={`absolute left-4 right-4 bg-black/60 backdrop-blur-md p-4 rounded-2xl text-white text-center shadow-lg border border-white/10 z-20 ${activeMoment.user_id === form._id ? 'bottom-28' : 'bottom-10 pointer-events-auto'}`}>
                              <p className="font-medium">{activeMoment.caption}</p>
                          </div>
                      )}

                      {/* Author Analytics */}
                      {activeMoment.user_id === form._id && (
                          <div className="absolute bottom-4 left-4 right-4 bg-white/10 backdrop-blur-md p-3 rounded-2xl text-white shadow-lg border border-white/10 text-xs z-30 transition-all duration-300 pointer-events-auto">
                              <button 
                                  onClick={(e) => { e.stopPropagation(); setShowViewers(!showViewers); }}
                                  className="w-full font-bold flex items-center justify-between"
                              >
                                  <span className="flex items-center gap-1">👁️ {activeMoment.viewers?.length || 0} Views</span>
                                  <span>{showViewers ? '▼' : '▲'}</span>
                              </button>
                              
                              <AnimatePresence>
                                  {showViewers && (
                                      <motion.div 
                                          initial={{ height: 0, opacity: 0 }} 
                                          animate={{ height: "auto", opacity: 1 }} 
                                          exit={{ height: 0, opacity: 0 }} 
                                          className="mt-3 overflow-hidden"
                                      >
                                          <div className="max-h-32 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1 pb-1">
                                              {activeMoment.viewers?.map((v, idx) => (
                                                  <div key={idx} className="flex items-center gap-3 bg-black/40 p-2 rounded-lg border border-white/5">
                                                      <img src={v.profilepic} className="w-6 h-6 rounded-full border border-white/40 object-cover shrink-0" />
                                                      <span className="font-semibold tracking-wide truncate text-[13px]">{v.username || v.user_id}</span>
                                                  </div>
                                              ))}
                                              {(!activeMoment.viewers || activeMoment.viewers.length === 0) && (
                                                  <p className="text-white/50 italic text-center py-2">No views yet.</p>
                                              )}
                                          </div>
                                      </motion.div>
                                  )}
                              </AnimatePresence>
                          </div>
                      )}
                  </div>
              </motion.div>
              )
          })()}
      </AnimatePresence>
    </div>
  )
}

export default Page
