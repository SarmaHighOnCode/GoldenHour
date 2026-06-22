import React, { useEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger } from '../../lib/gsap-setup';

interface EkgSpineProps {}

const getEkgPath = (height: number, type: 'normal' | 'flatline' | 'revived') => {
  const cycleHeight = 120;
  // Generate a little bit of extra padding to ensure the path goes fully offscreen
  const numCycles = Math.ceil((height + 100) / cycleHeight);
  let d = 'M 24 0';

  const relativePoints = [
    { y: 0.0, normal: 24, flatline: 24, revived: 24 },
    { y: 0.15, normal: 24, flatline: 24, revived: 24 },
    { y: 0.20, normal: 28, flatline: 24, revived: 34 },
    { y: 0.25, normal: 24, flatline: 24, revived: 24 },
    { y: 0.35, normal: 24, flatline: 24, revived: 24 },
    { y: 0.38, normal: 20, flatline: 24, revived: 14 },
    { y: 0.42, normal: 42, flatline: 24, revived: 46 },
    { y: 0.46, normal: 8, flatline: 24, revived: 2 },
    { y: 0.50, normal: 24, flatline: 24, revived: 24 },
    { y: 0.60, normal: 24, flatline: 24, revived: 24 },
    { y: 0.66, normal: 31, flatline: 24, revived: 38 },
    { y: 0.72, normal: 24, flatline: 24, revived: 24 },
    { y: 0.85, normal: 24, flatline: 24, revived: 24 },
    { y: 0.90, normal: 25, flatline: 24, revived: 32 },
    { y: 1.0, normal: 24, flatline: 24, revived: 24 },
  ];

  for (let i = 0; i < numCycles; i++) {
    const startY = i * cycleHeight;
    relativePoints.forEach((pt) => {
      const yVal = startY + pt.y * cycleHeight;
      let xVal = 24;
      if (type === 'normal') {
        xVal = pt.normal;
      } else if (type === 'flatline') {
        xVal = pt.flatline;
      } else if (type === 'revived') {
        xVal = pt.revived;
      }
      
      if (i === 0 && pt.y === 0.0) return;
      d += ` L ${xVal.toFixed(1)} ${yVal.toFixed(1)}`;
    });
  }
  return d;
};

