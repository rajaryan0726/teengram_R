"use client"
import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link';
import { Loader2, ArrowRight, Sparkles } from 'lucide-react';

const LoginContent = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  
  const errorMsg = searchParams.get('error');

  // Sparkle and 3D Mouse Parallax Effect
  useEffect(() => {
    // 3D Parallax Tracker
    const handleMousePos = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMousePos);

    // Canvas Sparkle Engine
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    let lastMouse = { x: null, y: null };
    const onMouseMove = (e) => {
      lastMouse.x = e.clientX;
      lastMouse.y = e.clientY;
      
      // Spawn 3-5 sparkles per movement
      const spawnCount = Math.random() * 3 + 2;
      for(let i=0; i<spawnCount; i++) {
        particles.push({
          x: e.clientX,
          y: e.clientY,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4 - 1, // Slight upward drift
          life: 1,
          decay: Math.random() * 0.02 + 0.015,
          color: ['#0ea5e9', '#3b82f6', '#a855f7', '#ffffff'][Math.floor(Math.random() * 4)],
          size: Math.random() * 2.5 + 0.5
        });
      }
    };
    window.addEventListener('mousemove', onMouseMove);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        
        // Draw a soft glowing circle (sparkle)
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        
        // Shrink slightly
        if(p.size > 0.1) p.size -= 0.05;
      }
      particles = particles.filter(p => p.life > 0);
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('mousemove', handleMousePos);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    document.title = "TeenGram - Welcome"
    if (errorMsg === 'deleted') {
       alert("Your account no longer exists in our system. You have been logged out.");
       router.replace('/login');
       setShowForm(true);
    } else if (errorMsg === 'not_registered') {
       alert("First register yourself as the user, or this email is not registered yet.");
       router.replace('/login');
       setShowForm(true);
    } else if (errorMsg === 'unverified') {
       router.replace('/login');
       setShowForm(true);
    }

    if (session) {
      if (session?.user?.status === "deleted") {
         signOut({ redirect: false }).then(() => {
            router.push('/login');
         });
      } else {
         router.push('/feed')
      }
    }
  }, [router, session, errorMsg])

  const handleTestingLogin = async (e) => {
    e.preventDefault();
    if (!username) return;
    setLoading(true);
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false
    });
    
    if (res?.error) {
       alert(res.error || "Login failed");
       setLoading(false);
    } else {
       router.push('/feed');
    }
  };

  // Compute realistic 3D tilt styles based on mouse position
  const tiltStyle = {
    transform: `perspective(1200px) rotateY(${mousePos.x * 15}deg) rotateX(${-mousePos.y * 15}deg)`,
    transformStyle: 'preserve-3d',
  };
  const floatStyle1 = { transform: `translateZ(60px)` };
  const floatStyle2 = { transform: `translateZ(100px)` };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden font-sans">
      
      {/* Sparkle Canvas Overlay */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-50 pointer-events-none mix-blend-screen"></canvas>

      {/* Ambient Background Animations */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[150px] animate-[pulse_6s_ease-in-out_infinite] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-500/20 blur-[150px] animate-[pulse_8s_ease-in-out_infinite_reverse] pointer-events-none"></div>

      {/* Realistic 3D Background Elements floating opposite to mouse */}
      {!showForm && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center" style={{ perspective: '1000px' }}>
          <div 
            className="w-full h-full flex items-center justify-center transition-transform duration-300 ease-out"
            style={{ transform: `rotateY(${-mousePos.x * 20}deg) rotateX(${mousePos.y * 20}deg)`, transformStyle: 'preserve-3d' }}
          >
            <div className="absolute top-[20%] left-[15%] w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl opacity-40 shadow-[0_0_30px_rgba(59,130,246,0.6)] animate-[spin_10s_linear_infinite]" style={{ transform: 'translateZ(-150px) rotateX(45deg)'}}></div>
            <div className="absolute bottom-[20%] right-[15%] w-24 h-24 bg-gradient-to-tl from-cyan-400 to-blue-600 rounded-full opacity-30 shadow-[0_0_40px_rgba(6,182,212,0.5)] animate-[bounce_6s_ease-in-out_infinite]" style={{ transform: 'translateZ(-250px)' }}></div>
            <div className="absolute top-[50%] right-[30%] w-10 h-10 border border-white/30 rounded-full opacity-20" style={{ transform: 'translateZ(-50px)' }}></div>
            <div className="absolute bottom-[40%] left-[25%] w-12 h-12 bg-purple-500/30 rounded-lg blur-[2px] animate-[spin_6s_linear_infinite_reverse]" style={{ transform: 'translateZ(-100px) rotateZ(30deg)' }}></div>
          </div>
        </div>
      )}

      {/* Welcome Landing Screen */}
      <div 
        className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-1000 ease-in-out ${
          showForm ? 'opacity-0 pointer-events-none blur-3xl scale-125' : 'opacity-100 scale-100'
        }`}
      >
        <div 
          className="relative z-10 text-center flex flex-col items-center justify-center w-full h-full transition-transform duration-200 ease-out"
          style={tiltStyle}
        >
          
          {/* Interactive Realistic 3D Face */}
          <div 
            className="relative w-28 h-28 mx-auto mb-8 rounded-full flex items-center justify-center transition-transform duration-100 ease-out cursor-pointer" 
            style={{ 
              ...floatStyle2,
              // 3D Spherical Shading
              background: 'radial-gradient(circle at 30% 30%, #fde047 0%, #eab308 50%, #a16207 100%)',
              boxShadow: 'inset -10px -10px 20px rgba(0,0,0,0.5), inset 10px 10px 20px rgba(255,255,255,0.6), 0 20px 40px rgba(0,0,0,0.5)',
              transform: `translateZ(150px) rotateY(${mousePos.x * 30}deg) rotateX(${-mousePos.y * 30}deg)`,
              transformStyle: 'preserve-3d'
            }}
          >
            {/* Eyes Container - physically popping out of the sphere */}
            <div className="absolute flex gap-5 top-7" style={{ transform: 'translateZ(25px)' }}>
              
              {/* Left Eye Sphere */}
              <div className="relative w-7 h-8 bg-slate-50 rounded-[50%] overflow-hidden shadow-[inset_0_4px_8px_rgba(0,0,0,0.5),0_2px_4px_rgba(0,0,0,0.3)] border border-yellow-600/30">
                 {/* Moving Pupil */}
                 <div 
                   className="absolute top-1/2 left-1/2 w-4 h-4 bg-slate-900 rounded-full transition-transform duration-75 ease-linear"
                   style={{ transform: `translate(calc(-50% + ${mousePos.x * 6}px), calc(-50% + ${mousePos.y * 8}px))` }}
                 >
                   {/* Glossy Catchlight Reflection */}
                   <div className="absolute top-[2px] right-[2px] w-1.5 h-1.5 bg-white rounded-full opacity-90 shadow-[0_0_2px_rgba(255,255,255,1)]" />
                 </div>
              </div>

              {/* Right Eye Sphere */}
              <div className="relative w-7 h-8 bg-slate-50 rounded-[50%] overflow-hidden shadow-[inset_0_4px_8px_rgba(0,0,0,0.5),0_2px_4px_rgba(0,0,0,0.3)] border border-yellow-600/30">
                 {/* Moving Pupil */}
                 <div 
                   className="absolute top-1/2 left-1/2 w-4 h-4 bg-slate-900 rounded-full transition-transform duration-75 ease-linear"
                   style={{ transform: `translate(calc(-50% + ${mousePos.x * 6}px), calc(-50% + ${mousePos.y * 8}px))` }}
                 >
                   {/* Glossy Catchlight Reflection */}
                   <div className="absolute top-[2px] right-[2px] w-1.5 h-1.5 bg-white rounded-full opacity-90 shadow-[0_0_2px_rgba(255,255,255,1)]" />
                 </div>
              </div>

            </div>

            {/* Glowing Rosy Cheeks */}
            <div className="absolute top-14 left-3 w-6 h-3 bg-pink-500 rounded-full opacity-50 blur-[3px]" style={{ transform: 'translateZ(15px)' }} />
            <div className="absolute top-14 right-3 w-6 h-3 bg-pink-500 rounded-full opacity-50 blur-[3px]" style={{ transform: 'translateZ(15px)' }} />

            {/* Realistic Recessed Mouth */}
            <div 
              className="absolute bottom-5 w-12 h-6 bg-[#4c0519] rounded-b-full overflow-hidden shadow-[inset_0_5px_10px_rgba(0,0,0,0.7)] transition-transform duration-75 ease-linear" 
              style={{ transform: `translateZ(10px) translate(${mousePos.x * 3}px, ${mousePos.y * 3}px)` }}
            >
              {/* Cute Pink Tongue */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-5 bg-[#f43f5e] rounded-t-full shadow-[inset_0_-2px_4px_rgba(0,0,0,0.4)]"></div>
            </div>
          </div>

          <div className="relative inline-block group" style={floatStyle2}>
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full blur-xl opacity-30 group-hover:opacity-100 transition duration-1000 animate-pulse"></div>
            <h1 className="relative text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-500 tracking-tighter drop-shadow-[0_20px_20px_rgba(0,0,0,0.8)]">
              TeenGram
            </h1>
          </div>
          
          <p className="mt-6 text-xl md:text-3xl text-slate-300 font-medium tracking-widest uppercase drop-shadow-md" style={floatStyle1}>
            Explore the world. Share your vibe.
          </p>

          <div className="pt-16" style={floatStyle2}>
            <button 
              onClick={() => setShowForm(true)}
              className="group relative inline-flex items-center justify-center px-10 py-5 font-bold text-white transition-all duration-300 bg-white/5 backdrop-blur-md border border-white/20 rounded-full hover:bg-white/10 hover:shadow-[0_0_50px_rgba(6,182,212,0.4)] overflow-hidden"
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600/40 to-cyan-500/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              <span className="relative flex items-center gap-3 text-lg tracking-wide uppercase shadow-black drop-shadow-lg">
                Enter the Portal
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Login Form Container */}
      <div 
        className={`relative z-20 w-full max-w-md p-8 m-4 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-[0_20px_50px_0_rgba(0,0,0,0.5)] transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] transform ${
          showForm ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-40 scale-90 pointer-events-none'
        }`}
      >
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 mb-4 rounded-full bg-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight mb-1">
            Welcome Back
          </h2>
          <p className="text-sm text-slate-400">Sign in to continue to TeenGram</p>
        </div>

        <form onSubmit={handleTestingLogin} className="space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Username or Email</label>
            <input 
              type="text" 
              name="username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-900/60 text-white placeholder-slate-500 border border-slate-700/50 rounded-2xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 transition-all duration-300 shadow-inner" 
              placeholder="astronaut123"
              required
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Password</label>
            <input 
              type="password" 
              name="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900/60 text-white placeholder-slate-500 border border-slate-700/50 rounded-2xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 transition-all duration-300 shadow-inner" 
              placeholder="••••••••"
            />
          </div>
          
          <div className="flex items-center justify-between pt-1 pb-2">
            <div className="flex items-center">
              <input type="checkbox" id="remember" name="remember" className="w-4 h-4 text-cyan-500 bg-slate-900 border-slate-700 rounded focus:ring-cyan-500 focus:ring-2 focus:ring-offset-slate-950" />
              <label htmlFor="remember" className="ml-2 text-xs font-medium text-slate-300 cursor-pointer">Remember Me</label>
            </div>
            <a href="#" className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors">Forgot password?</a>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-3.5 px-4 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.3)] text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-900 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : null}
            {loading ? 'Authenticating...' : 'Access Interface'}
          </button>
        </form>

        <div className="mt-8 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700/50"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest font-semibold">
            <span className="px-3 bg-slate-900/80 backdrop-blur-sm text-slate-500 rounded-full">Or connect with</span>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={() => signIn("google")}
            className="w-full flex items-center justify-center py-3.5 px-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all duration-300 transform hover:scale-[1.02] active:scale-95 backdrop-blur-md"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-slate-400">
          New to the network?{' '}
          <Link href="/register" className="font-bold text-cyan-400 hover:text-cyan-300 transition-colors hover:underline">
            Create account
          </Link>
        </p>

      </div>
    </div>
  )
}

const Page = () => {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin w-8 h-8 text-cyan-500" /></div>}>
            <LoginContent />
        </Suspense>
    )
}

export default Page
