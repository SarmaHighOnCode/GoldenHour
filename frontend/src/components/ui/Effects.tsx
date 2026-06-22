/**
 * Effects.tsx — Premium UI primitives for GoldenHour
 * --------------------------------------------------------------
 * Stack: React + Vite + Tailwind CSS + framer-motion
 */

import React, { useEffect, useState } from "react";
import {
  motion,
  AnimatePresence,
  animate,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Palette — crimson primary, emerald success, amber accent          */
/* ------------------------------------------------------------------ */
export const palette = {
  crimson: "#DC2626",
  crimsonDark: "#991B1B",
  emerald: "#10B981",
  emeraldDark: "#059669",
  amber: "#F59E0B",
  ink: "#0F172A", // primary text
  muted: "#64748B", // secondary text
  border: "#E2E8F0",
  surface: "#F8FAFC",
};

/* ------------------------------------------------------------------ */
/*  1. GlassCard — frosted glass panel                                */
/* ------------------------------------------------------------------ */
export const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => {
  return (
    <div
      className={
        "rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md " +
        "shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-5 " +
        className
      }
    >
      {children}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  2. CountUp — animates a number up to `to`                         */
/* ------------------------------------------------------------------ */
interface CountUpProps {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const CountUp: React.FC<CountUpProps> = ({
  to = 0,
  duration = 1,
  prefix = "",
  suffix = "",
  className = "",
}) => {
  const reduce = useReducedMotion();
  const count = useMotionValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reduce) {
      setDisplay(Math.round(to));
      return;
    }
    const controls = animate(count, to, { duration, ease: "easeOut" });
    const unsub = count.on("change", (v) => setDisplay(Math.round(v)));
    return () => {
      controls.stop();
      unsub();
    };
  }, [to, duration, reduce]);

  return (
    <span className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/*  3. ShimmerSkeleton — loading placeholder with a light sweep       */
/* ------------------------------------------------------------------ */
export const ShimmerSkeleton: React.FC<{ className?: string }> = ({
  className = "h-4 w-full rounded-lg",
}) => {
  const reduce = useReducedMotion();
  return (
    <div className={"relative overflow-hidden bg-slate-200/70 dark:bg-white/5 " + className}>
      {!reduce && (
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)",
          }}
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
        />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  4. AnimatedStatusBadge — pending / confirmed / declined           */
/* ------------------------------------------------------------------ */
const STATUS_STYLES = {
  pending: { 
    label: "Pending", 
    wrap: "bg-amber-100 text-amber-900 border border-amber-300 shadow-amber-500/10", 
    dot: "bg-amber-500 shadow-[0_0_8px_#f59e0b]" 
  },
  confirmed: { 
    label: "Confirmed", 
    wrap: "bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-emerald-500/10", 
    dot: "bg-emerald-600 shadow-[0_0_8px_#10b981]" 
  },
  declined: { 
    label: "Declined", 
    wrap: "bg-slate-100/60 text-slate-400 border border-slate-200/60", 
    dot: "bg-slate-300" 
  },
};

interface AnimatedStatusBadgeProps {
  status?: "pending" | "confirmed" | "declined";
}

export const AnimatedStatusBadge: React.FC<AnimatedStatusBadgeProps> = ({ status = "pending" }) => {
  const reduce = useReducedMotion();
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending;

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={status}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }}
        className={
          "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 " +
          "text-xs font-black uppercase tracking-wider shadow-sm " +
          s.wrap
        }
      >
        <span className="relative flex h-2 w-2">
          {status === "confirmed" && !reduce && (
            <motion.span
              className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
              animate={{ scale: [1, 2.5], opacity: [0.7, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: "easeOut" }}
            />
          )}
          <span className={"relative inline-flex h-2 w-2 rounded-full " + s.dot} />
        </span>
        {s.label}
      </motion.span>
    </AnimatePresence>
  );
};

/* ------------------------------------------------------------------ */
/*  5. AuroraBackground — soft drifting crimson/emerald/amber blobs   */
/* ------------------------------------------------------------------ */
interface BlobProps {
  className: string;
  color: string;
  anim: any;
  duration: number;
}

const Blob: React.FC<BlobProps> = ({ className, color, anim, duration }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={"absolute rounded-full blur-3xl " + className}
      style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }}
      animate={reduce ? undefined : anim}
      transition={reduce ? undefined : { repeat: Infinity, duration, ease: "easeInOut" }}
    />
  );
};

export const AuroraBackground: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "bg-white",
}) => {
  return (
    <div className={"relative overflow-hidden " + className}>
      <div className="pointer-events-none absolute inset-0 -z-10">
        <Blob
          className="-top-1/4 -left-1/4 h-[60vh] w-[60vh]"
          color="rgba(220,38,38,0.25)"
          anim={{ x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
          duration={14}
        />
        <Blob
          className="top-1/3 -right-1/4 h-[55vh] w-[55vh]"
          color="rgba(16,185,129,0.20)"
          anim={{ x: [0, -50, 0], y: [0, 40, 0], scale: [1, 1.2, 1] }}
          duration={18}
        />
        <Blob
          className="-bottom-1/4 left-1/3 h-[50vh] w-[50vh]"
          color="rgba(245,158,11,0.15)"
          anim={{ x: [0, 30, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
          duration={16}
        />
      </div>
      {children}
    </div>
  );
};
