/**
 * HowItWorksCinematic
 *
 * Pinned, scroll-scrubbed cinematic sequence for the "How It Works" section.
 *
 * Desktop / no-reduced-motion:
 *   - ScrollTrigger pins this section for 300% of viewport height.
 *   - A MM:SS HUD counts 60:00 → 00:00 mapped to scroll progress, tinting crimson near 0.
 *   - Three step cards slide horizontally (translateX) as the user scrolls.
 *   - A blood-drop radial wipe flourish plays between each card transition.
 *
 * Mobile (≤768 px) or prefers-reduced-motion:
 *   - No pinning, no horizontal scrub.
 *   - Cards render as a plain stacked/grid layout.
 *   - Countdown shown as a static "60:00" badge.
 *
 * Sync:
 *   - ScrollTrigger is already synced to Lenis via `smooth-scroll.tsx` and `App.tsx`
 *     (lenis.on('scroll', ScrollTrigger.update) + gsap.ticker.add(lenis.raf)).
 *   - useGSAP with a scoped sectionRef handles auto-cleanup on unmount/re-render.
 *   - ScrollTrigger.refresh() is called on resize (debounced 200 ms) and after load.
 */

import React, { useRef, useEffect, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger } from '../../lib/gsap-setup';
import { MapPin, Building2, Droplet } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StepCard {
  step: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
  index: number;
}

// ─── Step data ────────────────────────────────────────────────────────────────

const STEPS: StepCard[] = [
  {
    step: 'Step 01',
    title: 'Lock Location',
    description:
      'Your browser GPS pins your exact coordinates. High-accuracy mode ensures precision even in dense urban areas — no manual entry, no delay.',
    icon: <MapPin className="w-7 h-7" />,
    accentColor: '#F59E0B',
    index: 0,
  },
  {
    step: 'Step 02',
    title: 'Smart Dispatch',
    description:
      'Our algorithm matches your emergency type to the nearest hospital with the right department and available bed capacity — in milliseconds.',
    icon: <Building2 className="w-7 h-7" />,
    accentColor: '#DC2626',
    index: 1,
  },
  {
    step: 'Step 03',
    title: 'Donor Alert',
    description:
      'Every registered blood donor matching your blood type within range receives an instant push alert with your location — simultaneously.',
    icon: <Droplet className="w-7 h-7" />,
    accentColor: '#059669',
    index: 2,
  },
];

// ─── Countdown formatter ──────────────────────────────────────────────────────

