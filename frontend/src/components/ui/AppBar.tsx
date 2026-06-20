import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { gsap } from '../../lib/gsap-setup';

export const AppBar: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const headerRef = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  // Hide on scroll down, show on scroll up (home page only)
  useEffect(() => {
    if (!isHome) {
      setHidden(false);
      return;
    }

    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current && currentY > 100) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHome]);

  // Animate hide/show
  useEffect(() => {
    if (!headerRef.current) return;
    gsap.to(headerRef.current, {
      y: hidden ? -100 : 0,
      duration: 0.4,
      ease: 'power2.out',
    });
  }, [hidden]);

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-50 px-4 py-3.5 select-none transition-colors duration-500 ${
        isHome
          ? 'bg-transparent border-b border-white/5'
          : 'bg-[#FBFAF8]/90 backdrop-blur-md border-b border-[#E5E2DD] shadow-sm'
      }`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between w-full">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative flex items-center justify-center">
            {/* Heartbeat pulse rings */}
            <span className={`absolute inline-flex h-9 w-9 rounded-full opacity-15 animate-ping ${
              isHome ? 'bg-goldenhour' : 'bg-emergency'
            }`} />
            <span className={`absolute inline-flex h-7.5 w-7.5 rounded-full opacity-20 animate-pulse ${
              isHome ? 'bg-emergency' : 'bg-goldenhour'
            }`} />

            <svg
              className={`w-5.5 h-5.5 relative z-10 filter ${
                isHome
                  ? 'text-goldenhour drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]'
                  : 'text-emergency drop-shadow-[0_0_4px_rgba(220,38,38,0.25)]'
              }`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>

          <span className={`font-display font-bold text-lg tracking-tight ${
            isHome ? 'text-dark-ink' : 'text-ink'
          }`}>
            Golden<span className="text-goldenhour">Hour</span>
          </span>
        </Link>

        {/* Nav links (home page) */}
        {isHome && (
          <nav className="hidden md:flex items-center gap-6">
            <a href="#how-it-works" className="text-xs font-semibold text-dark-ink-muted hover:text-dark-ink transition-colors uppercase tracking-wider">
              How it Works
            </a>
            <Link to="/register" className="text-xs font-semibold text-dark-ink-muted hover:text-dark-ink transition-colors uppercase tracking-wider">
              Donate Blood
            </Link>
          </nav>
        )}

        {/* Live system state badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full shadow-sm ${
          isHome
            ? 'bg-success/10 border border-success/20'
            : 'bg-success/10 border border-success/20'
        }`}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <span className="text-[10px] font-black text-success tracking-widest uppercase">Live</span>
        </div>
      </div>
    </header>
  );
};
