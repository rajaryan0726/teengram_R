"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Sidebar from '../Components/Sidebar'
import { fetchuser, fetchFollowingAction, fetchFollowersAction, upload_written_post, fetchpost, toggleLikePost, addComment, replyToComment, uploadMoment, uploadShort, updateProfile, deletePost } from '@/actions/useractions'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { sendPrompt } from '@/utils/sendPrompt'
import { motion, AnimatePresence } from 'framer-motion'
import { Image as ImageIcon, Video, X, Heart, MessageCircle, Send, ShieldCheck, Trash2 } from 'lucide-react'
import { io } from 'socket.io-client'

const Page = () => {
  const router = useRouter()
  const { data: session } = useSession()
  const [form, setform] = useState({})
  const [followers, setfollowers] = useState([])
  const [following, setfollowing] = useState([])
  const [written_post, setwritten_post] = useState([])

  const [post, setpost] = useState(false)
  const [seefollower, setseefollower] = useState(true);
  const [socket, setSocket] = useState(null)

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);

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

  // NSFW Analysis State
  const [nsfwModel, setNsfwModel] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    let pollingInterval;

    if (!session) {
      router.push("/login")
    }
    else {
      getdata()

      // Load NSFW Model via CDN to bypass Webpack static analysis errors
      const loadModel = async () => {
        // Prevent double-loading (React StrictMode / re-renders)
        if (window.__nsfwModelLoaded) {
          if (window.__nsfwModelInstance) setNsfwModel(window.__nsfwModelInstance);
          return;
        }
        window.__nsfwModelLoaded = true;

        if (window.nsfwjs) {
          try {
            const model = await window.nsfwjs.load('/nsfw_model/model.json');
            window.__nsfwModelInstance = model;
            setNsfwModel(model);
            console.log("NSFW model loaded (cached)");
          } catch(e) { console.error(e); window.__nsfwModelLoaded = false; }
          return;
        }

        const tfScript = document.createElement('script');
        tfScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.21.0/dist/tf.min.js';
        document.head.appendChild(tfScript);

        tfScript.onload = () => {
          const nsfwScript = document.createElement('script');
          nsfwScript.src = 'https://cdn.jsdelivr.net/npm/nsfwjs@2.4.2/dist/nsfwjs.min.js';
          document.head.appendChild(nsfwScript);
          
          nsfwScript.onload = async () => {
            try {
              const model = await window.nsfwjs.load('/nsfw_model/model.json');
              window.__nsfwModelInstance = model;
              setNsfwModel(model);
              console.log("NSFW model loaded successfully");
            } catch (err) {
              console.error("Failed to load NSFW model", err);
              window.__nsfwModelLoaded = false;
            }
          };
        };
      };
      loadModel();

      // Realtime syncing just for Followers / Following list
      const pollFollowers = async () => {
        let followingData = await fetchFollowingAction(session.user.email);
        setfollowing(followingData || []);
        let followersData = await fetchFollowersAction(session.user.email);
        setfollowers(followersData || []);
      };

      pollingInterval = setInterval(pollFollowers, 5000); // 5s interval

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
        if (pollingInterval) clearInterval(pollingInterval);
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

  const analyzeMedia = async (file, fileType) => {
    if (!nsfwModel) return true; // Safe by default if model not loaded
    setIsAnalyzing(true);
    
    return new Promise((resolve) => {
      if (fileType === 'image') {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.src = URL.createObjectURL(file);
        img.onload = async () => {
          try {
            const predictions = await nsfwModel.classify(img);
            URL.revokeObjectURL(img.src);
            const isNsfw = predictions.some(p => 
              (p.className === 'Porn' || p.className === 'Hentai' || p.className === 'Sexy') && p.probability > 0.6
            );
            setIsAnalyzing(false);
            resolve(!isNsfw);
          } catch(err) {
            console.error("NSFW check failed:", err);
            setIsAnalyzing(false);
            resolve(true); // Default to safe if error
          }
        };
        img.onerror = () => { setIsAnalyzing(false); resolve(true); }
      } else if (fileType === 'video') {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.src = URL.createObjectURL(file);
        
        video.onloadeddata = () => {
          video.currentTime = Math.min(1, video.duration / 2); // check frame at 1s or middle
        };
        
        video.onseeked = async () => {
          try {
            const predictions = await nsfwModel.classify(video);
            URL.revokeObjectURL(video.src);
            const isNsfw = predictions.some(p => 
              (p.className === 'Porn' || p.className === 'Hentai' || p.className === 'Sexy') && p.probability > 0.6
            );
            setIsAnalyzing(false);
            resolve(!isNsfw);
          } catch(err) {
            console.error("NSFW check failed:", err);
            setIsAnalyzing(false);
            resolve(true);
          }
        };
        video.onerror = () => { setIsAnalyzing(false); resolve(true); }
      } else {
        setIsAnalyzing(false);
        resolve(true);
      }
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Size Validation (3MB)
    if (file.size > 3 * 1024 * 1024) {
      alert("File size too large! Please upload under 3MB.");
      return;
    }
    
    const type = file.type.startsWith('image/') ? 'image' : 'video';
    const isSafe = await analyzeMedia(file, type);
    if (!isSafe) {
      alert("NSFW/Foul content detected. Upload blocked.");
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setWritten_form({ ...Written_form, mediaUrl: reader.result, mediaType: type });
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setWritten_form({ ...Written_form, mediaUrl: '', mediaType: '' });
  };

  const handleMomentChange = (e) => {
    setMomentForm({ ...momentForm, [e.target.name]: e.target.value });
  };

  const handleMomentFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { alert("File size too large! Please upload under 3MB."); return; }

    const type = file.type.startsWith('image/') ? 'image' : 'video';
    const isSafe = await analyzeMedia(file, type);
    if (!isSafe) {
      alert("NSFW/Foul content detected. Upload blocked.");
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
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

  const handleShortFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) { alert("Only videos are allowed for Shorts!"); return; }
    if (file.size > 20 * 1024 * 1024) { alert("File size too large! Please upload under 20MB."); return; }

    const isSafe = await analyzeMedia(file, 'video');
    if (!isSafe) {
      alert("NSFW/Foul content detected. Upload blocked.");
      e.target.value = '';
      return;
    }

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


  const handleProfilePicUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("File size too large! Please upload under 3MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditForm({ ...editForm, profilepic: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const data = new FormData();
      data.append('email', form.email);
      data.append('bio', editForm.bio || '');
      data.append('about', editForm.about || '');
      data.append('interests', editForm.interests || '');
      data.append('profilepic', editForm.profilepic || '');
      
      await updateProfile(data, form.username);
      setform({ ...form, ...editForm });
      setIsEditModalOpen(false);
      alert("Profile updated successfully!");
    } catch(err) {
      console.error(err);
      alert("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex bg-gray-50 dark:bg-black h-screen w-full overflow-hidden">
      <Sidebar className="flex-1" />

      <main className="flex-1 p-2 md:p-8 overflow-y-auto pb-20 md:pb-8">
        <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">

          {/* --- Profile Header Card --- */}
          <div className="glass-panel rounded-[2rem] md:rounded-[3rem] p-4 md:p-8 relative mt-16 md:mt-24 shadow-2xl hover-3d group">
            <div className="absolute inset-0 rounded-[2rem] md:rounded-[3rem] bg-gradient-to-br from-blue-400/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
              {/* Floating 3D Avatar */}
              <div className="relative -mt-20 md:-mt-24 transition-transform duration-500 group-hover:-translate-y-4">
                <div className="w-32 h-32 md:w-48 md:h-48 rounded-[2rem] md:rounded-[3rem] border border-white/40 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden bg-white/20 dark:bg-black/40 backdrop-blur-md transform rotate-3 hover:rotate-0 transition-transform duration-500">
                  <img
                    src={form.profilepic || "https://via.placeholder.com/150"}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Verification Badge */}
                {form.verified && (
                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-white p-2 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.6)] border border-white/50 transform rotate-12">
                    <svg className="w-5 h-5 md:w-6 md:h-6 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>

              {/* User Info & Actions */}
              <div className="flex-1 w-full text-center md:text-left pt-2 md:pt-4">
                <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-4">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400 drop-shadow-sm">{form.name || "User Name"}</h1>
                    <p className="text-slate-600 dark:text-slate-300 font-bold tracking-wide mt-1">@{form.username || "username"}</p>
                    {form.institute_name && (
                      <p className="text-sm md:text-base text-cyan-600 dark:text-cyan-400 font-bold mt-2 drop-shadow-sm">{form.institute_name} {form.university ? `• ${form.university}` : ''}</p>
                    )}
                  </div>

                  <div className="flex gap-2 w-full md:w-auto">
                      <button onClick={() => { setEditForm({ ...form }); setIsEditModalOpen(true); }} className="w-full px-6 py-2 glass-card text-blue-600 dark:text-blue-300 font-bold rounded-2xl hover-3d hover:bg-white/40 dark:hover:bg-white/10 shadow-lg">
                        Edit Profile
                      </button>
                  </div>
                </div>

                {/* Bio */}
                <div className="mt-4 md:mt-6 max-w-2xl text-sm md:text-base text-slate-700 dark:text-slate-300 font-medium leading-relaxed bg-white/20 dark:bg-black/20 p-4 rounded-2xl border border-white/30 dark:border-white/5 shadow-inner">
                  {form.bio || "No bio yet."}
                </div>
              </div>
            </div>

            {/* Floating Stats Bar */}
            <div className="grid grid-cols-3 gap-3 md:gap-6 mt-8 relative z-10">
              <div className="text-center p-3 md:p-5 glass-card rounded-[1.5rem] hover-3d group/stat">
                <span className="block text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-md group-hover/stat:scale-110 transition-transform">{written_post.length}</span>
                <span className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-bold uppercase tracking-widest mt-1 block">Posts</span>
              </div>
              <div
                onClick={() => setseefollower(true)}
                className={`text-center p-3 md:p-5 glass-card rounded-[1.5rem] hover-3d cursor-pointer group/stat transition-all ${seefollower ? 'ring-2 ring-cyan-400 bg-white/40 dark:bg-white/10 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : ''}`}
              >
                <span className="block text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-md group-hover/stat:scale-110 transition-transform">{followers.length}</span>
                <span className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-bold uppercase tracking-widest mt-1 block">Followers</span>
              </div>
              <div
                onClick={() => setseefollower(false)}
                className={`text-center p-3 md:p-5 glass-card rounded-[1.5rem] hover-3d cursor-pointer group/stat transition-all ${!seefollower ? 'ring-2 ring-cyan-400 bg-white/40 dark:bg-white/10 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : ''}`}
              >
                <span className="block text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-md group-hover/stat:scale-110 transition-transform">{following.length}</span>
                <span className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-bold uppercase tracking-widest mt-1 block">Following</span>
              </div>
            </div>
          </div>

          {/* --- Post Creation Section --- */}
          <div className="flex justify-center md:justify-end gap-3 md:gap-4 flex-wrap mt-8">
            <button
              onClick={() => { setShortFormOpen(!shortFormOpen); setMomentFormOpen(false); setpost(false); }}
              className="flex items-center gap-2 px-5 md:px-8 py-3 md:py-4 glass-card text-sky-600 dark:text-sky-400 font-black tracking-widest uppercase rounded-2xl hover-3d hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all border-2 border-transparent hover:border-sky-400/50"
            >
              <Video size={20} className="drop-shadow-md" />
              <span>Short</span>
            </button>

            <button
              onClick={() => { setMomentFormOpen(!momentFormOpen); setShortFormOpen(false); setpost(false); }}
              className="flex items-center gap-2 px-5 md:px-8 py-3 md:py-4 glass-card text-blue-600 dark:text-blue-400 font-black tracking-widest uppercase rounded-2xl hover-3d hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all border-2 border-transparent hover:border-blue-400/50"
            >
              <span className="text-xl drop-shadow-md">⏱️</span>
              <span>Moment</span>
            </button>

            <button
              onClick={() => { setpost(!post); setMomentFormOpen(false); setShortFormOpen(false); }}
              className="flex items-center gap-2 px-5 md:px-8 py-3 md:py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black tracking-widest uppercase rounded-2xl hover-3d shadow-[0_10px_30px_rgba(6,182,212,0.4)] transition-all"
            >
              <span className="text-xl drop-shadow-md">✨</span>
              <span>Post</span>
            </button>
          </div>

          {shortFormOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-3xl shadow-xl p-8 border border-sky-100 dark:border-sky-900 mt-4"
            >
              <form onSubmit={handleShortSubmit}>
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-sky-500 mb-6 font-serif">Upload a Short 🎬</h2>
                <p className="text-gray-500 text-sm mb-4">Shorts must be videos under 1 minute.</p>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      value={shortForm.caption || ""}
                      onChange={handleShortChange}
                      name="caption"
                      placeholder="Give your Short a catchy title..."
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-neutral-800 rounded-xl border-0 focus:ring-2 focus:ring-sky-500 transition-all text-gray-900 dark:text-white"
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
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl cursor-pointer hover:bg-sky-50 hover:text-sky-600 transition-colors">
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

                  <button type="submit" className="px-8 py-3 bg-gradient-to-r from-sky-500 to-sky-500 text-white font-bold rounded-xl hover:shadow-lg transition-all shadow-md">
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
              className="bg-white dark:bg-neutral-900 rounded-3xl shadow-xl p-8 border border-blue-100 dark:border-blue-900"
            >
              <form onSubmit={handleMomentSubmit}>
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-500 mb-6 font-serif">Share a Moment ⏱️</h2>
                <p className="text-gray-500 text-sm mb-4">Moments disappear automatically after 24 hours.</p>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      value={momentForm.caption || ""}
                      onChange={handleMomentChange}
                      name="caption"
                      placeholder="Add a snappy caption..."
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-neutral-800 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-white"
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
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors">
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

                  <button type="submit" className="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl hover:shadow-lg transition-all shadow-md">
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
              className="bg-white dark:bg-neutral-900 rounded-3xl shadow-xl p-8 border border-gray-100 dark:border-neutral-800"
            >
              <form action={handleSubmit}>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 font-serif">Share your thoughts 💭</h2>

                <textarea
                  value={Written_form.content || ""}
                  onChange={handleChange}
                  name="content"
                  rows="4"
                  placeholder="What's making you laugh or think today?"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-neutral-800 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 transition-all mb-4 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500"
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
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-neutral-800 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating || !Written_form.content}
                      className="absolute right-2 top-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-200 disabled:opacity-50 transition-colors"
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
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors">
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

                  <button type="submit" className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md">
                    Post It!
                  </button>
                </div>

                {captionError && <p className="text-red-500 text-sm mt-2">{captionError}</p>}
              </form>
            </motion.div>
          )}

          {/* --- Main Content Grid --- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">

            {/* Left Column: Your Posts */}
            <div className="glass-panel rounded-[2rem] p-6">
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400 mb-6 flex items-center gap-2 drop-shadow-sm">
                📝 Your Timeline
              </h2>

              {written_post.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-500 font-bold glass-card rounded-2xl">
                  <p>No posts yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {written_post.map((p, i) => (
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      key={i}
                      className="glass-card p-5 rounded-[1.5rem] hover-3d relative"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <img src={p.profilepic} className="w-10 h-10 rounded-full object-cover" alt="avatar" />
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 dark:text-white">{p.user_name}</h4>
                          <p className="text-xs text-gray-500 dark:text-neutral-400">{p.institute_name}</p>
                        </div>
                        <button
                          onClick={async () => {
                            if (!confirm("Are you sure you want to delete this post?")) return;
                            const res = await deletePost(p._id, form._id);
                            if (res.success) {
                              setwritten_post(prev => prev.filter(post => post._id !== p._id));
                              alert("Post deleted successfully!");
                            } else {
                              alert(res.message || "Failed to delete post.");
                            }
                          }}
                          className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete post"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <p className="text-gray-800 dark:text-neutral-200 leading-relaxed mb-3">{p.content}</p>

                      {/* Media Rendering */}
                      {p.mediaType === 'image' && (
                        <div className="rounded-xl overflow-hidden mb-3 border border-gray-100 dark:border-neutral-700">
                          <img src={p.mediaUrl} alt="Post media" className="w-full h-auto object-cover max-h-[500px]" />
                        </div>
                      )}
                      {p.mediaType === 'video' && (
                        <div className="rounded-xl overflow-hidden mb-3 border border-gray-100 bg-black">
                          <video src={p.mediaUrl} controls className="w-full h-auto max-h-[500px]" />
                        </div>
                      )}

                      {p.caption && (
                        <div className="pl-4 border-l-4 border-blue-200 dark:border-blue-900 italic text-blue-600 dark:text-blue-400 text-sm mb-3">
                          {p.caption}
                        </div>
                      )}

                      {/* --- SOCIAL BUTTONS --- */}
                      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-200 dark:border-neutral-700">
                        {/* Like Button */}
                        <button
                          className="flex items-center gap-1.5 text-gray-500 transition-colors cursor-not-allowed opacity-60"
                          title="You cannot like your own post."
                        >
                          <Heart
                            size={20}
                            fill={p.likes?.includes(form._id) ? "currentColor" : "none"}
                            className={p.likes?.includes(form._id) ? "text-blue-500" : ""}
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
                                <div key={idx} className="bg-white dark:bg-neutral-900 p-2 rounded-lg border border-gray-100 dark:border-neutral-800 shadow-sm text-sm">
                                  <div className="flex items-start gap-2">
                                    <img src={c.profilepic} className="w-6 h-6 rounded-full mt-1" alt="pic" />
                                    <div className="flex-1">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <span className="font-bold text-gray-800 dark:text-white mr-2">{c.user_name}</span>
                                          <span className="text-gray-600 dark:text-neutral-400">{c.text}</span>
                                        </div>
                                        {/* Admin Reply Toggle */}
                                        <button
                                          onClick={() => setActiveReplyBox(activeReplyBox === c._id ? null : c._id)}
                                          className="text-xs text-blue-500 hover:text-blue-700 font-semibold"
                                        >
                                          Reply
                                        </button>
                                      </div>

                                      {/* Replies List */}
                                      {c.replies?.length > 0 && (
                                        <div className="mt-2 pl-3 border-l-2 border-blue-100 space-y-2">
                                          {c.replies.map((r, rIdx) => (
                                            <div key={rIdx} className="flex items-start gap-2 text-xs">
                                              <img src={r.profilepic} className="w-4 h-4 rounded-full mt-0.5" alt="pic" />
                                              <div>
                                                <span className="font-bold text-blue-800 dark:text-blue-400 mr-1">{r.user_name}</span>
                                                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-[9px] px-1 rounded mr-2 font-bold tracking-wide">AUTHOR</span>
                                                <span className="text-gray-600 dark:text-neutral-400">{r.text}</span>
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
                                            className="flex-1 px-2 py-1 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-400"
                                            value={replyInputs[c._id] || ''}
                                            onChange={(e) => setReplyInputs({ ...replyInputs, [c._id]: e.target.value })}
                                            onKeyDown={(e) => { if (e.key === 'Enter') onReply(p._id, c._id); e.stopPropagation(); }}
                                          />
                                          <button
                                            onClick={() => onReply(p._id, c._id)}
                                            className="px-3 bg-blue-500 text-white text-xs font-semibold rounded hover:bg-blue-600 transition-colors uppercase tracking-wider"
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
                                className="flex-1 px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-400 placeholder-gray-500 dark:placeholder-neutral-500"
                                value={commentInputs[p._id] || ''}
                                onChange={(e) => setCommentInputs({ ...commentInputs, [p._id]: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && onComment(p._id)}
                              />
                              <button
                                onClick={() => onComment(p._id)}
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

            {/* Right Column: Toggles (Followers/Following) */}
            <div className="glass-panel rounded-[2rem] p-6 h-fit sticky top-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400 drop-shadow-sm">
                  {seefollower ? '🌸 Followers' : '💫 Following'}
                </h2>
                <div className="flex bg-white/20 dark:bg-black/20 p-1 rounded-xl shadow-inner border border-white/10">
                  <button
                    onClick={() => setseefollower(true)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${seefollower ? 'bg-white/60 dark:bg-white/20 shadow-md text-blue-600 dark:text-cyan-400 border border-white/50 dark:border-white/10' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    Followers
                  </button>
                  <button
                    onClick={() => setseefollower(false)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${!seefollower ? 'bg-white/60 dark:bg-white/20 shadow-md text-blue-600 dark:text-cyan-400 border border-white/50 dark:border-white/10' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    Following
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                {(seefollower ? followers : following).length === 0 ? (
                  <div className="text-center py-10 text-slate-500 font-bold glass-card rounded-2xl">
                    {seefollower ? "No followers yet." : "Not following anyone yet."}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(seefollower ? followers : following).map((user, i) => (
                      <motion.div
                        key={i}
                        className="flex items-center gap-3 p-3 glass-card rounded-2xl hover-3d"
                      >
                        <img
                          src={user.sender_profilepic}
                          alt="avatar"
                          className="w-12 h-12 rounded-full object-cover border border-white/50 shadow-sm"
                        />
                        <div className="min-w-0">
                          <Link
                            href={{ pathname: "/ViewFriends", query: { friend_email: user.sender_email, user_email: session.user.email } }}
                            className="block font-bold text-slate-900 dark:text-white truncate hover:text-cyan-500 transition-colors"
                          >
                            {user.sender_username || user.sender_email.split('@')[0]}
                          </Link>
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

      {/* --- Edit Profile Modal --- */}
      <AnimatePresence>
        {isEditModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-neutral-800"
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-neutral-800">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Profile</h2>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                <form id="editProfileForm" onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column: Editable Fields */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 border-b border-gray-100 dark:border-neutral-800 pb-2">Editable Information</h3>
                    
                    {/* Profile Picture */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Profile Picture</label>
                      <div className="flex items-center gap-4">
                        <img src={editForm.profilepic || "https://placehold.co/150x150/png"} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-neutral-700" />
                        <label className="flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-600 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors font-semibold text-sm border border-blue-200">
                          <ImageIcon size={18} className="mr-2" />
                          Upload Image
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleProfilePicUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Bio / Description */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Profile Description (Bio)</label>
                      <textarea
                        value={editForm.bio || ''}
                        onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                        rows="2"
                        maxLength="150"
                        placeholder="A short punchy bio..."
                      ></textarea>
                    </div>

                    {/* Interests */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Your Interests</label>
                      <input
                        type="text"
                        value={editForm.interests || ''}
                        onChange={(e) => setEditForm({...editForm, interests: e.target.value})}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                        placeholder="e.g. Coding, Football, Reading"
                      />
                    </div>

                    {/* About Them */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">About You</label>
                      <textarea
                        value={editForm.about || ''}
                        onChange={(e) => setEditForm({...editForm, about: e.target.value})}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                        rows="4"
                        placeholder="Tell us a bit more about yourself..."
                      ></textarea>
                    </div>
                  </div>

                  {/* Right Column: Read-Only Registration Info */}
                  <div className="bg-gray-50 dark:bg-neutral-800/50 p-6 rounded-2xl border border-gray-100 dark:border-neutral-800 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-neutral-700 pb-2 mb-4">Registration Details</h3>
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-4 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      These fields are locked and cannot be changed.
                    </p>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {form.role && ['ADMIN', 'HEAD_ADMIN', 'SUPER_ADMIN', 'SUB_ADMIN'].includes(form.role) && (
                        <div className="col-span-2 mb-2 p-3 bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl flex items-center gap-2">
                           <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400"/>
                           <div>
                             <span className="block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-0.5">Account Role</span>
                             <span className="font-bold text-gray-900 dark:text-white capitalize">{form.role.replace('_', ' ').toLowerCase()} Tag</span>
                           </div>
                        </div>
                      )}
                      <div>
                        <span className="block text-xs font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-1">Full Name</span>
                        <span className="font-medium text-gray-900 dark:text-white">{form.name}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-1">Username</span>
                        <span className="font-medium text-gray-900 dark:text-white">@{form.username}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-xs font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-1">Email</span>
                        <span className="font-medium text-gray-900 dark:text-white">{form.email}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-1">Age</span>
                        <span className="font-medium text-gray-900 dark:text-white">{form.age || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-1">State</span>
                        <span className="font-medium text-gray-900 dark:text-white">{form.state || 'N/A'}</span>
                      </div>
                      <div className="col-span-2 mt-2 pt-4 border-t border-gray-200 dark:border-neutral-700">
                        <span className="block text-xs font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-1">Institution</span>
                        <span className="font-medium text-indigo-600 dark:text-indigo-400">{form.institute_name}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-xs font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-1">Academic Path</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {form.academic_info?.course ? `${form.academic_info.course} (${form.academic_info.year})` : form.academic_info?.standard_class || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="editProfileForm"
                  disabled={isSaving}
                  className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]"
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NSFW Analysis Overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <h3 className="text-xl font-bold font-serif mb-2">Analyzing Media...</h3>
          <p className="text-sm text-gray-300">Checking for foul or NSFW content</p>
        </div>
      )}
    </div>
  )
}

export default Page