function formatCountdown(progress: number): string {
  // progress 0→1 → 60:00 → 00:00
  const totalSeconds = Math.round((1 - Math.min(1, progress)) * 3600);
  const mm = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const ss = (totalSeconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HowItWorksCinematic() {
  // ── Media query state ────────────────────────────────────────────────────────
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  });

  useEffect(() => {
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mqMotion.addEventListener('change', onMotion);

    const mqWidth = window.matchMedia('(max-width: 768px)');
    const onWidth = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mqWidth.addEventListener('change', onWidth);

    return () => {
      mqMotion.removeEventListener('change', onMotion);
      mqWidth.removeEventListener('change', onWidth);
    };
  }, []);

  // Cinematic mode = desktop && no reduced-motion preference
  const cinematic = !prefersReduced && !isMobile;

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const sectionRef  = useRef<HTMLElement>(null);
  const trackRef    = useRef<HTMLDivElement>(null);
  const hudLabelRef = useRef<HTMLSpanElement>(null);   // MM:SS text
  const hudClockRef = useRef<HTMLDivElement>(null);    // wrapper for color
  const wipe0Ref    = useRef<HTMLDivElement>(null);    // wipe between card 0→1
  const wipe1Ref    = useRef<HTMLDivElement>(null);    // wipe between card 1→2
  const card0Ref    = useRef<HTMLDivElement>(null);
  const card1Ref    = useRef<HTMLDivElement>(null);
  const card2Ref    = useRef<HTMLDivElement>(null);

  // ── GSAP (cinematic only, scoped to sectionRef) ───────────────────────────
  useGSAP(
    () => {
      if (!cinematic) return;

      const section = sectionRef.current;
      const track   = trackRef.current;
      const label   = hudLabelRef.current;
      const clock   = hudClockRef.current;
      const wipe0   = wipe0Ref.current;
      const wipe1   = wipe1Ref.current;
      const card0   = card0Ref.current;
      const card1   = card1Ref.current;
      const card2   = card2Ref.current;

      if (!section || !track || !label || !clock || !wipe0 || !wipe1 || !card0 || !card1 || !card2) return;

      // ── Starting states ────────────────────────────────────────────────────
      // Card 0 starts active; cards 1 & 2 start dimmed/small
      gsap.set([card1, card2], { scale: 0.88, opacity: 0.3, filter: 'blur(4px)' });
      gsap.set(card0, { scale: 1, opacity: 1, filter: 'blur(0px)' });
      gsap.set([wipe0, wipe1], {
        clipPath: 'circle(0% at 50% 50%)',
        opacity: 0,
      });

      // ── Helper: how far to slide the track ────────────────────────────────
      // Now that track is relative, offsetLeft is stable and relative to track.
      // We return -target so the active card is perfectly centered.
      const getSlideForCard = (cardEl: HTMLDivElement) => {
        const sectionW = section.offsetWidth;
        const cardCenter = cardEl.offsetLeft + cardEl.offsetWidth / 2;
        const target = cardCenter - sectionW / 2;
        return -target;
      };

      // Set initial centered state for card0
      gsap.set(track, { x: () => getSlideForCard(card0) });

      // ── Main scrubbed timeline ────────────────────────────────────────────
      const tl = gsap.timeline({ paused: true });

      // Segment 0 → 0.45: slide track from card 0 to card 1
      tl
        .fromTo(track, 
          { x: () => getSlideForCard(card0) },
          {
            x: () => getSlideForCard(card1),
            ease: 'none',
            duration: 0.45,
          }, 
          0
        )
        // Card 0 dims out
        .to(card0, { scale: 0.88, opacity: 0.3, filter: 'blur(3px)', ease: 'power2.in', duration: 0.18 }, 0.22)
        // Wipe 0→1 flourish at ~30 % of timeline
        .to(wipe0, { clipPath: 'circle(80% at 50% 50%)', opacity: 1, duration: 0.08, ease: 'power4.out' }, 0.29)
        .to(wipe0, { clipPath: 'circle(0% at 50% 50%)', opacity: 0, duration: 0.08, ease: 'power4.in'  }, 0.38)
        // Card 1 scales up
        .to(card1, { scale: 1, opacity: 1, filter: 'blur(0px)', ease: 'power2.out', duration: 0.15 }, 0.33)

        // Segment 0.5 → 1.0: slide track so card 2 is centered
        .to(track, {
          x: () => getSlideForCard(card2),
          ease: 'none',
          duration: 0.5,
        }, 0.5)
        // Card 1 dims
        .to(card1, { scale: 0.88, opacity: 0.3, filter: 'blur(3px)', ease: 'power2.in', duration: 0.18 }, 0.66)
        // Wipe 1→2 flourish at ~75 %
        .to(wipe1, { clipPath: 'circle(80% at 50% 50%)', opacity: 1, duration: 0.08, ease: 'power4.out' }, 0.73)
        .to(wipe1, { clipPath: 'circle(0% at 50% 50%)', opacity: 0, duration: 0.08, ease: 'power4.in'  }, 0.82)
        // Card 2 scales up
        .to(card2, { scale: 1, opacity: 1, filter: 'blur(0px)', ease: 'power2.out', duration: 0.15 }, 0.77);

      // ── ScrollTrigger (pins section, scrubs timeline) ─────────────────────
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: '+=300%',
        pin: true,
        scrub: 1.2,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        animation: tl,
        onUpdate(self) {
          const p = self.progress;

          // ── Update countdown HUD ─────────────────────────────────────────
          label.textContent = formatCountdown(p);

          // ── Tint clock: goldenhour → crimson ─────────────────────────────
          let r: number, g: number, b: number, glow: string;
          if (p >= 0.85) {
            r = 220; g = 38; b = 38;
            glow = 'rgba(220,38,38,0.7)';
          } else if (p >= 0.6) {
            const t = (p - 0.6) / 0.25;
            r = Math.round(245 + (220 - 245) * t);
            g = Math.round(158 + (38  - 158) * t);
            b = Math.round(11  + (38  - 11 ) * t);
            glow = `rgba(220,38,38,${(t * 0.5).toFixed(2)})`;
          } else {
            r = 245; g = 158; b = 11;
            glow = 'rgba(245,158,11,0.4)';
          }
          clock.style.color = `rgb(${r},${g},${b})`;
          clock.style.textShadow = `0 0 30px ${glow}`;
        },
      });

      // ── Resize → refresh (debounced) ──────────────────────────────────────
      let timer: ReturnType<typeof setTimeout>;
      const onResize = () => {
        clearTimeout(timer);
        timer = setTimeout(() => ScrollTrigger.refresh(), 200);
      };
      window.addEventListener('resize', onResize, { passive: true });
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', onResize);
      };
    },
    { scope: sectionRef, dependencies: [cinematic] },
  );

  // ── After fonts / images load, re-measure ────────────────────────────────
  useEffect(() => {
    if (!cinematic) return;
    const refresh = () => ScrollTrigger.refresh();
    if (document.readyState === 'complete') {
      requestAnimationFrame(refresh);
    } else {
      window.addEventListener('load', refresh, { once: true });
      return () => window.removeEventListener('load', refresh);
    }
  }, [cinematic]);

  // ──────────────────────────────────────────────────────────────────────────
  //  STATIC FALLBACK (mobile / reduced-motion)
  // ──────────────────────────────────────────────────────────────────────────
  if (!cinematic) {
    return (
      <section id="how-it-works" className="py-16 md:py-24 px-6 relative overflow-hidden">
        <div className="max-w-6xl mx-auto mb-12 text-center">
          <p className="text-[10px] font-black text-goldenhour uppercase tracking-[0.3em] mb-2">
            How It Works
          </p>
          <h2 className="text-display-lg text-dark-ink">
            Three steps.{' '}
            <span className="text-white/90">Zero delay.</span>
          </h2>
          {/* Static countdown badge */}
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emergency" />
            <span className="font-mono text-sm font-bold text-goldenhour">60:00</span>
            <span className="text-xs text-dark-ink-muted">Golden Hour Countdown</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          {STEPS.map((step) => (
            <StaticStepCard key={step.step} step={step} />
          ))}
        </div>
      </section>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  CINEMATIC DESKTOP LAYOUT
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="relative overflow-hidden bg-dark-bg"
      style={{ height: '100vh' }}
      aria-label="How GoldenHour works — scroll-driven cinematic sequence"
    >
      {/* ── Ambient background glows ─────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(220,38,38,0.06) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 40% 30% at 80% 20%, rgba(245,158,11,0.05) 0%, transparent 70%)',
        }}
      />

      {/* ── Section heading ───────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 px-8 pt-10 pb-4 pointer-events-none">
        <div className="max-w-6xl mx-auto">
          <p className="text-[10px] font-black text-goldenhour uppercase tracking-[0.3em] mb-1">
            How It Works
          </p>
          <h2 className="text-display-lg text-dark-ink">
            Three steps.{' '}
            <span className="text-white/90">Zero delay.</span>
          </h2>
        </div>
      </div>

      {/* ── Countdown HUD ─────────────────────────────────────────────────── */}
      <div
        className="absolute top-8 right-8 z-30 select-none pointer-events-none"
        aria-label="Golden hour countdown"
        aria-live="off"
      >
        <div className="glass-card px-5 py-3 flex flex-col items-center gap-1 border border-white/10">
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-dark-ink-muted">
            Golden Hour
          </span>
          {/* Big clock — ref'd for live color + text updates */}
          <div
            ref={hudClockRef}
            className="font-mono font-black leading-none"
            style={{
              fontSize: 'clamp(2rem, 3.5vw, 3.25rem)',
              color: '#F59E0B',
              textShadow: '0 0 20px rgba(245,158,11,0.4)',
              letterSpacing: '-0.02em',
            }}
          >
            <span ref={hudLabelRef}>60:00</span>
          </div>
          <span className="text-[9px] text-dark-ink-muted/60 uppercase tracking-widest">
            Remaining
          </span>
          <div className="w-full h-px mt-1 bg-gradient-to-r from-transparent via-goldenhour/40 to-transparent" />
        </div>
      </div>

      {/* ── Horizontal card track + wipe overlays ─────────────────────────── */}
      <div
        className="absolute inset-0 flex items-center overflow-hidden"
        style={{ paddingTop: '140px' }}
      >
        {/* Left & right fade edges */}
        <div
          className="absolute left-0 top-0 bottom-0 w-28 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, rgba(10,10,15,0.95) 0%, transparent 100%)' }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-28 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, rgba(10,10,15,0.85) 0%, transparent 100%)' }}
        />

        {/* Blood-drop wipe overlays — cover the full track viewport, triggered by GSAP */}
        <div
          ref={wipe0Ref}
          className="absolute inset-0 pointer-events-none z-20 will-change-[clip-path,opacity]"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(220,38,38,0.4) 0%, rgba(180,10,10,0.15) 45%, transparent 100%)',
            clipPath: 'circle(0% at 50% 50%)',
            opacity: 0,
          }}
        />
        <div
          ref={wipe1Ref}
          className="absolute inset-0 pointer-events-none z-20 will-change-[clip-path,opacity]"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(220,38,38,0.4) 0%, rgba(180,10,10,0.15) 45%, transparent 100%)',
            clipPath: 'circle(0% at 50% 50%)',
            opacity: 0,
          }}
        />

        {/* The sliding track */}
        <div
          ref={trackRef}
          className="flex items-center gap-10 will-change-transform"
          style={{
            position: 'relative',
            paddingLeft: '10vw',
            paddingRight: '12vw',
          }}
        >
          <CinematicStepCard step={STEPS[0]} cardRef={card0Ref} />
          <CinematicStepCard step={STEPS[1]} cardRef={card1Ref} />
          <CinematicStepCard step={STEPS[2]} cardRef={card2Ref} />
        </div>
      </div>

      {/* ── Scroll cue ────────────────────────────────────────────────────── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40 pointer-events-none z-20">
        <span className="text-[9px] text-dark-ink-muted uppercase tracking-[0.3em] font-semibold">
          Scroll to continue
        </span>
        <div className="w-5 h-8 border border-white/20 rounded-full flex items-start justify-center p-1.5">
          <div className="w-1 h-2 bg-goldenhour rounded-full animate-scroll-hint" />
        </div>
      </div>
    </section>
  );
}

// ─── CinematicStepCard ────────────────────────────────────────────────────────

function CinematicStepCard({
  step,
  cardRef,
}: {
  step: StepCard;
  cardRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={cardRef}
      className="shrink-0 glass-card flex flex-col justify-between relative overflow-hidden will-change-transform"
      style={{
        width: 'clamp(300px, 26vw, 420px)',
        height: 'clamp(300px, 40vh, 400px)',
        borderColor: `${step.accentColor}20`,
      }}
    >
      {/* Accent top bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-3xl"
        style={{ background: `linear-gradient(90deg, ${step.accentColor} 0%, transparent 100%)` }}
      />

      {/* Number watermark */}
      <div
        className="absolute top-5 right-5 font-mono font-black text-[4.5rem] leading-none select-none pointer-events-none"
        style={{ color: `${step.accentColor}0C`, letterSpacing: '-0.05em' }}
      >
        {String(step.index + 1).padStart(2, '0')}
      </div>

      {/* Content */}
      <div className="p-10">
        <div
          className="mb-6 w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{
            background: `${step.accentColor}15`,
            color: step.accentColor,
            boxShadow: `0 0 20px ${step.accentColor}25`,
          }}
        >
          {step.icon}
        </div>
        <p
          className="text-[10px] font-black uppercase tracking-[0.3em] mb-2"
          style={{ color: step.accentColor }}
        >
          {step.step}
        </p>
        <h3 className="text-2xl font-bold text-dark-ink mb-3 font-display">
          {step.title}
        </h3>
        <p className="text-sm text-dark-ink-muted leading-relaxed">
          {step.description}
        </p>
      </div>

      {/* Bottom accent bar */}
      <div
        className="mx-10 mb-8 h-[2px] rounded-full"
        style={{ background: `linear-gradient(90deg, ${step.accentColor} 0%, transparent 80%)` }}
      />
    </div>
  );
}

// ─── StaticStepCard ───────────────────────────────────────────────────────────

function StaticStepCard({ step }: { step: StepCard }) {
  return (
    <div
      className="glass-card flex flex-col justify-between relative overflow-hidden"
      style={{ borderColor: `${step.accentColor}20` }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-3xl"
        style={{ background: `linear-gradient(90deg, ${step.accentColor} 0%, transparent 100%)` }}
      />
      <div className="p-8">
        <div
          className="mb-5 w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: `${step.accentColor}15`, color: step.accentColor }}
        >
          {step.icon}
        </div>
        <p
          className="text-[10px] font-black uppercase tracking-[0.3em] mb-2"
          style={{ color: step.accentColor }}
        >
          {step.step}
        </p>
        <h3 className="text-xl font-bold text-dark-ink mb-3 font-display">{step.title}</h3>
        <p className="text-sm text-dark-ink-muted leading-relaxed">{step.description}</p>
      </div>
      <div
        className="mx-8 mb-6 h-[2px] rounded-full"
        style={{ background: `linear-gradient(90deg, ${step.accentColor} 0%, transparent 80%)` }}
      />
    </div>
  );
}
