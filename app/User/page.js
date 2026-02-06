"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Sidebar from '../Components/Sidebar'
import { fetchuser, find_following, fetchfriendrequest, upload_written_post, fetchpost } from '@/actions/useractions'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { sendPrompt } from '@/utils/sendPrompt'
import { motion } from 'framer-motion'
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

    let follo = await find_following(session.user.email)
    setfollowing(follo);
    let folowing = await fetchfriendrequest(session.user.email)
    setfollowers(folowing)
    console.log("user id is", u);

    let written = await fetchpost(u._id);
    setwritten_post(written)

  }

  const handleChange = (e) => {
    setWritten_form({ ...Written_form, [e.target.name]: e.target.value })
  }
  const handleSubmit = async (e) => {
    console.log(Written_form.user_id, Written_form.caption);
    let a = await upload_written_post(e, form._id, form.institute_name, form.university, form.profilepic, form.user_name)
    if (a) {
      alert("post uploaded")
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
    <>
      <div className='flex'>
        <Sidebar className='flex-1' />
        <div className='flex flex-col w-full'>
          <div className="flex justify-center items-center max-w-4xl mx-auto px-4 py-6">
            {/* Profile Header */}
            <div className="flex items-center gap-10 border-2 
     rounded-xl m-2 p-4 
      border-emerald-500">
              {/* Avatar */}
              <div className='flex flex-col items-center justify-center gap-5'>
                <div className="flex flex-row w-32 h-32 rounded-full overflow-hidden border">
                  <img
                    src={form.profilepic}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                <Link href={{
                  pathname: "/verify",
                  query: { name: form.name, institute_name: form.institute_name }
                }}> <button className='cursor-pointer border-2 hover:bg-green-200 rounded-2xl m-auto p-2 flex items-center justify-center'>Verify Profile</button></Link>
              </div>

              {/* User Info */}
              <div className="flex-1">
                <div className="flex items-center gap-4">

                  <h2 className="text-2xl font-semibold">{form.username}</h2>
                  <Link href={{
                    pathname: "/Updateuser",
                    query: { username: form.email }
                  }}> <button

                    className="px-4 py-1 text-sm border rounded-lg hover:bg-gray-100"
                  >
                      Edit Profile
                    </button></Link>
                </div>

                {/* Stats */}
                <div className="flex gap-6 mt-4">
                  <span>
                    <b>coming</b> posts
                  </span>
                  <span>
                    <b onClick={() => { setseefollower(true) }}>{followers.length}</b> followers
                  </span>
                  <span>
                    <b onClick={() => { setseefollower(false) }}>{following.length}</b> following
                  </span>
                </div>

                {/* Bio */}
                <div className="mt-4">
                  <p className="font-semibold">{form.name}</p>
                  <p className="text-sm">{form.bio}</p>
                </div>
              </div>
              <button onClick={() => { setpost(true) }}>Post Now!</button>
            </div>
          </div>


          {post ? <>
            <div className="max-w-2xl mx-auto my-5 bg-white rounded-lg shadow-xl p-8 border border-gray-200">
              <form action={handleSubmit} >
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Write to laugh, to learn, to understand, to share</h2>

                {/* Post Content */}
                <div className="mb-6">
                  <label htmlFor="post-content" className="block text-gray-700 font-semibold mb-2">Post Content</label>
                  <textarea
                    value={Written_form.content ? Written_form.content : ""}
                    onChange={handleChange}
                    type="text" name='content'
                    id="content"
                    rows="6"
                    placeholder="What's on your mind? Share your thoughts with others let your thoughts shine!!!"
                    className="w-full px-4 py-3 text-gray-700 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
                    required
                  ></textarea>
                </div>

                {/* Caption Input and Generator Button */}
                <div className="mb-6">
                  <label htmlFor="caption" className="block text-gray-700 font-semibold mb-2">Caption</label>
                  <div className="relative flex items-stretch">
                    <input
                      type="text"
                      id="caption"
                      name="caption"
                      value={Written_form.caption ? Written_form.caption : ""}
                      onChange={handleChange}
                      placeholder="Add a caption, or generate one..."
                      className="flex-grow px-4 py-3 text-gray-700 bg-gray-100 rounded-lg rounded-r-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
                    />
                    <button
                      onClick={handleGenerate} // 🚨 Use the new handler 🚨
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-r-lg transition-colors duration-200 disabled:bg-gray-400"
                      disabled={isGenerating || !Written_form.content} // Disable if generating or no content
                    >
                      {isGenerating ? 'Generating...' : 'Generate'}
                    </button>
                  </div>
                  {/* Caption Error Display */}
                  {captionError && (
                    <p className="text-sm text-red-500 mt-2">{captionError}</p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="text-center">
                  <button
                    type="submit"
                    className="w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-transform transform hover:scale-105 duration-300"
                  >
                    Post Content
                  </button>
                </div>
              </form>
            </div>
          </> :
            (

                  //                   user_id:{type:String,required:true},
    // caption:{type:String},
    // content:{type:String,required:true},
    // institute_name:{type:String},
    // university_name:{type:String},
    // user_name:{type:String},
    // profilepic:{type:String},

              <div className="flex flex-row gap-8 w-full bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 p-8 rounded-lg">

                \    <div className="w-1/2 bg-white/80 dark:bg-gray-900/70 rounded-2xl shadow-xl border border-blue-100 dark:border-gray-700 p-6 backdrop-blur-sm">
                  <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-4 flex items-center gap-2">
                    📝 Your Posts
                  </h2>

                  {written_post.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
                      No posts yet! 💭 Start sharing your thoughts!
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {written_post.map((post, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.02 }}
                          className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 border border-blue-200 dark:border-gray-600 rounded-xl shadow-md"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <img
                              src={post.profilepic}
                              alt="user"
                              className="w-10 h-10 rounded-full object-cover border border-blue-300"
                            />
                            <div>
                              <p className="font-semibold text-gray-800 dark:text-gray-100">{post.user_name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{post.institute_name}</p>
                            </div>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 mb-2">{post.content}</p>
                          {post.caption && (
                            <p className="text-sm italic text-blue-600 dark:text-blue-300">"{post.caption}"</p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="w-1/2 bg-white/80 dark:bg-gray-900/70 rounded-2xl shadow-xl border border-purple-100 dark:border-gray-700 p-6 backdrop-blur-sm">
                  {seefollower ? (
                    <>
                      <h2 className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-4 flex items-center gap-2">
                        🌸 Your Followers
                      </h2>
                      {followers.length === 0 ? (
                        <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
                          No followers yet 😢
                        </div>
                      ) : (



                        <div className="grid sm:grid-cols-2 gap-6">
                          {followers.map((user, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                              whileHover={{ scale: 1.05 }}
                              className="p-4 rounded-2xl bg-gradient-to-b from-purple-50 to-pink-50 
                             dark:from-gray-800 dark:to-gray-700 shadow-lg 
                             border border-purple-200 dark:border-purple-600 
                             flex flex-col items-center hover:shadow-xl transition"
                            >
                              <img
                                src={user.sender_profilepic}
                                alt={user.sender_email}
                                width={70}
                                height={70}
                                className="rounded-full object-cover border-4 border-purple-400 shadow-sm"
                              />
                              {/* <h3 className="mt-3 font-semibold text-gray-800 dark:text-gray-100">{user.name}</h3> */}
                             <Link href={{
                pathname:"/ViewFriends",
                query:{friend_email:user.sender_email,user_email:session.user.email}
              }}> <p className="text-sm text-gray-500 dark:text-gray-400">@{user.sender_email}</p></Link>
                              {/* <p className="text-xs mt-2 text-center text-gray-500 dark:text-gray-400 line-clamp-2">{user.bio}</p> */}
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-4 flex items-center gap-2">
                        💫 People You Follow
                      </h2>
                      {following.length === 0 ? (
                        <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
                          You’re not following anyone yet 👀
                        </div>
                      ) : (
                        <div className="grid sm:grid-cols-2 gap-6">
                          {following.map((user, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                              whileHover={{ scale: 1.05 }}
                              className="p-4 rounded-2xl bg-gradient-to-b from-blue-50 to-cyan-50 
                             dark:from-gray-800 dark:to-gray-700 shadow-lg 
                             border border-blue-200 dark:border-blue-600 
                             flex flex-col items-center hover:shadow-xl transition"
                            >
                              <img
                                src={user.sender_profilepic}
                                alt={user.name}
                                width={70}
                                height={70}
                                className="rounded-full object-cover border-4 border-blue-400 shadow-sm"
                              />
                              {/* <h3 className="mt-3 font-semibold text-gray-800 dark:text-gray-100">{user.name}</h3> */}
                              <p className="text-sm text-gray-500 dark:text-gray-400">@{user.sender_email}</p>
                              {/* <p className="text-xs mt-2 text-center text-gray-500 dark:text-gray-400 line-clamp-2">{user.bio}</p> */}
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
        </div>
      </div>

    </>

  )
}

export default page