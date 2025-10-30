"use client"
import Landingpage from "./Components/Landingpage";
import Navbar from "./Components/Sidebar";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React from "react";
export default function Home() {
  const {data:session}=useSession()
    const router=useRouter();
    useEffect(() => {
      if(!session){
        router.push('/login')
      }
    }, [router,session])
    

  return (
    <div>
      <Navbar/>
      <Landingpage/>
    </div>
  );
}
