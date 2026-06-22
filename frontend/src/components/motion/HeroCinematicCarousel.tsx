import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────────────────────────────────────────────
   Slide definitions — SOS is always first.
   Each slide carries its own motion-effect type so we can
   render a purpose-built animated overlay on top of the photo.
───────────────────────────────────────────────────────────── */
type SlideEffect =
  | 'sos-pulse'
  | 'ambulance-rush'
  | 'paramedic-rush'
  | 'blood-pulse'
  | 'er-arrival'
  | 'dispatch-grid';

interface Slide {
  src: string;
  effect: SlideEffect;
  label: string;
  caption: string;
  kenBurns: 'zoom-in' | 'zoom-in-left' | 'zoom-in-right' | 'pan-left' | 'pan-right';
}

const SLIDES: Slide[] = [
  {
    src: '/hero_sos_dispatch.png',
    effect: 'sos-pulse',
    label: 'SOS',
    caption: 'One tap. Every second counts.',
    kenBurns: 'zoom-in',
  },
  {
    src: '/hero_ambulance_speed.png',
    effect: 'ambulance-rush',
    label: 'DISPATCH',
    caption: 'Nearest ambulance. Instant dispatch.',
    kenBurns: 'pan-left',
  },
  {
    src: '/hero_paramedics.png',
    effect: 'paramedic-rush',
    label: 'RESPONSE',
    caption: 'Trained paramedics. En route.',
    kenBurns: 'zoom-in-right',
  },
  {
    src: '/hero_blood_donor.png',
    effect: 'blood-pulse',
    label: 'DONORS',
    caption: 'Matched blood donors alerted.',
    kenBurns: 'zoom-in-left',
  },
  {
    src: '/hero_hospital_er.png',
    effect: 'er-arrival',
    label: 'ARRIVAL',
    caption: 'Hospital ready. Care begins.',
    kenBurns: 'pan-right',
  },
  {
    src: '/hero_dispatch_control.png',
    effect: 'dispatch-grid',
    label: 'NETWORK',
    caption: '24/7 live dispatch grid.',
    kenBurns: 'zoom-in',
  },
];

/* ─────────────────────────────────────────────────────────────
   Ken-Burns CSS keyframes injected once
───────────────────────────────────────────────────────────── */
const kenBurnsCSS = `
@keyframes kb-zoom-in {
  from { transform: scale(1.12) translate(0, 0); }
  to   { transform: scale(1.0)  translate(0, 0); }
}
@keyframes kb-zoom-in-left {
  from { transform: scale(1.12) translateX(2%); }
  to   { transform: scale(1.0)  translateX(0%); }
}
@keyframes kb-zoom-in-right {
  from { transform: scale(1.12) translateX(-2%); }
  to   { transform: scale(1.0)  translateX(0%); }
}
@keyframes kb-pan-left {
  from { transform: scale(1.06) translateX(3%); }
  to   { transform: scale(1.06) translateX(-3%); }
}
@keyframes kb-pan-right {
  from { transform: scale(1.06) translateX(-3%); }
  to   { transform: scale(1.06) translateX(3%); }
}
@keyframes ambulance-light-red {
  0%, 45%, 55%, 100% { opacity: 0; }
  50% { opacity: 0.45; }
}
@keyframes ambulance-light-blue {
  0%, 45%, 55%, 100% { opacity: 0; }
  50% { opacity: 0.4; }
}
@keyframes speed-streak {
  0% { transform: translateX(110%); opacity: 0.7; }
  100% { transform: translateX(-110%); opacity: 0; }
}
@keyframes rain-drop {
  0% { transform: translateY(-60px) translateX(0); opacity: 0.6; }
  100% { transform: translateY(110vh) translateX(-15px); opacity: 0; }
}
@keyframes sos-ring {
  0%   { transform: scale(0.3); opacity: 0.9; }
  100% { transform: scale(3.5); opacity: 0; }
}
@keyframes sos-center-pulse {
  0%, 100% { transform: scale(1);   opacity: 1; }
  50%       { transform: scale(1.12); opacity: 0.85; }
}
@keyframes blood-drip {
  0%   { transform: scaleY(0); opacity: 1; transform-origin: top; }
  60%  { transform: scaleY(1); opacity: 1; transform-origin: top; }
  100% { transform: scaleY(1); opacity: 0; transform-origin: top; }
}
@keyframes hud-scan {
  0%, 100% { clip-path: inset(0 0 100% 0); }
  50%       { clip-path: inset(0 0 0% 0); }
}
@keyframes grid-dot-blink {
  0%, 100% { opacity: 0.15; }
  50%       { opacity: 0.9; }
}
@keyframes ekg-draw {
  from { stroke-dashoffset: 800; }
  to   { stroke-dashoffset: 0; }
}
`;

