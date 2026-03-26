import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-80px)] w-full items-center justify-center bg-transparent z-50">
      <div className="flex flex-col items-center justify-center gap-6 p-8 rounded-3xl bg-white/30 backdrop-blur-md shadow-2xl border border-white/40 border-t-white/70">
        <div className="relative flex items-center justify-center">
          {/* Outer glowing pulse ring */}
          <div className="absolute inset-0 rounded-full bg-orange-400 opacity-20 blur-xl animate-pulse delay-75"></div>
          
          {/* Inner distinct colored rings */}
          <div className="absolute h-20 w-20 rounded-full border-t-4 border-r-4 border-transparent border-t-orange-500 border-r-pink-500 animate-[spin_1.5s_linear_infinite]"></div>
          <div className="absolute h-16 w-16 rounded-full border-b-4 border-l-4 border-transparent border-b-amber-400 border-l-rose-400 animate-[spin_2s_linear_infinite_reverse]"></div>
          
          {/* Center core loader */}
          <Loader2 className="h-10 w-10 animate-spin text-orange-600 relative z-10" />
        </div>
        
        <h2 className="text-lg tracking-wide font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 animate-pulse mt-2">
          Loading amazing things...
        </h2>
      </div>
    </div>
  );
}