export const EkgSpine: React.FC<EkgSpineProps> = () => {
  const [height, setHeight] = useState(800);
  const [prefersReduced, setPrefersReduced] = useState(false);
  const pathRef = useRef<SVGPathElement>(null);
  const pulseRef = useRef<SVGCircleElement>(null);
  const trailRefs = useRef<(SVGCircleElement | null)[]>([]);
  const activeState = useRef<'normal' | 'flatline' | 'revived'>('normal');
  const pulseAnimRef = useRef<gsap.core.Tween | null>(null);

  // Read window height & handle resize
  useEffect(() => {
    const handleResize = () => {
      setHeight(window.innerHeight);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Detect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const normalD = getEkgPath(height, 'normal');
  const flatlineD = getEkgPath(height, 'flatline');
  const revivedD = getEkgPath(height, 'revived');

  // Align path immediately when height changes (to avoid resize jumps)
  useEffect(() => {
    if (pathRef.current) {
      let targetD = normalD;
      if (activeState.current === 'flatline') targetD = flatlineD;
      else if (activeState.current === 'revived') targetD = revivedD;
      gsap.set(pathRef.current, { attr: { d: targetD } });
    }
  }, [height, normalD, flatlineD, revivedD]);

  // Set up animations and ScrollTriggers
  useEffect(() => {
    if (prefersReduced) return;

    const transitionToState = (state: 'normal' | 'flatline' | 'revived') => {
      activeState.current = state;
      let targetD = normalD;
      let targetTimeScale = 1.0;

      if (state === 'flatline') {
        targetD = flatlineD;
        targetTimeScale = 0.15;
      } else if (state === 'revived') {
        targetD = revivedD;
        targetTimeScale = 1.6;
      }

      // Tween path shape morph
      if (pathRef.current) {
        gsap.to(pathRef.current, {
          attr: { d: targetD },
          duration: 0.8,
          ease: 'power2.inOut',
          overwrite: 'auto',
        });
      }

      // Tween pulse speed
      if (pulseAnimRef.current) {
        gsap.to(pulseAnimRef.current, {
          timeScale: targetTimeScale,
          duration: 0.8,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }
    };

    // looping pulse animation (60bpm default)
    const progressObj = { value: 0 };
    const pulseAnim = gsap.to(progressObj, {
      value: 1,
      duration: 1,
      ease: 'none',
      repeat: -1,
      onUpdate: () => {
        if (!pathRef.current) return;
        const path = pathRef.current;
        const totalLength = path.getTotalLength();
        if (totalLength === 0) return;

        // main pulse circle
        const p0 = path.getPointAtLength(progressObj.value * totalLength);
        if (pulseRef.current) {
          pulseRef.current.setAttribute('cx', p0.x.toString());
          pulseRef.current.setAttribute('cy', p0.y.toString());
        }

        // trail circles
        for (let i = 0; i < 3; i++) {
          const trailRef = trailRefs.current[i];
          if (trailRef) {
            let trailProgress = progressObj.value - (i + 1) * 0.015;
            if (trailProgress < 0) trailProgress += 1.0;
            const pt = path.getPointAtLength(trailProgress * totalLength);
            trailRef.setAttribute('cx', pt.x.toString());
            trailRef.setAttribute('cy', pt.y.toString());
          }
        }
      },
    });
    pulseAnimRef.current = pulseAnim;

    // ScrollTrigger 1: Problem Statement Section
    const trigger1 = ScrollTrigger.create({
      trigger: '#problem-statement',
      start: 'top 75%',
      end: 'bottom 25%',
      onEnter: () => transitionToState('flatline'),
      onEnterBack: () => transitionToState('flatline'),
      onLeave: () => transitionToState('normal'),
      onLeaveBack: () => transitionToState('normal'),
    });

    // ScrollTrigger 2: CTA Footer Section
    const trigger2 = ScrollTrigger.create({
      trigger: '#cta-footer',
      start: 'top 85%',
      end: 'bottom bottom',
      onEnter: () => transitionToState('revived'),
      onLeaveBack: () => transitionToState('normal'),
    });

    // Initial check in case starting scrolled down
    ScrollTrigger.refresh();

    return () => {
      pulseAnim.kill();
      trigger1.kill();
      trigger2.kill();
    };
  }, [height, normalD, flatlineD, revivedD, prefersReduced]);

  if (prefersReduced) {
    return (
      <div className="hidden md:block fixed left-0 top-0 w-12 h-screen z-10 pointer-events-none opacity-25">
        <svg
          width="48"
          height="100%"
          viewBox={`0 0 48 ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          <path
            d={`M 24 0 L 24 ${height}`}
            fill="none"
            stroke="rgba(220, 38, 38, 0.25)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="hidden md:block fixed left-0 top-0 w-12 h-screen z-10 pointer-events-none opacity-40">
      <svg
        width="48"
        height="100%"
        viewBox={`0 0 48 ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <filter id="ekg-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="ekg-grad" x1="0" y1="0" x2="0" y2={height} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#DC2626" stopOpacity="0.2" />
            <stop offset="20%" stopColor="#DC2626" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.3" />
            <stop offset="80%" stopColor="#DC2626" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#DC2626" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Subtle background rail line */}
        <line
          x1="24"
          y1="0"
          x2="24"
          y2={height}
          stroke="rgba(255, 255, 255, 0.03)"
          strokeWidth="1"
        />

        {/* Main EKG Line */}
        <path
          ref={pathRef}
          d={normalD}
          fill="none"
          stroke="url(#ekg-grad)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Pulse Circle */}
        <circle
          ref={pulseRef}
          r="4"
          fill="#DC2626"
          filter="url(#ekg-glow)"
        />

        {/* Trail Circles */}
        <circle
          ref={(el) => { trailRefs.current[0] = el; }}
          r="3"
          fill="#DC2626"
          opacity="0.6"
          filter="url(#ekg-glow)"
        />
        <circle
          ref={(el) => { trailRefs.current[1] = el; }}
          r="2"
          fill="#DC2626"
          opacity="0.3"
        />
        <circle
          ref={(el) => { trailRefs.current[2] = el; }}
          r="1.5"
          fill="#DC2626"
          opacity="0.15"
        />
      </svg>
    </div>
  );
};