/* ─────────────────────────────────────────────────────────────
   Per-slide motion overlay components
───────────────────────────────────────────────────────────── */

/** SOS — concentric pulsing red rings + central glow dot */
function SosPulseOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2 }}>
      {/* Radial crimson glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        width: 600, height: 600,
        transform: 'translate(-50%, -55%)',
        background: 'radial-gradient(circle, rgba(220,38,38,0.35) 0%, transparent 70%)',
        borderRadius: '50%',
      }} />
      {/* Pulsing rings */}
      {[0, 0.8, 1.6, 2.4].map((delay, i) => (
        <div key={i} style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 100, height: 100,
          marginLeft: -50, marginTop: -80,
          border: '2px solid rgba(220,38,38,0.7)',
          borderRadius: '50%',
          animation: `sos-ring 2.4s ease-out ${delay}s infinite`,
        }} />
      ))}
      {/* EKG line at bottom */}
      <svg style={{ position: 'absolute', bottom: 80, left: '10%', width: '80%', height: 60, opacity: 0.5 }} viewBox="0 0 800 60">
        <path
          d="M0,30 L80,30 L95,10 L110,50 L125,5 L140,55 L155,30 L240,30 L255,10 L270,50 L285,5 L300,55 L315,30 L400,30 L415,10 L430,50 L445,5 L460,55 L475,30 L560,30 L575,10 L590,50 L605,5 L620,55 L635,30 L800,30"
          fill="none" stroke="#DC2626" strokeWidth="2"
          strokeDasharray="800" strokeDashoffset="800"
          style={{ animation: 'ekg-draw 3s ease-in-out infinite' }}
        />
      </svg>
    </div>
  );
}

/** Ambulance Rush — speed streaks + alternating red/blue siren flash */
function AmbulanceRushOverlay() {
  const streaks = Array.from({ length: 12 }, (_, i) => ({
    top: `${8 + i * 7.5}%`,
    width: `${30 + Math.random() * 45}%`,
    delay: `${(i * 0.18).toFixed(2)}s`,
    duration: `${(0.6 + Math.random() * 0.5).toFixed(2)}s`,
    opacity: 0.25 + Math.random() * 0.35,
    height: i % 3 === 0 ? 3 : i % 3 === 1 ? 1.5 : 2,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2 }}>
      {/* Red siren flash — left side */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, rgba(220,38,38,0.3) 0%, transparent 50%)',
        animation: 'ambulance-light-red 0.5s ease-in-out infinite',
      }} />
      {/* Blue siren flash — right side */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(270deg, rgba(59,130,246,0.25) 0%, transparent 50%)',
        animation: 'ambulance-light-blue 0.5s ease-in-out 0.25s infinite',
      }} />
      {/* Horizontal speed streaks */}
      {streaks.map((s, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: s.top, right: 0,
          width: s.width,
          height: s.height,
          background: `linear-gradient(90deg, transparent, rgba(255,255,255,${s.opacity}), transparent)`,
          animation: `speed-streak ${s.duration} linear ${s.delay} infinite`,
          borderRadius: 2,
        }} />
      ))}
      {/* Vignette motion blur sides */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, rgba(0,0,0,0.5) 0%, transparent 25%, transparent 75%, rgba(0,0,0,0.5) 100%)',
      }} />
    </div>
  );
}

