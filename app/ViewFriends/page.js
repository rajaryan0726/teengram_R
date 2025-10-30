"use client"
import React from 'react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { fetchuser, makefriend,accept_request, checkfriendstatus, find_following, fetchfriendrequest, checkuserrequeststatus } from '@/actions/useractions'
import Sidebar from '../Components/Sidebar'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
const page = () => {
  const { data: session } = useSession();
  const searchParams = useSearchParams()
  const [Friend, setFriend] = useState([])
  const [requestinfo, setrequestinfo] = useState({})//to look about request of user
  const [approvalinfo, setapprovalinfo] = useState({})//to look about request to the user from his friends
  const [follower, setfollower] = useState([])
  const [following, setfollowing] = useState([])

  useEffect(() => {
    const friendemail = searchParams.get('friend_email')
    const useremail = searchParams.get('user_email')
    if (friendemail) {
      getdata(friendemail, useremail);
    }

  }, [])

  const getdata = async (friendemail, useremail) => {
    let f = await fetchuser(friendemail)
    setFriend(f);
    //getting info to check if they are friends or not
    console.log(useremail);

//do the classification based on 2 
//agar usne bheja hai request check it first
// first where the user is request sender or user has requested so he will see either pending or accepted or send request
//second user is receiver so he will see to accept or not or no request
//for first if the user



    let s = await checkfriendstatus(useremail, friendemail);// to find where i have requested and my request is accepted or not, frontend will pending or friendship
    setrequestinfo(s || null);

    console.log("here is your friend info", s);



    //to check if you have accepted the request or not
    let r = await checkuserrequeststatus(useremail, friendemail);
    setapprovalinfo(r || null);
    console.log("friend sennd the request",r);
    

    //function to get friends followers and following
    let flw = await find_following(friendemail);
    setfollowing(flw);
    let flwer = await fetchfriendrequest(friendemail);
    setfollower(flwer);
  }

  const sendrequest = () => {
    const useremail = searchParams.get('user_email')
    makefriend(useremail, Friend.email, Friend.profilepic);
  }
  const request_accept=(id) => { 
    console.log("id is ",id);
    
    accept_request(id);
   }
  return (
    <div className='flex'>
      <Sidebar className='flex-1' />
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="flex items-center gap-10 border-2 
     rounded-xl m-2 p-4 
      border-emerald-500">
          {/* Avatar */}
          <div className="w-32 h-32 rounded-full overflow-hidden border">
            <img
              src={Friend.profilepic}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>

          {/* friend reques  */}
          <div className="flex-1">
            <div className="flex items-center gap-30 ">
              <h2 className="text-2xl font-semibold">{Friend.username}</h2>
              {/* {!requestinfo&& <button onClick={() => { sendrequest() }} className="cursor-pointer text-1xl rounded-2xl border-2 p-2 m-2  border-blue-600 font-semibold font-sans">Add Request</button>}
            {requestinfo.request_accepted==false&&<button  className="cursor-pointer text-1xl rounded-2xl border-2 p-2 m-2  border-blue-600 font-semibold font-sans">Pending</button>  }
            {requestinfo.request_accepted==true && <h2 className="cursor-pointer text-1xl rounded-2xl border-2 p-2 m-2  border-blue-600 font-semibold font-sans"> Friends Forever</h2>}
             */}

                {/* {approvalinfo?(approvalinfo.request_accepted?<>You are friend</>:<>accept request</>):(requestinfo?(requestinfo.request_accepted?<>you are friends</>:<>pending</>):(<>send request</>))} */}
                
                {approvalinfo?(approvalinfo.request_accepted?(<>You are friend</>):(<button onClick={() => { request_accept(approvalinfo._id) }}>accept request</button>)):(requestinfo?(requestinfo.request_accepted?<>you are friends</>:<>pending</>):(<div onClick={() => { sendrequest() }}>send request</div>))}
             
            </div>

            {/* Stats */}
            <div className="flex gap-6 mt-4">
              <span>
                <b>coming</b> posts
              </span>
              <span>
                <b>{follower.length}</b> followers
              </span>
              <span>
                <b>{following.length}</b> following
              </span>
            </div>

            {/* Bio */}
            <div className="mt-4">
              <p className="font-semibold">{Friend.name}</p>
              <p className="text-sm">{Friend.bio}</p>
              <p className="text-sm">{Friend.institute_name}</p>
              <p className="text-sm">{Friend.university}</p>
            </div>
        <Link href={{pathname:"/Chat",query:{friend_email:Friend.email}}}>  <button className="px-4 py-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600">
        Message {Friend.username}
    </button></Link>  
          </div>
        </div>
      </div>
    </div>
  )
}

export default page
