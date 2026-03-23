"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Sidebar from '../Components/Sidebar'
import { fetchuser, fetchFollowingAction, fetchFollowersAction, upload_written_post, fetchpost, toggleLikePost, addComment, replyToComment, uploadMoment, uploadShort } from '@/actions/useractions'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { sendPrompt } from '@/utils/sendPrompt'
import { motion, AnimatePresence } from 'framer-motion'
import { Image as ImageIcon, Video, X, Heart, MessageCircle, Send } from 'lucide-react'
import { io } from 'socket.io-client'

const page = () => {
  const router = useRouter()
  const { data: session } = useSession()
  const [form, setform] = useState({})
  const [followers, setfollowers] = useState([])
  const [following, setfollowing] = useState([])
  const [written_post, setwritten_post] = useState([])

  const [post, setpost] = useState(false)
  const [seefollower, setseefollower] = useState(true);
  const [socket, setSocket] = useState(null)

  const [Written_form, setWritten_form] = useState({})//to store the content for a written post

  // Comment State: { [postId]: "comment text" }
  const [commentInputs, setCommentInputs] = useState({});
  const [activeCommentBox, setActiveCommentBox] = useState(null); // Post ID where comment box is open

  // Reply State: { [commentId]: "reply text" }
  const [replyInputs, setReplyInputs] = useState({});
  const [activeReplyBox, setActiveReplyBox] = useState(null); // Comment ID where reply box is open

  // Moment State
  const [momentFormOpen, setMomentFormOpen] = useState(false);
  const [momentForm, setMomentForm] = useState({});

  // Short State
  const [shortFormOpen, setShortFormOpen] = useState(false);
  const [shortForm, setShortForm] = useState({});

  useEffect(() => {
    if (!session) {
      router.push("/login")
    }
    else {
      getdata()

      // Initialize Socket
      const newSocket = io('http://localhost:3000', {
        path: '/api/socket',
        addTrailingSlash: false,
      });
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Connected to socket', newSocket.id);
        // Register user? Usually done via chat logic checking email, 
        // but for public posts we just need to listen.
      });

      newSocket.on('post_updated', (data) => {
        console.log("Post updated:", data);
        // Update local state if the post is in our list
        setwritten_post(prevPosts => prevPosts.map(p => {
          if (p._id === data.postId) {
            if (data.type === 'like') {
              return { ...p, likes: data.likes };
            }
            if (data.type === 'comment') {
              // Add new comment to array
              return { ...p, comments: [...(p.comments || []), data.comment] };
            }
            if (data.type === 'reply') {
              // Add reply to the correct comment's replies array
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
  }, [session])

  const getdata = async () => {
    let u = await fetchuser(session.user.email)
    setform(u)

    // "Following": People I sent requests to (Accepted)
    let followingData = await fetchFollowingAction(session.user.email)
    setfollowing(followingData);

    // "Followers": People who sent requests to me (Accepted)
    let followersData = await fetchFollowersAction(session.user.email)
    setfollowers(followersData)

    console.log("user id is", u);

    let written = await fetchpost(u._id);
    setwritten_post(written)

  }

  const handleChange = (e) => {
    setWritten_form({ ...Written_form, [e.target.name]: e.target.value })
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Size Validation (3MB)
    if (file.size > 3 * 1024 * 1024) {
      alert("File size too large! Please upload under 3MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const type = file.type.startsWith('image/') ? 'image' : 'video';
      setWritten_form({
        ...Written_form,
        mediaUrl: reader.result,
        mediaType: type
      });
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setWritten_form({ ...Written_form, mediaUrl: '', mediaType: '' });
  };

  const handleMomentChange = (e) => {
    setMomentForm({ ...momentForm, [e.target.name]: e.target.value });
  };

  const handleMomentFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { alert("File size too large! Please upload under 3MB."); return; }

    const reader = new FileReader();
    reader.onloadend = () => {
      const type = file.type.startsWith('image/') ? 'image' : 'video';
      setMomentForm({ ...momentForm, mediaUrl: reader.result, mediaType: type });
    };
    reader.readAsDataURL(file);
  };

  const handleMomentSubmit = async (e) => {
    e.preventDefault();
    if (!momentForm.mediaUrl) {
      alert("Please select a photo or video for your moment!");
      return;
    }
    const res = await uploadMoment(form._id, form.username || form.email.split('@')[0], form.profilepic, momentForm.mediaUrl, momentForm.mediaType, momentForm.caption);
    if (res) {
      alert("Moment uploaded successfully! 🚀");
      setMomentForm({});
      setMomentFormOpen(false);
    }
  };

  const handleShortChange = (e) => {
    setShortForm({ ...shortForm, [e.target.name]: e.target.value });
  };

  const handleShortFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) { alert("Only videos are allowed for Shorts!"); return; }
    if (file.size > 20 * 1024 * 1024) { alert("File size too large! Please upload under 20MB."); return; }

    const videoElement = document.createElement('video');
    videoElement.preload = 'metadata';
    
    videoElement.onloadedmetadata = () => {
      window.URL.revokeObjectURL(videoElement.src);
      if (videoElement.duration > 60) {
        alert(`Shorts must be 1 minute or less! Your video is ${Math.round(videoElement.duration)}s long.`);
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setShortForm({ ...shortForm, mediaUrl: reader.result, mediaType: 'video' });
      };
      reader.readAsDataURL(file);
    }

    videoElement.src = URL.createObjectURL(file);
  };

  const handleShortSubmit = async (e) => {
    e.preventDefault();
    if (!shortForm.mediaUrl) {
      alert("Please select a video for your Short!");
      return;
    }
    const res = await uploadShort(form._id, form.email, form.username || form.email.split('@')[0], form.profilepic, form.institute_name, form.university, shortForm.caption, shortForm.mediaUrl);
    if (res) {
      alert("Short uploaded successfully! 🎬");
      setShortForm({});
      setShortFormOpen(false);
    }
  };

  const handleSubmit = async (e) => {
    console.log(Written_form.user_id, Written_form.caption);
    // Pass Written_form.mediaUrl and mediaType directly
    let a = await upload_written_post(e, form._id, form.institute_name, form.university, form.profilepic, form.user_name, Written_form.mediaUrl, Written_form.mediaType)
    if (a) {
      alert("post uploaded")
      setWritten_form({}); // Clear form
      // Refresh posts
      let written = await fetchpost(form._id);
      setwritten_post(written);
    }
    setpost(false)

  }
  const [isGenerating, setIsGenerating] = useState(false);
  const [captionError, setCaptionError] = useState(null)
  const handleGenerate = async (e) => {
    // Prevent the outer form from submitting when the Generate button is clicked
    e.preventDefault();

    const contentToAnalyze = Written_form.content;

    if (!contentToAnalyze || contentToAnalyze.trim() === '') {
      setCaptionError("Please write some content first to generate a caption.");
      return;
    }

    setIsGenerating(true);
    setCaptionError(null);

    try {
      // 1. Construct the specific prompt (Prompt Engineering)
      // This is the instruction string sent to the AI model
      const specificPrompt = `You are a witty, positive, and relatable social media assistant for teenagers. Write a single, short, engaging caption (1-2 sentences, max 100 characters) for a post based on this content: "${contentToAnalyze}"`;

      // 2. Use the clean utility function to call the backend API route
      const generatedText = await sendPrompt(specificPrompt);

      if (generatedText) {
        // Success: Update the form state with the new caption
        setWritten_form(prev => ({ ...prev, caption: generatedText }));
      } else {
        // Handle case where API call fails (returns null from sendCaption due to error logging)
        setCaptionError('AI could not generate a response. Please try again.');
      }

    } catch (error) {
      // This catch handles errors thrown directly by the sendCaption utility
      console.error("AI Caption Error:", error);
      setCaptionError(error.message || 'Error connecting to AI service.');
    } finally {
      setIsGenerating(false);
    }
  };

  // --- SOCIAL ACTIONS ---
  const onLike = async (postId) => {
    // Optimistic Update
    setwritten_post(prev => prev.map(p => {
      if (p._id === postId) {
        const userId = form._id;
        const isLiked = p.likes?.includes(userId);
        return {
          ...p,
          likes: isLiked ? p.likes.filter(id => id !== userId) : [...(p.likes || []), userId]
        };
      }
      return p;
    }));

    const res = await toggleLikePost(postId, form._id, form.email, form.name, form.profilepic);
    if (res.success) {
      // Emit socket event to notify others
      socket.emit('post_reaction', { postId, type: 'like', likes: res.likes, recipientEmail: null }); // recipientEmail handled by server for notif
    }
  };

  const onComment = async (postId) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    const res = await addComment(postId, form._id, form.email, form.name, form.profilepic, text);
    if (res.success) {
      setCommentInputs({ ...commentInputs, [postId]: '' });
      // Emit socket event
      socket.emit('post_reaction', { postId, type: 'comment', comment: res.comment, recipientEmail: null });
    }
  };

  const onReply = async (postId, commentId) => {
    const text = replyInputs[commentId];
    if (!text || !text.trim()) return;

    const res = await replyToComment(postId, commentId, form._id, form.email, form.name, form.profilepic, text);
    if (res.success) {
      setReplyInputs({ ...replyInputs, [commentId]: '' });
      setActiveReplyBox(null);
      // Emit socket event
      socket.emit('post_reaction', { postId, type: 'reply', commentId, reply: res.reply, recipientEmail: null });
    }
  };


  return (
    <div className="flex bg-gray-50 h-screen w-full overflow-hidden">
      <Sidebar className="flex-1" />

      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* --- Profile Header Card --- */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden relative">
            {/* Background Banner */}
            <div className="h-32 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

            <div className="px-8 pb-8">
              <div className="relative flex flex-col md:flex-row items-end -mt-12 mb-6 gap-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
                    <img
                      src={form.profilepic || "https://via.placeholder.com/150"}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Verification Badge (Optional) */}
                  {form.verified && (
                    <div className="absolute bottom-2 right-2 bg-blue-500 text-white p-1 rounded-full border-2 border-white">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* User Info & Actions */}
                <div className="flex-1 w-full md:w-auto text-center md:text-left">
                  <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">{form.name || "User Name"}</h1>
                      <p className="text-gray-500 font-medium">@{form.username || "username"}</p>
                      {form.institute_name && (
                        <p className="text-sm text-indigo-600 font-medium mt-1">{form.institute_name} {form.university ? `• ${form.university}` : ''}</p>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <Link href={{
                        pathname: "/Updateuser",
                        query: { email: form.email }
                      }}>
                        <button className="px-6 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
                          Edit Profile
                        </button>
                      </Link>

                      <Link href={{
                        pathname: "/verify",
                        query: { name: form.name, institute_name: form.institute_name }
                      }}>
                        <button className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:shadow-lg hover:opacity-90 transition-all shadow-md">
                          Verify Check
                        </button>
                      </Link>
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="mt-4 max-w-2xl text-gray-600 leading-relaxed">
                    {form.bio || "No bio yet."}
                  </div>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-6">
                <div className="text-center p-4 rounded-2xl bg-gray-50 hover:bg-indigo-50 transition-colors cursor-pointer">
                  <span className="block text-2xl font-bold text-indigo-600">{written_post.length}</span>
                  <span className="text-gray-500 text-sm font-medium uppercase tracking-wide">Posts</span>
                </div>
                <div
                  onClick={() => setseefollower(true)}
                  className={`text-center p-4 rounded-2xl transition-colors cursor-pointer ${seefollower ? 'bg-indigo-50 ring-2 ring-indigo-100' : 'bg-gray-50 hover:bg-gray-100'}`}
                >
                  <span className="block text-2xl font-bold text-indigo-600">{followers.length}</span>
                  <span className="text-gray-500 text-sm font-medium uppercase tracking-wide">Followers</span>
                </div>
                <div
                  onClick={() => setseefollower(false)}
                  className={`text-center p-4 rounded-2xl transition-colors cursor-pointer ${!seefollower ? 'bg-indigo-50 ring-2 ring-indigo-100' : 'bg-gray-50 hover:bg-gray-100'}`}
                >
                  <span className="block text-2xl font-bold text-indigo-600">{following.length}</span>
                  <span className="text-gray-500 text-sm font-medium uppercase tracking-wide">Following</span>
                </div>
              </div>
            </div>
          </div>

          {/* --- Post Creation Section --- */}
          <div className="flex justify-end gap-3 flex-wrap">
            <button
              onClick={() => { setShortFormOpen(!shortFormOpen); setMomentFormOpen(false); setpost(false); }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              <Video size={18} />
              <span>Add Short</span>
            </button>

            <button
              onClick={() => { setMomentFormOpen(!momentFormOpen); setShortFormOpen(false); setpost(false); }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              <span>⏱️ Add Moment</span>
            </button>

            <button
              onClick={() => { setpost(!post); setMomentFormOpen(false); setShortFormOpen(false); }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              <span>✨ Create New Post</span>
            </button>
          </div>

          {shortFormOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-xl p-8 border border-orange-100 mt-4"
            >
              <form onSubmit={handleShortSubmit}>
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500 mb-6 font-serif">Upload a Short 🎬</h2>
                <p className="text-gray-500 text-sm mb-4">Shorts must be videos under 1 minute.</p>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      value={shortForm.caption || ""}
                      onChange={handleShortChange}
                      name="caption"
                      placeholder="Give your Short a catchy title..."
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-orange-500 transition-all"
                    />
                  </div>
                </div>

                {/* Media Preview */}
                {shortForm.mediaUrl && (
                  <div className="relative mt-4 w-fit max-w-full">
                    <button
                      type="button"
                      onClick={() => setShortForm({ ...shortForm, mediaUrl: '', mediaType: '' })}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 z-10"
                    >
                      <X size={16} />
                    </button>
                    <video src={shortForm.mediaUrl} controls className="h-40 w-auto rounded-lg border border-gray-200" />
                  </div>
                )}

                <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                  <div className="flex gap-2">
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl cursor-pointer hover:bg-orange-50 hover:text-orange-600 transition-colors">
                      <Video size={20} />
                      <span className="text-sm font-semibold">Select Video</span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleShortFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <button type="submit" className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl hover:shadow-lg transition-all shadow-md">
                    Upload Short
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {momentFormOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-xl p-8 border border-pink-100"
            >
              <form onSubmit={handleMomentSubmit}>
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500 mb-6 font-serif">Share a Moment ⏱️</h2>
                <p className="text-gray-500 text-sm mb-4">Moments disappear automatically after 24 hours.</p>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      value={momentForm.caption || ""}
                      onChange={handleMomentChange}
                      name="caption"
                      placeholder="Add a snappy caption..."
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-pink-500 transition-all"
                    />
                  </div>
                </div>

                {/* Media Preview */}
                {momentForm.mediaUrl && (
                  <div className="relative mt-4 w-fit max-w-full">
                    <button
                      type="button"
                      onClick={() => setMomentForm({ ...momentForm, mediaUrl: '', mediaType: '' })}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 z-10"
                    >
                      <X size={16} />
                    </button>

                    {momentForm.mediaType === 'image' ? (
                      <img src={momentForm.mediaUrl} alt="Preview" className="h-40 w-auto rounded-lg border border-gray-200" />
                    ) : (
                      <video src={momentForm.mediaUrl} controls className="h-40 w-auto rounded-lg border border-gray-200" />
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                  <div className="flex gap-2">
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl cursor-pointer hover:bg-pink-50 hover:text-pink-600 transition-colors">
                      <ImageIcon size={20} />
                      <span className="text-sm font-semibold">Photo/Video</span>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleMomentFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <button type="submit" className="px-8 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl hover:shadow-lg transition-all shadow-md">
                    Upload Moment
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {post && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100"
            >
              <form action={handleSubmit}>
                <h2 className="text-2xl font-bold text-gray-800 mb-6 font-serif">Share your thoughts 💭</h2>

                <textarea
                  value={Written_form.content || ""}
                  onChange={handleChange}
                  name="content"
                  rows="4"
                  placeholder="What's making you laugh or think today?"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-indigo-500 transition-all mb-4 text-gray-800 placeholder-gray-400"
                  required
                />

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <input type="hidden" name="mediaUrl" value={Written_form.mediaUrl || ""} />
                    <input type="hidden" name="mediaType" value={Written_form.mediaType || ""} />
                    <input
                      value={Written_form.caption || ""}
                      onChange={handleChange}
                      name="caption"
                      placeholder="Add a witty caption..."
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating || !Written_form.content}
                      className="absolute right-2 top-2 px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-200 disabled:opacity-50 transition-colors"
                    >
                      {isGenerating ? '🪄 Generating...' : '🪄 AI Caption'}
                    </button>
                  </div>
                </div>

                {/* Media Preview */}
                {Written_form.mediaUrl && (
                  <div className="relative mt-4 w-fit max-w-full">
                    <button
                      type="button"
                      onClick={removeMedia}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 z-10"
                    >
                      <X size={16} />
                    </button>

                    {Written_form.mediaType === 'image' ? (
                      <img src={Written_form.mediaUrl} alt="Preview" className="h-40 w-auto rounded-lg border border-gray-200" />
                    ) : (
                      <video src={Written_form.mediaUrl} controls className="h-40 w-auto rounded-lg border border-gray-200" />
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                  <div className="flex gap-2">
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl cursor-pointer hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                      <ImageIcon size={20} />
                      <span className="text-sm font-semibold">Photo/Video</span>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <button type="submit" className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md">
                    Post It!
                  </button>
                </div>

                {captionError && <p className="text-red-500 text-sm mt-2">{captionError}</p>}
              </form>
            </motion.div>
          )}

          {/* --- Main Content Grid --- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Left Column: Your Posts */}
            <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                📝 Your Timeline
              </h2>

              {written_post.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <p>No posts yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {written_post.map((p, i) => (
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      key={i}
                      className="bg-gray-50 p-5 rounded-2xl hover:shadow-md transition-shadow border border-gray-100"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <img src={p.profilepic} className="w-10 h-10 rounded-full object-cover" alt="avatar" />
                        <div>
                          <h4 className="font-bold text-gray-900">{p.user_name}</h4>
                          <p className="text-xs text-gray-500">{p.institute_name}</p>
                        </div>
                      </div>
                      <p className="text-gray-800 leading-relaxed mb-3">{p.content}</p>

                      {/* Media Rendering */}
                      {p.mediaType === 'image' && (
                        <div className="rounded-xl overflow-hidden mb-3 border border-gray-100">
                          <img src={p.mediaUrl} alt="Post media" className="w-full h-auto object-cover max-h-[500px]" />
                        </div>
                      )}
                      {p.mediaType === 'video' && (
                        <div className="rounded-xl overflow-hidden mb-3 border border-gray-100 bg-black">
                          <video src={p.mediaUrl} controls className="w-full h-auto max-h-[500px]" />
                        </div>
                      )}

                      {p.caption && (
                        <div className="pl-4 border-l-4 border-indigo-200 italic text-indigo-600 text-sm mb-3">
                          {p.caption}
                        </div>
                      )}

                      {/* --- SOCIAL BUTTONS --- */}
                      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-200">
                        {/* Like Button */}
                        <button
                          className="flex items-center gap-1.5 text-gray-500 transition-colors cursor-not-allowed opacity-60"
                          title="You cannot like your own post."
                        >
                          <Heart
                            size={20}
                            fill={p.likes?.includes(form._id) ? "currentColor" : "none"}
                            className={p.likes?.includes(form._id) ? "text-pink-500" : ""}
                          />
                          <span className="font-semibold text-sm">{p.likes?.length || 0}</span>
                        </button>

                        {/* Comment Button */}
                        <button
                          onClick={() => setActiveCommentBox(activeCommentBox === p._id ? null : p._id)}
                          className="flex items-center gap-1.5 text-gray-500 hover:text-blue-500 transition-colors"
                        >
                          <MessageCircle size={20} />
                          <span className="font-semibold text-sm">{p.comments?.length || 0}</span>
                        </button>
                      </div>

                      {/* --- COMMENTS SECTION --- */}
                      <AnimatePresence>
                        {activeCommentBox === p._id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-3 overflow-hidden"
                          >
                            {/* Comments List */}
                            <div className="space-y-3 mb-3 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                              {p.comments?.map((c, idx) => (
                                <div key={idx} className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm text-sm">
                                  <div className="flex items-start gap-2">
                                    <img src={c.profilepic} className="w-6 h-6 rounded-full mt-1" alt="pic" />
                                    <div className="flex-1">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <span className="font-bold text-gray-800 mr-2">{c.user_name}</span>
                                          <span className="text-gray-600">{c.text}</span>
                                        </div>
                                        {/* Admin Reply Toggle */}
                                        <button 
                                          onClick={() => setActiveReplyBox(activeReplyBox === c._id ? null : c._id)}
                                          className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold"
                                        >
                                          Reply
                                        </button>
                                      </div>
                                      
                                      {/* Replies List */}
                                      {c.replies?.length > 0 && (
                                        <div className="mt-2 pl-3 border-l-2 border-indigo-100 space-y-2">
                                          {c.replies.map((r, rIdx) => (
                                            <div key={rIdx} className="flex items-start gap-2 text-xs">
                                              <img src={r.profilepic} className="w-4 h-4 rounded-full mt-0.5" alt="pic" />
                                              <div>
                                                <span className="font-bold text-indigo-800 mr-1">{r.user_name}</span>
                                                <span className="bg-indigo-100 text-indigo-800 text-[9px] px-1 rounded mr-2 font-bold tracking-wide">AUTHOR</span>
                                                <span className="text-gray-600">{r.text}</span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Reply Input Box */}
                                      {activeReplyBox === c._id && (
                                        <div className="flex gap-2 mt-2 pt-2 border-t border-gray-50">
                                          <input
                                            type="text"
                                            placeholder="Write a reply..."
                                            className="flex-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs text-gray-900 focus:outline-none focus:border-indigo-400"
                                            value={replyInputs[c._id] || ''}
                                            onChange={(e) => setReplyInputs({ ...replyInputs, [c._id]: e.target.value })}
                                            onKeyDown={(e) => { if (e.key === 'Enter') onReply(p._id, c._id); e.stopPropagation(); }}
                                          />
                                          <button
                                            onClick={() => onReply(p._id, c._id)}
                                            className="px-3 bg-indigo-500 text-white text-xs font-semibold rounded hover:bg-indigo-600 transition-colors uppercase tracking-wider"
                                          >
                                            Reply
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {(!p.comments || p.comments.length === 0) && (
                                <p className="text-gray-400 text-xs text-center">No comments yet. Be the first!</p>
                              )}
                            </div>

                            {/* Comment Input */}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Write a comment..."
                                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-400 placeholder-gray-500"
                                value={commentInputs[p._id] || ''}
                                onChange={(e) => setCommentInputs({ ...commentInputs, [p._id]: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && onComment(p._id)}
                              />
                              <button
                                onClick={() => onComment(p._id)}
                                className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
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

            {/* Right Column: Toggles (Followers/Following) */}
            <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100 h-fit sticky top-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  {seefollower ? '🌸 Followers' : '💫 Following'}
                </h2>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button
                    onClick={() => setseefollower(true)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${seefollower ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Followers
                  </button>
                  <button
                    onClick={() => setseefollower(false)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${!seefollower ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Following
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                {(seefollower ? followers : following).length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    {seefollower ? "No followers yet." : "Not following anyone yet."}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(seefollower ? followers : following).map((user, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ scale: 1.02 }}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                      >
                        <img
                          src={user.sender_profilepic}
                          alt="avatar"
                          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                        <div className="min-w-0">
                          <Link
                            href={{ pathname: "/ViewFriends", query: { friend_email: user.sender_email, user_email: session.user.email } }}
                            className="block font-semibold text-gray-900 truncate hover:text-indigo-600"
                          >
                            {user.sender_username || user.sender_email.split('@')[0]}
                          </Link>
                          {/* <p className="text-xs text-gray-500 truncate">@{user.sender_email}</p> */}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}

export default page