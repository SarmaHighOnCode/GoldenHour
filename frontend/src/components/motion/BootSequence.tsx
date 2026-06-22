import React, { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useLenis } from 'lenis/react';

interface BootSequenceProps {
  onComplete: () => void;
}

interface TerminalLineProps {
  text: string;
  active: boolean;
  completed: boolean;
  onComplete: () => void;
  prefersReduced: boolean;
}

const TerminalLine: React.FC<TerminalLineProps> = ({
  text,
  active,
  completed,
  onComplete,
  prefersReduced,
}) => {
  const [displayText, setDisplayText] = useState('');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*()_+=[]{}|;:,.<>?';

  useEffect(() => {
    if (!active) {
      if (completed) {
        setDisplayText(text);
      } else {
        setDisplayText('');
      }
      return;
    }

    if (completed) {
      setDisplayText(text);
      return;
    }

    if (prefersReduced) {
      setDisplayText(text);
      onComplete();
      return;
    }

    let frame = 0;
    const durationFrames = 20; // ~330ms at 60fps for snappy typing
    const interval = setInterval(() => {
      frame++;
      const progress = frame / durationFrames;
      const revealCount = Math.floor(text.length * progress);

      let result = '';
      for (let i = 0; i < revealCount; i++) {
        if (i < revealCount - 3) {
          result += text[i];
        } else {
          result += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      setDisplayText(result);

      if (frame >= durationFrames) {
        setDisplayText(text);
        clearInterval(interval);
        onComplete();
      }
    }, 16);

    return () => clearInterval(interval);
  }, [text, active, completed, prefersReduced]);

  if (!active && !completed) return null;

  return (
    <div className="flex items-center justify-between py-1 min-h-[32px] font-mono border-b border-white/[0.03]">
      <span className="tracking-wider text-xs md:text-sm text-white/90">{displayText}</span>
      {completed && (
        <span className="text-emerald-500 flex-shrink-0 ml-4 animate-scale-in">
          <Check className="w-4 h-4" strokeWidth={3} />
        </span>
      )}
    </div>
  );
};

export const BootSequence: React.FC<BootSequenceProps> = ({ onComplete }) => {
  const prefersReduced = useReducedMotion();
  const lenis = useLenis();
  const [activeLineIdx, setActiveLineIdx] = useState(0);
  const [completedLines, setCompletedLines] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
  ]);
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  const TERMINAL_LINES = [
    'INITIALIZING GOLDENHOUR DISPATCH',
    'GPS UPLINK ... ONLINE',
    'DONOR NETWORK ... 12,480 ACTIVE',
    'HOSPITAL GRID ... SYNCED',
    'SYSTEM LIVE',
  ];

  // Lock scroll on mount, restore on unmount
  useEffect(() => {
    // Save original overflow style
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Stop Lenis scroll if active
    if (lenis) {
      lenis.stop();
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      if (lenis) {
        lenis.start();
      }
    };
  }, [lenis]);

  // Keydown listener for Skip via Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update progress bar smoothly over the boot time
  useEffect(() => {
    if (prefersReduced) {
      setProgress(100);
      return;
    }

    const startTime = Date.now();
    const duration = 1800; // Complete progress bar slightly before total sequence

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);
      if (elapsed >= duration) {
        clearInterval(timer);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [prefersReduced]);

  // Handle sequential line completion
  const handleLineComplete = (idx: number) => {
    setCompletedLines((prev) => {
      const next = [...prev];
      next[idx] = true;
      return next;
    });

    if (idx < TERMINAL_LINES.length - 1) {
      setActiveLineIdx(idx + 1);
    } else {
      // Last line completed: pause 500ms then exit
      setTimeout(() => {
        setIsExiting(true);
      }, 500);
    }
  };

  const handleSkip = () => {
    setIsExiting(true);
  };

  // Trigger parent completion after exit animation completes
  const handleAnimationComplete = () => {
    if (isExiting) {
      onComplete();
    }
  };

  // Prefers-reduced-motion fallback behavior:
  // Render static live system state, pause briefly, then exit.
  useEffect(() => {
    if (prefersReduced) {
      setCompletedLines([true, true, true, true, true]);
      const timer = setTimeout(() => {
        setIsExiting(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [prefersReduced]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={isExiting ? { opacity: 0, scale: 1.05 } : { opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      onAnimationComplete={handleAnimationComplete}
      className="fixed inset-0 bg-[#0A0A0F] text-white flex flex-col items-center justify-center font-mono z-[999999] p-6 select-none"
    >
      <div className="w-full max-w-lg space-y-6">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 text-[10px] text-white/40 tracking-wider">
          <span>GOLDENHOUR DISPATCH CONSOLE v1.0</span>
          <span className="flex items-center gap-1.5 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emergency animate-pulse" />
            LIVE LINK
          </span>
        </div>

        {/* Terminal Lines Container */}
        <div className="space-y-2 min-h-[180px] flex flex-col justify-center">
          {TERMINAL_LINES.map((line, idx) => (
            <TerminalLine
              key={line}
              text={line}
              active={activeLineIdx === idx && !prefersReduced}
              completed={completedLines[idx]}
              onComplete={() => handleLineComplete(idx)}
              prefersReduced={prefersReduced}
            />
          ))}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 pt-4">
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emergency via-goldenhour to-emerald-500 transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/40 tracking-wider">
            <span>UPLINK SEQUENCE</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      {/* Skip CTA */}
      <button
        onClick={handleSkip}
        className="absolute bottom-8 right-8 px-4 py-2 border border-white/10 hover:border-white/30 hover:bg-white/[0.02] text-white/40 hover:text-white/80 rounded-xl text-[10px] tracking-widest uppercase transition-all duration-200 cursor-pointer"
      >
        Skip [ESC]
      </button>
    </motion.div>
  );
};
