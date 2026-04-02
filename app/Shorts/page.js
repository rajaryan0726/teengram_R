"use client"
import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Sidebar from '../Components/Sidebar'
import { fetchuser, fetchShortsFeed, toggleLikePost, addComment, replyToComment, followUserById } from '@/actions/useractions'
import { Heart, MessageCircle, Share2, MoreVertical, Play, Film, Send, UserPlus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { io } from 'socket.io-client'

const ShortsPage = () => {
    const router = useRouter()
    const { data: session } = useSession()
    const [form, setform] = useState({})
    const [shorts, setShorts] = useState([])
    const [socket, setSocket] = useState(null)
    const [activeVideoId, setActiveVideoId] = useState(null)
    const [sentRequests, setSentRequests] = useState([])

    const [commentInputs, setCommentInputs] = useState({});
    const [activeCommentBox, setActiveCommentBox] = useState(null); 
    const [replyInputs, setReplyInputs] = useState({});
    const [activeReplyBox, setActiveReplyBox] = useState(null); 

    const scrollContainerRef = useRef(null)

    useEffect(() => {
        if (!session) {
            router.push("/login")
        } else {
            getdata()

            const newSocket = io('http://localhost:3000', { path: '/api/socket', addTrailingSlash: false });
            setSocket(newSocket);

            newSocket.on('post_updated', (data) => {
                setShorts(prev => prev.map(p => {
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

            return () => newSocket.disconnect();
        }
    }, [session])

    useEffect(() => {
        // Intersection Observer to autoplay videos in view
        if (!scrollContainerRef.current) return;
        
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveVideoId(entry.target.getAttribute('data-id'));
                        const video = entry.target.querySelector('video');
                        if (video) video.play().catch(e => console.log("Autoplay prevented:", e));
                    } else {
                        const video = entry.target.querySelector('video');
                        if (video) video.pause();
                    }
                });
            },
            { threshold: 0.6 } // Video plays when 60% is in view
        );

        const videoElements = document.querySelectorAll('.short-container');
        videoElements.forEach((el) => observer.observe(el));

        return () => {
            videoElements.forEach((el) => observer.unobserve(el));
        };
    }, [shorts]);

    const getdata = async () => {
        let u = await fetchuser(session.user.email)
        setform(u)
        
        // Fetch shorts
        let feedData = await fetchShortsFeed(session.user.email, u._id)
        setShorts(feedData)
    }

    const onLike = async (postId) => {
        setShorts(prev => prev.map(p => {
            if (p._id === postId) {
                const isLiked = p.likes?.includes(form._id);
                return {
                    ...p,
                    likes: isLiked ? p.likes.filter(id => id !== form._id) : [...(p.likes || []), form._id]
                };
            }
            return p;
        }));

        const res = await toggleLikePost(postId, form._id, form.email, form.name, form.profilepic);
        if (res.success && socket) {
            socket.emit('post_reaction', { postId, type: 'like', likes: res.likes, recipientEmail: null });
        }
    };

    const handleFollow = async (receiverId) => {
        const res = await followUserById(form.email, receiverId, form.profilepic);
        if (res.success) {
            setSentRequests([...sentRequests, receiverId]);
        }
    }

    const onComment = async (postId) => {
        const text = commentInputs[postId];
        if (!text || !text.trim()) return;

        const res = await addComment(postId, form._id, form.email, form.name, form.profilepic, text);
        if (res.success) {
            setCommentInputs({ ...commentInputs, [postId]: '' });
            if (socket) socket.emit('post_reaction', { postId, type: 'comment', comment: res.comment, recipientEmail: null });
        }
    };

    const onReply = async (postId, commentId) => {
        const text = replyInputs[commentId];
        if (!text || !text.trim()) return;

        const res = await replyToComment(postId, commentId, form._id, form.email, form.name, form.profilepic, text);
        if (res.success) {
            setReplyInputs({ ...replyInputs, [commentId]: '' });
            setActiveReplyBox(null);
            if (socket) socket.emit('post_reaction', { postId, type: 'reply', commentId, reply: res.reply, recipientEmail: null });
        }
    };

    return (
        <div className="flex bg-black h-screen w-full overflow-hidden text-white">
            <Sidebar className="flex-1" />

            <main className="flex-1 relative flex justify-center bg-black">
                {shorts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <Film className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-xl font-semibold text-white/70">No Shorts right now.</p>
                        <p className="text-sm">Follow more people to see their creative videos!</p>
                    </div>
                ) : (
                    <div 
                        ref={scrollContainerRef}
                        className="h-screen w-full sm:w-[400px] md:w-[450px] overflow-y-scroll snap-y snap-mandatory custom-scrollbar hide-scrollbar"
                        style={{ scrollBehavior: 'smooth' }}
                    >
                        {shorts.map((short, i) => {
                            const isLiked = short.likes?.includes(form._id);
                            const isActive = activeVideoId === short._id;

                            return (
                                <div 
                                    key={short._id} 
                                    data-id={short._id}
                                    className="short-container h-screen w-full snap-start snap-always relative flex items-center justify-center bg-black"
                                >
                                    {/* Video Player */}
                                    <video 
                                        src={short.mediaUrl} 
                                        loop 
                                        playsInline
                                        // muted // Removing muted so audio works, but browser autoplay policies might require interaction
                                        autoPlay={isActive}
                                        className="h-full w-full object-cover"
                                        onClick={(e) => {
                                            if (e.target.paused) e.target.play();
                                            else e.target.pause();
                                        }}
                                    />

                                    {/* Overlay Gradient for readability */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none"></div>

                                    {/* Author & Caption (Bottom Left) */}
                                    <div className="absolute bottom-6 left-4 right-20 z-10 flex flex-col gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-sky-500 to-sky-500">
                                                <img src={short.profilepic} className="w-full h-full rounded-full object-cover border-2 border-black" />
                                            </div>
                                            <span className="font-bold text-[17px] tracking-wide text-white drop-shadow-md">@{short.user_name || 'user'}</span>
                                            {short.user_id !== form._id && !sentRequests.includes(short.user_id) && (
                                                <button onClick={() => handleFollow(short.user_id)} className="px-3 py-1 flex items-center gap-1 bg-transparent border border-white/40 text-white rounded-full text-xs font-semibold hover:bg-white/10 transition backdrop-blur-sm">
                                                    <UserPlus size={14} /> Follow
                                                </button>
                                            )}
                                            {sentRequests.includes(short.user_id) && (
                                                <span className="px-3 py-1 bg-white/20 text-white rounded-full text-xs font-semibold backdrop-blur-sm">Requested</span>
                                            )}
                                        </div>
                                        <div className="text-[15px] font-medium text-white/90 drop-shadow-md line-clamp-2 pr-4 pl-1 border-l-2 border-white/20 mt-1">
                                            {short.caption || '🎬 Check out my new short!'}
                                        </div>
                                        
                                        {/* Music / Sound placeholder */}
                                        <div className="flex items-center gap-2 mt-2 px-2 py-1 bg-black/30 w-max rounded-full backdrop-blur-sm border border-white/10">
                                            <span className="text-xs">🎵 Original Audio - {short.user_name}</span>
                                        </div>
                                    </div>

                                    {/* Action Column (Bottom Right) */}
                                    <div className="absolute bottom-6 right-4 z-10 flex flex-col items-center gap-6">
                                        <button 
                                            onClick={() => onLike(short._id)} 
                                            className="group flex flex-col items-center gap-1 transition-transform active:scale-90"
                                        >
                                            <div className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:bg-white/10 transition">
                                                <Heart className={`w-7 h-7 ${isLiked ? 'fill-cyan-500 text-cyan-500' : 'text-white'}`} />
                                            </div>
                                            <span className="text-xs font-bold drop-shadow-md">{short.likes?.length || 0}</span>
                                        </button>

                                        {/* Comment Modal Trigger Here */}
                                        <button 
                                            onClick={() => setActiveCommentBox(activeCommentBox === short._id ? null : short._id)}
                                            className="group flex flex-col items-center gap-1 transition-transform active:scale-90"
                                        >
                                            <div className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:bg-white/10 transition">
                                                <MessageCircle className="w-7 h-7 text-white fill-white/20" />
                                            </div>
                                            <span className="text-xs font-bold drop-shadow-md">{short.comments?.length || 0}</span>
                                        </button>

                                        <button className="group flex flex-col items-center gap-1 transition-transform active:scale-90">
                                            <div className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:bg-white/10 transition">
                                                <Share2 className="w-7 h-7 text-white" />
                                            </div>
                                            <span className="text-xs font-bold drop-shadow-md">Share</span>
                                        </button>

                                        <button className="group flex flex-col items-center gap-1 transition-transform active:scale-90">
                                            <MoreVertical className="w-6 h-6 text-white drop-shadow-md" />
                                        </button>
                                    </div>

                                    {/* Comments Overlay */}
                                    <AnimatePresence>
                                        {activeCommentBox === short._id && (
                                            <motion.div 
                                                initial={{ y: "100%" }}
                                                animate={{ y: 0 }}
                                                exit={{ y: "100%" }}
                                                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                                className="absolute bottom-0 left-0 right-0 bg-neutral-900/95 backdrop-blur-xl rounded-t-3xl h-[60vh] z-50 flex flex-col border-t border-white/10 shadow-2xl"
                                                onClick={(e) => e.stopPropagation()} // Prevent video play/pause when clicking inside
                                            >
                                                <div className="flex justify-between items-center p-4 border-b border-white/10">
                                                    <h3 className="font-bold text-lg text-white">Comments <span className="text-sm font-normal text-white/50">{short.comments?.length || 0}</span></h3>
                                                    <button onClick={() => setActiveCommentBox(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
                                                        <MoreVertical size={16} className="rotate-90" />
                                                    </button>
                                                </div>

                                                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                                    {short.comments?.map((c, idx) => (
                                                        <div key={idx} className="flex gap-3">
                                                            <img src={c.profilepic} className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />
                                                            <div className="flex-1">
                                                                <div className="bg-white/5 p-3 rounded-2xl rounded-tl-sm border border-white/5">
                                                                    <span className="font-bold text-sm text-white/90 mr-2">{c.user_name}</span>
                                                                    <span className="text-sm text-white/80">{c.text}</span>
                                                                </div>
                                                                
                                                                <button 
                                                                    onClick={() => setActiveReplyBox(activeReplyBox === c._id ? null : c._id)}
                                                                    className="text-xs text-white/50 font-semibold mt-1 ml-2 hover:text-white transition"
                                                                >
                                                                    Reply
                                                                </button>

                                                                {/* Replies */}
                                                                {c.replies?.length > 0 && (
                                                                    <div className="mt-3 pl-4 border-l-2 border-white/10 space-y-3">
                                                                        {c.replies.map((r, rIdx) => (
                                                                            <div key={rIdx} className="flex items-start gap-2 text-xs">
                                                                                <img src={r.profilepic} className="w-5 h-5 rounded-full object-cover shadow-sm" />
                                                                                <div className="bg-white/5 p-2 rounded-xl rounded-tl-sm w-full border border-white/5">
                                                                                    <span className="font-bold text-white/90 mr-1">{r.user_name}</span>
                                                                                    <span className="text-white/80">{r.text}</span>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {/* Reply Input Box */}
                                                                {activeReplyBox === c._id && (
                                                                    <div className="flex gap-2 mt-2 pt-2">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Write a reply..."
                                                                            className="flex-1 px-3 py-1.5 bg-white/10 border border-white/10 focus:border-white/30 rounded-full text-xs text-white focus:outline-none placeholder-white/40"
                                                                            value={replyInputs[c._id] || ''}
                                                                            onChange={(e) => setReplyInputs({ ...replyInputs, [c._id]: e.target.value })}
                                                                            onKeyDown={(e) => { if (e.key === 'Enter') onReply(short._id, c._id); e.stopPropagation(); }}
                                                                        />
                                                                        <button
                                                                            onClick={() => onReply(short._id, c._id)}
                                                                            className="p-1.5 bg-blue-500 text-white text-xs font-semibold rounded-full hover:bg-blue-600 transition-colors"
                                                                        >
                                                                            <Send size={14} className="ml-0.5" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {(!short.comments || short.comments.length === 0) && (
                                                        <p className="text-white/40 text-sm text-center py-10">No comments yet. Say something nice!</p>
                                                    )}
                                                </div>

                                                <div className="p-4 border-t border-white/10 bg-neutral-900/50 backdrop-blur-md">
                                                    <div className="flex gap-2 items-center bg-white/10 p-1.5 rounded-full border border-white/10 focus-within:border-white/30 transition">
                                                        <img src={form.profilepic} className="w-8 h-8 rounded-full outline outline-2 outline-black" />
                                                        <input
                                                            type="text"
                                                            placeholder="Add a comment..."
                                                            className="flex-1 px-2 py-1 bg-transparent text-sm text-white focus:outline-none placeholder-white/40"
                                                            value={commentInputs[short._id] || ''}
                                                            onChange={(e) => setCommentInputs({ ...commentInputs, [short._id]: e.target.value })}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') onComment(short._id); e.stopPropagation(); }}
                                                        />
                                                        <button
                                                            onClick={() => onComment(short._id)}
                                                            className="p-2 bg-gradient-to-r from-sky-500 to-sky-500 text-white rounded-full hover:shadow-lg transition-transform active:scale-95"
                                                        >
                                                            <Send size={16} className="-ml-0.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>

            <style jsx>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    )
}

export default ShortsPage
