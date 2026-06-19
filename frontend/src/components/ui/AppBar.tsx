import React from 'react';
import { Link } from 'react-router-dom';

export const AppBar: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 bg-[#F9FAFB]/90 backdrop-blur-md border-b border-slate-200 px-4 py-3.5 shadow-sm select-none">
      <div className="max-w-6xl mx-auto flex items-center justify-between w-full">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative flex items-center justify-center">
            {/* Heartbeat pulse rings for brand visual */}
            <span className="absolute inline-flex h-9 w-9 rounded-full bg-emergency opacity-15 animate-ping" />
            <span className="absolute inline-flex h-7.5 w-7.5 rounded-full bg-goldenhour opacity-20 animate-pulse" />
            
            <svg 
              className="w-5.5 h-5.5 text-emergency relative z-10 filter drop-shadow-[0_0_4px_rgba(220,38,38,0.25)]" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          
          <span className="font-black text-lg tracking-tight text-ink">
            Golden<span className="text-goldenhour">Hour</span>
          </span>
        </Link>

        {/* Live system state badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-success/10 border border-success/20 rounded-full shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <span className="text-[10px] font-black text-success tracking-widest uppercase">Console Active</span>
        </div>
      </div>
    </header>
  );
};
