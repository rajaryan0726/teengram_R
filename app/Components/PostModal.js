import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, MessageCircle, Send, MoreHorizontal } from 'lucide-react';
import { toggleLikePost, addComment, replyToComment } from '@/actions/useractions';

export default function PostModal({ isOpen, onClose, post, currentUser, onUpdate }) {
    const [localPost, setLocalPost] = useState(post);
    const [commentText, setCommentText] = useState('');
    const [replyText, setReplyText] = useState({});
    const [activeReplyBox, setActiveReplyBox] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLocalPost(post);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; }
    }, [isOpen, post]);

    if (!isOpen || !localPost || !currentUser) return null;

    const isLiked = localPost.likes?.includes(currentUser._id);

    const handleLike = async () => {
        // Optimistic Update
        const updatedLikes = isLiked 
            ? localPost.likes.filter(id => id !== currentUser._id)
            : [...(localPost.likes || []), currentUser._id];
            
        const optimisticPost = { ...localPost, likes: updatedLikes };
        setLocalPost(optimisticPost);
        if(onUpdate) onUpdate(optimisticPost);

        const res = await toggleLikePost(localPost._id, currentUser._id, currentUser.email, currentUser.name, currentUser.profilepic);
        if (res.success && res.action) {
            // Server confirmed, no action needed unless sync is off
        }
    };

    const handleComment = async (e) => {
        e.preventDefault();
        if(!commentText.trim() || isSubmitting) return;

        setIsSubmitting(true);
        const res = await addComment(localPost._id, currentUser._id, currentUser.email, currentUser.name, currentUser.profilepic, commentText);
        
        if (res.success) {
            const newComment = {
                _id: res.comment._id,
                user_id: currentUser._id,
                user_name: currentUser.name,
                profilepic: currentUser.profilepic,
                text: commentText,
                createdAt: new Date().toISOString(),
                replies: []
            };

            const updatedPost = {
                ...localPost,
                comments: [...(localPost.comments || []), newComment]
            };
            setLocalPost(updatedPost);
            if(onUpdate) onUpdate(updatedPost);
            setCommentText('');
        }
        setIsSubmitting(false);
    };

    const handleReply = async (commentId) => {
        const text = replyText[commentId];
        if(!text?.trim() || isSubmitting) return;

        setIsSubmitting(true);
        const res = await replyToComment(localPost._id, commentId, currentUser._id, currentUser.email, currentUser.name, currentUser.profilepic, text);
        
        if (res.success) {
            const newReply = {
                _id: res.reply._id,
                user_id: currentUser._id,
                user_name: currentUser.name,
                profilepic: currentUser.profilepic,
                text: text,
                createdAt: new Date().toISOString()
            };

            const updatedPost = {
                ...localPost,
                comments: localPost.comments.map(c => 
                    c._id === commentId 
                        ? { ...c, replies: [...(c.replies || []), newReply] } 
                        : c
                )
            };
            setLocalPost(updatedPost);
            if(onUpdate) onUpdate(updatedPost);
            setReplyText({ ...replyText, [commentId]: '' });
            setActiveReplyBox(null);
        }
        setIsSubmitting(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-6 bg-black/80 backdrop-blur-sm">
                    {/* Background Click to Close */}
                    <div className="absolute inset-0" onClick={onClose} />

                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-5xl h-[85vh] md:h-[80vh] bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row z-10 border border-gray-200 dark:border-neutral-800"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button (Mobile Absolute, Desktop absolute within media) */}
                        <button 
                            onClick={onClose}
                            className="absolute top-4 right-4 md:left-4 md:right-auto z-50 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-md transition-colors"
                        >
                            <X size={20} />
                        </button>

                        {/* LEFT: Media Section */}
                        <div className="w-full md:w-[60%] h-[40%] md:h-full bg-black flex items-center justify-center overflow-hidden relative">
                           {localPost.mediaUrl ? (
                                localPost.mediaType === 'video' || localPost.feedType === 'short' ? (
                                    <video 
                                        src={localPost.mediaUrl} 
                                        controls 
                                        autoPlay 
                                        loop 
                                        playsInline
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <img 
                                        src={localPost.mediaUrl} 
                                        alt="Post content" 
                                        className="w-full h-full object-contain"
                                    />
                                )
                           ) : (
                                <div className="p-8 w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-center">
                                    <h2 className="text-2xl md:text-4xl font-bold text-gray-800 dark:text-gray-200 font-serif leading-relaxed italic">
                                        "{localPost.content}"
                                    </h2>
                                </div>
                           )}
                        </div>

                        {/* RIGHT: Interaction Section */}
                        <div className="w-full md:w-[40%] h-[60%] md:h-full flex flex-col bg-white dark:bg-neutral-900">
                            
                            {/* Header: Author Info */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-neutral-800">
                                <div className="flex items-center gap-3">
                                    <img src={localPost.profilepic} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-neutral-700" alt="Author" />
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white text-sm">{localPost.user_name}</p>
                                        {(localPost.institute_name || localPost.university_name) && (
                                            <p className="text-xs text-gray-500 line-clamp-1">{localPost.institute_name} {localPost.university_name ? `• ${localPost.university_name}` : ''}</p>
                                        )}
                                    </div>
                                </div>
                                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                    <MoreHorizontal size={20} />
                                </button>
                            </div>

                            {/* Scrollable Comments & Caption */}
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                                
                                {/* Caption */}
                                {(localPost.content && localPost.mediaUrl) || localPost.caption ? (
                                    <div className="flex items-start gap-3 mb-6">
                                        <img src={localPost.profilepic} className="w-8 h-8 rounded-full object-cover shrink-0" alt="Author" />
                                        <div className="pt-1">
                                            <span className="font-bold text-gray-900 dark:text-white text-sm mr-2">{localPost.user_name}</span>
                                            <span className="text-sm text-gray-800 dark:text-gray-200">
                                                {localPost.content && localPost.mediaUrl ? localPost.content : localPost.caption}
                                            </span>
                                            {localPost.caption && localPost.content && localPost.mediaUrl && (
                                                <p className="text-sm text-gray-500 italic mt-1">{localPost.caption}</p>
                                            )}
                                        </div>
                                    </div>
                                ) : null}

                                {/* Comments List */}
                                <div className="space-y-4">
                                    {localPost.comments?.map((comment, index) => (
                                        <div key={comment._id || index} className="flex items-start gap-3">
                                            <img src={comment.profilepic} className="w-8 h-8 rounded-full object-cover shrink-0" alt="Commenter" />
                                            <div className="flex-1">
                                                <div className="bg-gray-50 dark:bg-neutral-800 p-3 rounded-2xl rounded-tl-none">
                                                    <span className="font-bold text-gray-900 dark:text-white text-sm block mb-1">{comment.user_name}</span>
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{comment.text}</span>
                                                </div>
                                                
                                                <div className="flex items-center gap-4 mt-1 ml-2">
                                                    <span className="text-[11px] text-gray-400">
                                                        {new Date(comment.createdAt).toLocaleDateString()}
                                                    </span>
                                                    <button 
                                                        onClick={() => setActiveReplyBox(activeReplyBox === comment._id ? null : comment._id)}
                                                        className="text-[11px] font-bold text-gray-500 hover:text-blue-500 transition-colors"
                                                    >
                                                        Reply
                                                    </button>
                                                </div>

                                                {/* Replies */}
                                                {comment.replies?.length > 0 && (
                                                    <div className="mt-3 space-y-3">
                                                        {comment.replies.map((reply, rIndex) => (
                                                            <div key={reply._id || rIndex} className="flex items-start gap-2">
                                                                <img src={reply.profilepic} className="w-6 h-6 rounded-full object-cover shrink-0" alt="Replier" />
                                                                <div className="flex-1">
                                                                    <div className="bg-gray-50/50 dark:bg-neutral-800/50 p-2 rounded-xl rounded-tl-none">
                                                                        <span className="font-bold text-gray-900 dark:text-white text-xs mr-2">{reply.user_name}</span>
                                                                        {reply.user_id === localPost.authorId && (
                                                                            <span className="text-[9px] bg-blue-100 text-blue-600 px-1 py-0.5 rounded font-bold mr-2 uppercase">Author</span>
                                                                        )}
                                                                        <span className="text-xs text-gray-700 dark:text-gray-300">{reply.text}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Reply Input Box */}
                                                {activeReplyBox === comment._id && (
                                                    <div className="flex gap-2 mt-3 pl-2">
                                                        <input 
                                                            type="text"
                                                            placeholder={`Reply to ${comment.user_name}...`}
                                                            value={replyText[comment._id] || ''}
                                                            onChange={(e) => setReplyText({...replyText, [comment._id]: e.target.value})}
                                                            className="flex-1 bg-gray-100 dark:bg-neutral-800 text-xs px-3 py-2 rounded-full focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-white"
                                                            onKeyDown={(e) => { if (e.key === 'Enter') handleReply(comment._id); }}
                                                        />
                                                        <button 
                                                            onClick={() => handleReply(comment._id)}
                                                            className="text-white bg-blue-500 hover:bg-blue-600 p-2 rounded-full transition-colors flex shrink-0 items-center justify-center disable:opacity-50"
                                                            disabled={!replyText[comment._id]?.trim() || isSubmitting}
                                                        >
                                                            <Send size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {(!localPost.comments || localPost.comments.length === 0) && (
                                        <div className="text-center py-8">
                                            <p className="text-gray-400 text-sm">No comments yet. Start the conversation!</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer: Action Buttons & Comment Imput */}
                            <div className="border-t border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 relative z-20">
                                {/* Action Buttons */}
                                <div className="p-3 flex items-center gap-4">
                                    <button 
                                        onClick={handleLike}
                                        className="flex items-center gap-1.5 focus:outline-none hover:scale-105 transition-transform"
                                    >
                                        <Heart 
                                            size={24} 
                                            className={`transition-colors ${isLiked ? 'fill-red-500 text-red-500 stroke-red-500' : 'text-gray-800 dark:text-white hover:text-gray-500'}`} 
                                        />
                                        <span className="font-semibold text-gray-900 dark:text-white text-sm">{localPost.likes?.length || 0}</span>
                                    </button>
                                    <button className="flex items-center gap-1.5 focus:outline-none hover:scale-105 transition-transform">
                                        <MessageCircle size={24} className="text-gray-800 dark:text-white" />
                                        <span className="font-semibold text-gray-900 dark:text-white text-sm">{localPost.comments?.length || 0}</span>
                                    </button>
                                </div>
                                <div className="px-4 pb-2 text-xs text-gray-400 font-medium">
                                    {new Date(localPost.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                </div>
                                
                                {/* Add Comment Box */}
                                <form onSubmit={handleComment} className="flex border-t border-gray-100 dark:border-neutral-800 p-1 pl-4 items-center">
                                    <input 
                                        type="text" 
                                        placeholder="Add a comment..."
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        className="flex-1 bg-transparent border-none focus:outline-none text-sm text-gray-900 dark:text-white disabled:opacity-50"
                                        disabled={isSubmitting}
                                    />
                                    <button 
                                        type="submit"
                                        disabled={!commentText.trim() || isSubmitting}
                                        className="text-blue-500 font-bold text-sm px-4 py-3 disabled:opacity-50 hover:text-blue-600 transition-colors uppercase tracking-wide"
                                    >
                                        Post
                                    </button>
                                </form>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
