"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Sidebar from '../Components/Sidebar'
import { fetchuser, fetchFollowingAction, fetchFollowersAction, upload_written_post, fetchpost } from '@/actions/useractions'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { sendPrompt } from '@/utils/sendPrompt'
import { motion } from 'framer-motion'
import { Image as ImageIcon, Video, X } from 'lucide-react'
const page = () => {
  const router = useRouter()
  const { data: session } = useSession()
  const [form, setform] = useState({})
  const [followers, setfollowers] = useState([])
  const [following, setfollowing] = useState([])
  const [written_post, setwritten_post] = useState([])

  const [post, setpost] = useState(false)
  const [seefollower, setseefollower] = useState(true);

  const [Written_form, setWritten_form] = useState({})//to store the content for a written post
  useEffect(() => {
    if (!session) {
      router.push("/login")
    }
    else {
      getdata()
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

  const handleSubmit = async (e) => {
    console.log(Written_form.user_id, Written_form.caption);
    // Pass Written_form.mediaUrl and mediaType directly
    let a = await upload_written_post(e, form._id, form.institute_name, form.university, form.profilepic, form.user_name, Written_form.mediaUrl, Written_form.mediaType)
    if (a) {
      alert("post uploaded")
      setWritten_form({}); // Clear form
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
          <div className="flex justify-end">
            <button
              onClick={() => setpost(!post)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              <span>✨ Create New Post</span>
            </button>
          </div>

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
                        <div className="pl-4 border-l-4 border-indigo-200 italic text-indigo-600 text-sm">
                          {p.caption}
                        </div>
                      )}
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