"use client"
import React from 'react'
import { fetchotheruser } from '@/actions/useractions'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Sidebar from '../Components/Sidebar'
const Page = () => {
  const [friends, setfriends] = useState([])//other users are fetched and stored in array here
  const { data: session } = useSession()
  useEffect(() => {
    getdata();

  }, [session])

  const getdata = async () => {
    //getting all tge users from the db
    console.log();

    let friendsdata = await fetchotheruser(session.user.email)
    setfriends(friendsdata)
    console.log(friendsdata)
    //write function and actions to fetch recommended frends
  }
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className="flex-1" />

      <section className="container bg-white dark:bg-gray-900 w-full overflow-y-auto">
        <div className="py-8 px-4 mx-auto max-w-screen-xl text-center lg:py-16 lg:px-6">
          <div className="mx-auto mb-8 max-w-screen-sm lg:mb-16">
            <h2 className="mb-4 text-4xl tracking-tight font-extrabold text-gray-900 dark:text-white">
              Your TeenGram Network
            </h2>
            <p className="font-light text-gray-500 sm:text-xl dark:text-gray-400">
              See who's here! Connect with classmates, teammates, and friends from your area to stay in the loop together.
            </p>
          </div>

          {/* Friends Grid */}
          <div className="grid gap-8 lg:gap-16 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {friends.map((p, i) => (
              <div
                key={i}
                className="text-center text-gray-500 dark:text-gray-400 hover:scale-105 transition-transform duration-200"
              >
                <img
                  className="mx-auto mb-4 w-36 h-36 rounded-full object-cover"
                  src={p.profilepic}
                  alt={`${p.name}'s avatar`}
                />
                <h3 className="mb-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  <Link href={{
                    pathname: "/ViewFriends",
                    query: { friend_email: p.email, user_email: session.user.email }
                  }}>{p.username}</Link>
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{p.university}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Page