/** Paramedic Rush — motion blur + camera shake feel */
function ParamedicRushOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2 }}>
      {/* Red emergency strobe */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(220,38,38,0.2) 0%, transparent 70%)',
        animation: 'ambulance-light-red 0.7s ease-in-out infinite',
      }} />
      {/* Vertical speed streaks for corridor rushing effect */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${5 + i * 17}%`,
          top: 0, bottom: 0,
          width: 1.5,
          background: `linear-gradient(180deg, transparent, rgba(255,255,255,${0.1 + i * 0.03}), transparent)`,
          animation: `rain-drop ${0.8 + i * 0.1}s linear ${i * 0.15}s infinite`,
        }} />
      ))}
      {/* Bottom crimson glow */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
        background: 'linear-gradient(0deg, rgba(220,38,38,0.25) 0%, transparent 100%)',
      }} />
    </div>
  );
}

/** Blood Pulse — slow pulsing crimson glow + dripping line */
function BloodPulseOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2 }}>
      {/* Slow crimson heartbeat glow */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%',
        width: 500, height: 500,
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(185,28,28,0.4) 0%, transparent 65%)',
        borderRadius: '50%',
        animation: 'sos-center-pulse 1.2s ease-in-out infinite',
      }} />
      {/* EKG heart-rate line */}
      <svg style={{ position: 'absolute', bottom: 100, left: '5%', width: '90%', height: 50, opacity: 0.6 }} viewBox="0 0 900 50">
        <path
          d="M0,25 L150,25 L165,12 L180,38 L195,5 L210,45 L225,25 L450,25 L465,12 L480,38 L495,5 L510,45 L525,25 L750,25 L765,12 L780,38 L795,5 L810,45 L825,25 L900,25"
          fill="none" stroke="#DC2626" strokeWidth="2.5"
          strokeDasharray="900" strokeDashoffset="900"
          style={{ animation: 'ekg-draw 2.5s ease-in-out infinite' }}
        />
      </svg>
    </div>
  );
}

/** ER Arrival — rain drops + flashing red from ambulance */
function ErArrivalOverlay() {
  const drops = Array.from({ length: 30 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    delay: `${(Math.random() * 2).toFixed(2)}s`,
    duration: `${(0.6 + Math.random() * 0.8).toFixed(2)}s`,
    height: `${50 + Math.floor(Math.random() * 80)}px`,
    opacity: 0.15 + Math.random() * 0.3,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2 }}>
      {/* Rain drops */}
      {drops.map((d, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: d.left, top: 0,
          width: 1.5,
          height: d.height,
          background: `rgba(180,200,255,${d.opacity})`,
          animation: `rain-drop ${d.duration} linear ${d.delay} infinite`,
          transform: 'rotate(8deg)',
          borderRadius: 1,
        }} />
      ))}
      {/* Alternating red/blue siren from arriving ambulance */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 60% 50% at 20% 60%, rgba(220,38,38,0.28) 0%, transparent 70%)',
        animation: 'ambulance-light-red 0.45s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 60% 50% at 20% 60%, rgba(59,130,246,0.22) 0%, transparent 70%)',
        animation: 'ambulance-light-blue 0.45s ease-in-out 0.22s infinite',
      }} />
    </div>
  );
}

/** Dispatch Grid — scanning grid + blinking location nodes */
function DispatchGridOverlay() {
  const nodes = Array.from({ length: 8 }, (_, i) => ({
    left: `${15 + i * 10 + Math.sin(i) * 5}%`,
    top: `${20 + Math.cos(i * 1.3) * 25 + 30}%`,
    delay: `${(i * 0.3).toFixed(1)}s`,
    color: i % 3 === 0 ? '#DC2626' : i % 3 === 1 ? '#F59E0B' : '#14B8A6',
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2 }}>
      {/* Subtle scan line */}
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent, rgba(20,184,166,0.6), transparent)',
        animation: 'hud-scan 4s ease-in-out infinite',
        top: 0,
      }} />
      {/* Grid dots */}
      {nodes.map((n, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: n.left, top: n.top,
          width: 8, height: 8,
          background: n.color,
          borderRadius: '50%',
          boxShadow: `0 0 12px 4px ${n.color}88`,
          animation: `grid-dot-blink 1.2s ease-in-out ${n.delay} infinite`,
        }} />
      ))}
      {/* Connection lines SVG */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.3 }} viewBox="0 0 1000 600">
        <line x1="200" y1="300" x2="420" y2="240" stroke="#DC2626" strokeWidth="1" strokeDasharray="6 4" />
        <line x1="420" y1="240" x2="650" y2="310" stroke="#F59E0B" strokeWidth="1" strokeDasharray="6 4" />
        <line x1="650" y1="310" x2="800" y2="200" stroke="#14B8A6" strokeWidth="1" strokeDasharray="6 4" />
        <line x1="300" y1="380" x2="550" y2="360" stroke="#DC2626" strokeWidth="1" strokeDasharray="6 4" />
        <line x1="550" y1="360" x2="750" y2="390" stroke="#F59E0B" strokeWidth="1" strokeDasharray="6 4" />
      </svg>
    </div>
  );
}

function renderOverlay(effect: SlideEffect) {
  switch (effect) {
    case 'sos-pulse':      return <SosPulseOverlay />;
    case 'ambulance-rush': return <AmbulanceRushOverlay />;
    case 'paramedic-rush': return <ParamedicRushOverlay />;
    case 'blood-pulse':    return <BloodPulseOverlay />;
    case 'er-arrival':     return <ErArrivalOverlay />;
    case 'dispatch-grid':  return <DispatchGridOverlay />;
    default: return null;
  }
}

const KB_ANIMATION: Record<Slide['kenBurns'], string> = {
  'zoom-in':       'kb-zoom-in 8s ease-out forwards',
  'zoom-in-left':  'kb-zoom-in-left 8s ease-out forwards',
  'zoom-in-right': 'kb-zoom-in-right 8s ease-out forwards',
  'pan-left':      'kb-pan-left 8s linear forwards',
  'pan-right':     'kb-pan-right 8s linear forwards',
};

/* ─────────────────────────────────────────────────────────────
   Progress bar dots
───────────────────────────────────────────────────────────── */
function SlideDots({ total, current, onSelect }: { total: number; current: number; onSelect: (i: number) => void }) {
  return (
    <div style={{
      position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 8, zIndex: 20,
    }}>
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          aria-label={`Slide ${i + 1}`}
          style={{
            width: i === current ? 28 : 8,
            height: 8,
            borderRadius: 4,
            border: 'none',
            cursor: 'pointer',
            background: i === current ? '#DC2626' : 'rgba(255,255,255,0.35)',
            transition: 'all 0.4s ease',
            padding: 0,
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Slide label badge
───────────────────────────────────────────────────────────── */
function SlideBadge({ label, caption }: { label: string; caption: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{
        position: 'absolute', bottom: 70, right: 40,
        zIndex: 20, textAlign: 'right',
      }}
    >
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'rgba(10,10,15,0.6)',
        border: '1px solid rgba(220,38,38,0.3)',
        backdropFilter: 'blur(8px)',
        borderRadius: 999,
        padding: '4px 14px 4px 10px',
        marginBottom: 6,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#DC2626', display: 'inline-block', animation: 'sos-center-pulse 1s infinite' }} />
        <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', color: '#DC2626', fontFamily: 'monospace' }}>{label}</span>
      </div>
      <p style={{ fontSize: 11, color: 'rgba(240,237,232,0.7)', fontWeight: 500, margin: 0, letterSpacing: '0.05em' }}>{caption}</p>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main exported component
───────────────────────────────────────────────────────────── */
export function HeroCinematicCarousel({ style, motionY }: {
  style?: React.CSSProperties;
  motionY?: any; // framer-motion MotionValue
}) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Inject Ken Burns keyframes once
  useEffect(() => {
    if (document.getElementById('kb-styles')) return;
    const style = document.createElement('style');
    style.id = 'kb-styles';
    style.textContent = kenBurnsCSS;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);

  const advance = useCallback(() => {
    setCurrent(c => (c + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(advance, 7000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [advance, paused]);

  const goTo = (i: number) => {
    setCurrent(i);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(advance, 7000);
  };

  const slide = SLIDES[current];

  return (
    <div
      className="absolute inset-0"
      style={{ overflow: 'hidden', zIndex: 0, ...style }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Crossfade between slides ── */}
      <AnimatePresence mode="crossfade">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          {/* Background photo with Ken Burns */}
          <div
            style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${slide.src})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              animation: KB_ANIMATION[slide.kenBurns],
              willChange: 'transform',
            }}
          />

          {/* Per-slide live motion overlay */}
          {renderOverlay(slide.effect)}
        </motion.div>
      </AnimatePresence>

      {/* ── Permanent UI chrome ── */}
      <AnimatePresence mode="wait">
        <SlideBadge key={`badge-${current}`} label={slide.label} caption={slide.caption} />
      </AnimatePresence>

      <SlideDots total={SLIDES.length} current={current} onSelect={goTo} />
    </div>
  );
}
