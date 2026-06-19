import React from 'react';
import { Link } from 'react-router-dom';

export const AppBar: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 bg-[#F9FAFB]/90 backdrop-blur-md border-b border-slate-200 px-4 py-3.5 shadow-sm select-none">
      <div className="max-w-6xl mx-auto flex items-center justify-between w-full">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative flex items-center justify-center">
            {/* Heartbeat pulse rings for brand visual */}
            <span className="absolute inline-flex h-9 w-9 rounded-full bg-emergency opacity-10 animate-ping" />
            <span className="absolute inline-flex h-7.5 w-7.5 rounded-full bg-goldenhour opacity-15 animate-pulse" />
            
            {/* Medulance Ribbon Heart Logo style */}
            <svg className="w-7 h-7 relative z-10" viewBox="0 0 40 40" fill="none">
              <path d="M12 26C12 20 18 14 24 14C30 14 31 19 28 23L20 31L16 27" stroke="#06A5E9" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M28 14C28 20 22 26 16 26C10 26 9 21 12 17L20 9L24 13" stroke="#EC1F52" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          
          <span className="font-black text-lg tracking-tight text-ink flex items-center">
            Medu<span className="text-emergency">Lance</span>
            <span className="text-slate-300 font-light mx-1.5 text-base">|</span>
            <span className="font-black text-ink">Golden<span className="text-goldenhour">Hour</span></span>
          </span>
        </Link>

        {/* Live system state badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-success/10 border border-success/20 rounded-full shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <span className="text-[10px] font-black text-success tracking-widest uppercase">System Online</span>
        </div>
      </div>
    </header>
  );
};
