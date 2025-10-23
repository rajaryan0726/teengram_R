"use client"
import React, { use } from 'react'
import { useSession } from 'next-auth/react'
import { useState,useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from './Sidebar'
const Landingpage = () => {

    const {data:session}=useSession()
    const router=useRouter();
    useEffect(() => {
      if(session){
        router.push('/Landingpage')
      }
    }, [router,session])
    

  return (
    <div>
    

    </div>
  )
}

export default Landingpage