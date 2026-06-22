import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { gsap, ScrollTrigger } from '../lib/gsap-setup';
import { CountUp } from './motion/CountUp';
import { TextReveal } from './motion/TextReveal';
import { EkgSpine } from './motion/EkgSpine';
import { HeroCinematicCarousel } from './motion/HeroCinematicCarousel';
import { HowItWorksCinematic } from './motion/HowItWorksCinematic';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { api } from '../lib/api';
import { Droplet, Zap, Phone } from 'lucide-react';

// Cinematic slides are now managed inside HeroCinematicCarousel (SOS always first).

export default function PatientIntakeView() {
  const navigate = useNavigate();

  // Selections
  const [emergencyType, setEmergencyType] = useState<string>('');
  const [bloodGroup, setBloodGroup] = useState<string>('');

  // Geolocation State
  const [locating, setLocating] = useState<boolean>(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Form submission states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Dispatch transition states
  const [dispatchState, setDispatchState] = useState<'idle' | 'dispatching'>('idle');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [animationFinished, setAnimationFinished] = useState<boolean>(false);
  const [prefersReduced, setPrefersReduced] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // Ref to hold resolved request_id so it can be navigated to after animation finishes
  const resolvedRequestIdRef = useRef<string | null>(null);

  // Carousel state now lives inside HeroCinematicCarousel component.

  // Refs for GSAP animations
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const heroSubRef = useRef<HTMLParagraphElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);
  const intakeSectionRef = useRef<HTMLElement>(null);
  const intakeLeftRef = useRef<HTMLDivElement>(null);
  const intakeRightRef = useRef<HTMLDivElement>(null);

  // Parallax scroll tracking
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, (prefersReduced || isMobile) ? 0 : 120]);
  const darkenOpacity = useTransform(scrollYProgress, [0, 1], [0, (prefersReduced || isMobile) ? 0 : 0.6]);

  // Trigger Geolocation API
  const handleAcquireLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Your browser does not support location services.');
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: parseFloat(position.coords.latitude.toFixed(6)),
          lng: parseFloat(position.coords.longitude.toFixed(6))
        });
        setLocating(false);
      },
      (error) => {
        let errorMsg = 'Failed to acquire location. Please try again.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied. Please enable location access.';
        }
        setLocationError(errorMsg);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const isFormValid = coords !== null && emergencyType !== '' && bloodGroup !== '';

  const dispatchEmergency = async () => {
    if (!isFormValid || !coords) return;
    setIsSubmitting(true);
    setSubmitError(null);
    resolvedRequestIdRef.current = null;
    setAnimationFinished(false);
    setCurrentStep(0);
    setDispatchState('dispatching');

    // Timer list to clear on cleanup/error
    const activeTimers: NodeJS.Timeout[] = [];

    // Trigger API call in background
    const apiCallPromise = api.triggerEmergency(coords.lat, coords.lng, emergencyType, bloodGroup)
      .then((data) => {
        if (data && data.request_id) {
          sessionStorage.setItem(`emergency_${data.request_id}`, JSON.stringify({
            bloodGroup,
            emergencyType,
            rareGroup: data.rare_group ?? bloodGroup.endsWith('-')
          }));
          resolvedRequestIdRef.current = data.request_id;
          return data.request_id;
        } else {
          throw new Error('Invalid request ID returned from server.');
        }
      });

    if (prefersReduced) {
      // Reduced motion: navigate immediately when API call finishes
      try {
        const requestId = await apiCallPromise;
        setDispatchState('idle');
        setIsSubmitting(false);
        navigate(`/results/${requestId}`);
      } catch (err: any) {
        setSubmitError(err.message || 'Connection failed. Please verify that the API is online.');
        setDispatchState('idle');
        setIsSubmitting(false);
      }
      return;
    }

    // Standard motion: orchestrate step-by-step checkmarks sequence (1.0s total)
    // Step 1 checkmark: 300ms
    activeTimers.push(setTimeout(() => {
      setCurrentStep(1);
    }, 300));

    // Step 2 checkmark: 600ms
    activeTimers.push(setTimeout(() => {
      setCurrentStep(2);
    }, 600));

    // Step 3 checkmark: 900ms
    activeTimers.push(setTimeout(() => {
      setCurrentStep(3);
    }, 900));

    // Sequence completion check: 1000ms
    activeTimers.push(setTimeout(async () => {
      setAnimationFinished(true);
      
      // Wait for API call to complete if it hasn't already
      try {
        const requestId = await apiCallPromise;
        setDispatchState('idle');
        setIsSubmitting(false);
        navigate(`/results/${requestId}`);
      } catch (err: any) {
        setSubmitError(err.message || 'Connection failed. Please verify that the API is online.');
        setDispatchState('idle');
        setIsSubmitting(false);
      }
    }, 1000));

    // Watch API call concurrently to handle early failures
    apiCallPromise.catch((err: any) => {
      // Clear all active timers immediately on error to abort sequence
      activeTimers.forEach(clearTimeout);
      setSubmitError(err.message || 'Connection failed. Please verify that the API is online.');
      setDispatchState('idle');
      setIsSubmitting(false);
    });
  };

  const typeOptions = [
    { value: '', label: '-- Choose Emergency Type --' },
    { value: 'trauma', label: 'Trauma / Accident' },
    { value: 'cardiac', label: 'Cardiac / Heart' },
    { value: 'obstetric', label: 'Obstetric / Pregnancy' },
    { value: 'general', label: 'General Medical' }
  ];

  const bloodOptions = [
    { value: '', label: '-- Choose Blood Group --' },
    { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' },
    { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' },
    { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' }
  ];

  const stepDetails = [
    { label: 'Locking GPS', showAtStep: 0 },
    { label: 'Matching nearest hospital', showAtStep: 1 },
    { label: 'Broadcasting to donors in range', showAtStep: 2 },
  ];

  // Hero staggered title reveal — re-runs when shouldRenderGlobe settles so the
  // animation fires AFTER the Suspense swap (which would otherwise trigger ctx.revert).
  useEffect(() => {
    // Skip animation if reduced motion is preferred — chars are visible by default,
    // just ensure no inline transforms are applied.
    if (prefersReduced) {
      if (heroTitleRef.current) {
        const chars = heroTitleRef.current.querySelectorAll<HTMLElement>('.char-span');
        chars.forEach(c => { c.style.transform = 'none'; });
      }
      if (heroSubRef.current) heroSubRef.current.style.opacity = '1';
      if (scrollHintRef.current) scrollHintRef.current.style.opacity = '1';
      return;
    }

    const ctx = gsap.context(() => {
      // Title letters stagger — use y transform reveal (word-spans have overflow:hidden)
      // so chars slide up into view without needing opacity at all,
      // preserving the parent text-gradient clip.
      if (heroTitleRef.current) {
        const chars = heroTitleRef.current.querySelectorAll('.char-span');
        gsap.set(chars, { y: '110%' });
        gsap.to(chars, {
          y: 0,
          duration: 0.7,
          stagger: 0.03,
          ease: 'power3.out',
          delay: 0.2,
        });
      }

      // Subtitle fade in
      if (heroSubRef.current) {
        gsap.fromTo(heroSubRef.current,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', delay: 1.2 }
        );
      }

      // Scroll hint pulse
      if (scrollHintRef.current) {
        gsap.fromTo(scrollHintRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 1, delay: 2 }
        );
      }
    });

    return () => ctx.revert();
  // Re-runs when prefersReduced changes so animation respects motion preference.
  }, [prefersReduced]);

  // Intake section scroll-driven entrance animation (3D tilt reveal)
  useEffect(() => {
    if (prefersReduced) return;

    const section = intakeSectionRef.current;
    const leftEl = intakeLeftRef.current;
    const rightEl = intakeRightRef.current;

    if (!section || !leftEl || !rightEl) return;

    // Set perspective on the parent container to enable 3D transforms
    gsap.set(section, { perspective: 1000 });

    const ctx = gsap.context(() => {
      // Left description column: slide in from left and fade in
      gsap.fromTo(leftEl,
        { opacity: 0, x: -50 },
        {
          opacity: 1,
          x: 0,
          scrollTrigger: {
            trigger: section,
            start: 'top 85%',
            end: 'top 45%',
            scrub: 1,
          }
        }
      );

      // Right dispatch console: 3D rotate entry, scale up, and slide up
      gsap.fromTo(rightEl,
        {
          opacity: 0,
          y: 100,
          scale: 0.93,
          transformOrigin: '50% 50%',
          rotationX: 12,
          rotationY: -8,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          rotationX: 0,
          rotationY: 0,
          scrollTrigger: {
            trigger: section,
            start: 'top 85%',
            end: 'top 40%',
            scrub: 1,
          }
        }
      );
    }, section);

    return () => ctx.revert();
  }, [prefersReduced]);

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15,
      }
    }
  };

  const cardVariants = {
    hidden: prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut'
      }
    }
  };

  return (
    <div className="w-full">
      <EkgSpine />


      {/* =============================================
          SECTION 1: HERO — Full screen dark canvas
          ============================================= */}
      <section ref={heroRef} className="min-h-[80vh] flex items-center justify-center glow-amber glow-crimson relative overflow-hidden pt-20 pb-12 md:pt-28 md:pb-16">
        {/* Background Canvas: Cinematic carousel (always) + optional 3D Globe overlay on desktop */}
        {/* Carousel always visible — globe renders on top for desktop/WebGL capable devices */}
        <motion.div style={{ y }} className="absolute inset-0 z-0">
          <HeroCinematicCarousel />
        </motion.div>



        {/* Dark Ambient Overlays (Layer 1-5 + scroll fade) - Always rendered to keep copy legible */}
        <div className="absolute inset-0 z-[1] bg-[#0A0A0F]/45 pointer-events-none" />
        <div className="absolute inset-0 z-[2] bg-gradient-to-b from-[#0A0A0F]/80 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 z-[2] bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/20 to-transparent pointer-events-none" />
        <div className="absolute inset-0 z-[3] pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 45%, rgba(10,10,15,0.6) 0%, transparent 100%)' }} />
        <div className="absolute inset-0 z-[3] pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 80%, rgba(220,38,38,0.18) 0%, transparent 70%)' }} />
        <motion.div style={{ opacity: darkenOpacity }} className="absolute inset-0 z-[4] bg-[#0A0A0F] pointer-events-none" />

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto space-y-6">
          {/* Giant display title */}
          <h1
            ref={heroTitleRef}
            className="text-display-xl text-gradient overflow-hidden"
            style={{ filter: 'drop-shadow(0 2px 20px rgba(0,0,0,0.8))' }}
          >
            {(() => {
              const text = "Every Second Counts";
              const words = text.split(' ');
              return words.map((word, wordIdx) => (
                <span key={wordIdx} className="word-span inline-block" style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  {word.split('').map((char, charIdx) => (
                    <span
                      key={charIdx}
                      className="char-span inline-block"
                    >
                      {char}
                    </span>
                  ))}
                  {wordIdx < words.length - 1 && (
                    <span className="inline-block">&nbsp;</span>
                  )}
                </span>
              ));
            })()}
          </h1>

          {/* Subtitle */}
          <p
            ref={heroSubRef}
            className="text-display-md text-dark-ink-muted max-w-2xl mx-auto opacity-0"
            style={{ textShadow: '0 1px 12px rgba(0,0,0,0.9)' }}
          >
            Smart emergency dispatch. Nearest hospital. Matched blood donors.
            <span className="text-goldenhour font-bold"> All in real time.</span>
          </p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Button
              href="#intake"
              variant="emergency"
            >
              <Zap className="w-5 h-5 text-white" />
              Get Help Now
            </Button>
            <Button
              to="/register"
              variant="secondary"
            >
              <Droplet className="w-5 h-5 text-goldenhour" />
              Register as Donor
            </Button>
          </motion.div>
        </div>

        {/* Scroll hint */}
        <div ref={scrollHintRef} className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-0">
          <span className="text-[10px] text-dark-ink-muted uppercase tracking-[0.3em] font-semibold">Scroll</span>
          <div className="w-5 h-8 border border-white/20 rounded-full flex items-start justify-center p-1.5">
            <div className="w-1 h-2 bg-goldenhour rounded-full animate-scroll-hint" />
          </div>
        </div>
      </section>

      {/* =============================================
          SECTION 2: PROBLEM STATEMENT — Text reveals
          ============================================= */}
      <section id="problem-statement" className="py-12 md:py-16 px-6 glow-crimson relative overflow-hidden flex items-center justify-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <TextReveal
            as="h2"
            className="text-display-lg text-dark-ink leading-tight"
            stagger={0.06}
            start="top 80%"
            end="top 30%"
          >
            In an emergency, every minute between injury and hospital care determines survival. The golden hour is not a metaphor — it is a countdown.
          </TextReveal>

          <TextReveal
            as="p"
            className="text-display-md text-dark-ink-muted leading-relaxed max-w-3xl"
            stagger={0.03}
            start="top 85%"
            end="top 35%"
          >
            GoldenHour eliminates the chaos. One tap locks your GPS, dispatches the nearest hospital with a matching department, and broadcasts to every registered blood donor within range. Simultaneously.
          </TextReveal>
        </div>
      </section>

      {/* =============================================
          SECTION 3: INTAKE CONSOLE — Pinned booking form
          ============================================= */}
      <section id="intake" ref={intakeSectionRef} className="py-12 md:py-16 px-6 relative glow-amber">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left: Descriptive text */}
          <div
            ref={intakeLeftRef}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emergency/10 border border-emergency/20 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emergency animate-pulse" />
              <span className="text-[10px] font-black text-emergency uppercase tracking-widest">Live Dispatch</span>
            </div>
            <h2 className="text-display-lg text-dark-ink">
              Lock. Dispatch. <span className="text-white/90">Save.</span>
            </h2>
            <p className="text-base text-dark-ink-muted leading-relaxed max-w-md">
              Pin your GPS coordinates, select the emergency type and blood group needed, then hit dispatch. We route the request to the closest matching hospital and alert nearby donors instantly.
            </p>
            <div className="flex items-center gap-6 pt-2 text-dark-ink-muted">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                <span className="text-xs font-semibold">GPS Precision</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                <span className="text-xs font-semibold">Real-time Sync</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                <span className="text-xs font-semibold">Donor Alert</span>
              </div>
            </div>
          </div>

          {/* Right: Intake Form Card */}
          <div
            ref={intakeRightRef}
          >
            <div className="glass-card p-8 space-y-5 relative animate-pulse-glow">
              {/* Top accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emergency via-goldenhour to-emergency rounded-t-3xl" />

              {/* Header */}
              <div className="text-center space-y-2 pt-2">
                <h3 className="text-xl font-black tracking-tight text-dark-ink">Emergency Dispatch</h3>
                <p className="text-xs text-dark-ink-muted">Secure your location and select emergency details.</p>
              </div>

              {/* Location Button */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-dark-ink-muted uppercase tracking-wider">Patient Location</label>
                <Button
                  type="button"
                  onClick={handleAcquireLocation}
                  isLoading={locating}
                  variant={coords ? 'success' : 'ghost'}
                  fullWidth
                  aria-label={coords ? "Location secured" : "Pin my current location"}
                  className="transition-all duration-300 h-14 rounded-xl"
                >
                  {coords ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      Location Locked
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Pin Current Location
                    </span>
                  )}
                </Button>

                {!coords && !locating && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => { setCoords({ lat: 26.9124, lng: 75.7873 }); setLocationError(null); }}
                      className="text-[11px] text-dark-ink-muted hover:text-goldenhour transition-colors font-medium underline cursor-pointer"
                    >
                      Or use demo location (Jaipur)
                    </button>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {coords && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="bg-white/5 border border-white/10 rounded-xl p-3 text-center"
                    >
                      <p className="text-xs font-semibold text-dark-ink-muted">Coordinates Secured</p>
                      <p className="text-[11px] font-mono text-dark-ink-muted/60 mt-0.5">Lat: {coords.lat} · Lng: {coords.lng}</p>
                      <button type="button" onClick={() => setCoords(null)} className="text-[10px] text-emergency hover:text-emergency-pressed underline font-bold mt-1.5 cursor-pointer">Clear</button>
                    </motion.div>
                  )}
                  {locationError && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="bg-emergency/10 border border-emergency/20 rounded-xl p-3 text-center space-y-2" role="alert"
                    >
                      <p className="text-xs font-bold text-emergency">{locationError}</p>
                      <div className="flex items-center justify-center gap-3">
                        <button type="button" onClick={handleAcquireLocation} className="text-xs text-emergency font-extrabold underline cursor-pointer">Retry</button>
                        <span className="text-xs text-dark-ink-muted/30">|</span>
                        <button type="button" onClick={() => { setCoords({ lat: 26.9124, lng: 75.7873 }); setLocationError(null); }} className="text-xs text-success font-extrabold underline cursor-pointer">Demo Location</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Selects */}
              <Select label="Emergency type" value={emergencyType} onChange={(e) => setEmergencyType(e.target.value)} options={typeOptions} />
              <Select label="Blood group needed" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} options={bloodOptions} />

              {submitError && (
                <div className="bg-emergency/10 border border-emergency/20 rounded-xl p-3 text-center text-xs font-bold text-emergency" role="alert">{submitError}</div>
              )}

              {/* Dispatch Button */}
              <Button
                type="button"
                onClick={dispatchEmergency}
                variant="emergency"
                disabled={!isFormValid || isSubmitting}
                isLoading={isSubmitting}
                fullWidth
                className="mt-2"
              >
                <span className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-white" />
                  GET HELP NOW
                </span>
              </Button>
            </div>
          </div>

        </div>
      </section>

      {/* =============================================
          SECTION 4: HOW IT WORKS — Cinematic scroll
          ============================================= */}
      <HowItWorksCinematic />

      {/* =============================================
          SECTION 5: STATS — Animated counters
          ============================================= */}
      <section className="py-12 md:py-16 px-6 relative overflow-hidden flex items-center justify-center">
        <div className="max-w-5xl mx-auto w-full">
          <motion.div
            initial={prefersReduced ? {} : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center space-y-3 mb-10"
          >
            <p className="text-[10px] font-black text-goldenhour uppercase tracking-[0.3em]">By The Numbers</p>
            <h2 className="text-display-lg text-dark-ink">Built for speed. <span className="text-white/90">Designed for trust.</span></h2>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-10% 0px" }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-8"
          >
            <motion.div variants={cardVariants} className="glass-card p-8 text-center space-y-3">
              <div className="text-5xl font-display font-bold text-goldenhour">
                <CountUp end={6} prefix="< " suffix=" min" />
              </div>
              <p className="text-sm font-semibold text-dark-ink">Average Response</p>
              <p className="text-xs text-dark-ink-muted">From dispatch to hospital confirmation</p>
            </motion.div>

            <motion.div variants={cardVariants} className="glass-card p-8 text-center space-y-3">
              <div className="text-5xl font-display font-bold text-goldenhour">
                <CountUp end={24} suffix="/7" />
              </div>
              <p className="text-sm font-semibold text-dark-ink">Always On</p>
              <p className="text-xs text-dark-ink-muted">Real-time websocket sync, polling fallback</p>
            </motion.div>

            <motion.div variants={cardVariants} className="glass-card p-8 text-center space-y-3">
              <div className="text-5xl font-display font-bold text-goldenhour">
                <CountUp end={100} suffix="%" />
              </div>
              <p className="text-sm font-semibold text-dark-ink">Open Source</p>
              <p className="text-xs text-dark-ink-muted">Transparent, auditable, community-driven</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* =============================================
          SECTION 6: CTA FOOTER
          ============================================= */}
      <section id="cta-footer" className="py-12 md:py-16 px-6 relative">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <TextReveal
            as="h2"
            className="text-display-lg text-gradient"
            stagger={0.04}
            start="top 80%"
            end="top 50%"
          >
            When someone you love needs help, every second is a lifetime.
          </TextReveal>

          <motion.div
            initial={prefersReduced ? {} : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.5, ease: "easeOut", delay: prefersReduced ? 0 : 0.15 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Button
              href="tel:112"
              variant="emergency"
              size="lg"
            >
              <Phone className="w-6 h-6 text-white animate-pulse" />
              Call 112
            </Button>
            <Button
              to="/register"
              variant="secondary"
              size="lg"
            >
              <Droplet className="w-6 h-6 text-goldenhour" />
              Become a Donor
            </Button>
          </motion.div>

          {/* Heartbeat line */}
          <div className="pt-10">
            <svg viewBox="0 0 400 40" className="w-full max-w-md mx-auto opacity-20">
              <polyline
                points="0,20 60,20 80,5 100,35 120,10 140,30 160,20 400,20"
                fill="none"
                stroke="url(#heartbeat-grad)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ strokeDasharray: 1000, animation: 'heartbeat-line 3s linear infinite' }}
              />
              <defs>
                <linearGradient id="heartbeat-grad" x1="0" y1="0" x2="400" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#DC2626" stopOpacity="0" />
                  <stop offset="30%" stopColor="#DC2626" />
                  <stop offset="50%" stopColor="#F59E0B" />
                  <stop offset="70%" stopColor="#DC2626" />
                  <stop offset="100%" stopColor="#DC2626" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Footer credit */}
          <p className="text-[10px] text-dark-ink-muted/40 uppercase tracking-[0.2em]">
            GoldenHour — Every Second Counts
          </p>
        </div>
      </section>

      {/* Full-screen Dispatching Overlay */}
      <AnimatePresence>
        {dispatchState === 'dispatching' && (
          prefersReduced ? (
            <div className="fixed inset-0 bg-[#0A0A0F]/98 flex items-center justify-center z-[99999]">
              <div className="text-center space-y-4">
                <h2 className="text-xl font-bold tracking-wider text-white">Dispatching...</h2>
                <p className="text-sm text-dark-ink-muted">Connecting with emergency response teams.</p>
              </div>
            </div>
          ) : (
            <motion.div
              key="dispatch-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="fixed inset-0 bg-[#0A0A0F]/98 backdrop-blur-md flex flex-col items-center justify-center z-[99999] overflow-hidden"
              style={{ pointerEvents: 'auto' }}
            >
              {/* Conic sweep + Expanding rings */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                <div 
                  className="w-[550px] h-[550px] rounded-full animate-radar-rotate opacity-20"
                  style={{
                    background: 'conic-gradient(from 0deg, rgba(220, 38, 38, 0) 40%, rgba(220, 38, 38, 0.45) 100%)',
                  }}
                />
                <div className="absolute w-[500px] h-[500px] rounded-full border border-red-600/20 animate-radar-ring" style={{ animationDelay: '0s' }} />
                <div className="absolute w-[500px] h-[500px] rounded-full border border-red-600/20 animate-radar-ring" style={{ animationDelay: '1s' }} />
                <div className="absolute w-[500px] h-[500px] rounded-full border border-red-600/20 animate-radar-ring" style={{ animationDelay: '2s' }} />
                
                <div className="absolute w-[150px] h-[150px] rounded-full border border-red-600/10" />
                <div className="absolute w-[300px] h-[300px] rounded-full border border-red-600/10" />
                <div className="absolute w-[450px] h-[450px] rounded-full border border-red-600/10" />
                
                <div className="absolute w-[600px] h-[1px] bg-red-600/10" />
                <div className="absolute h-[600px] w-[1px] bg-red-600/10" />
              </div>

              {/* Content container */}
              <div className="relative z-10 flex flex-col items-center max-w-sm w-full px-6 text-center space-y-10">
                {/* Floating pulse beacon representing patient */}
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-14 h-14 rounded-full bg-emergency/30 animate-ping" />
                  <div className="relative w-10 h-10 rounded-full bg-emergency flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.7)]">
                    <Zap className="w-5 h-5 text-white fill-white animate-pulse" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-black tracking-widest text-white uppercase">Broadcasting SOS</h3>
                  <p className="text-xs text-dark-ink-muted">Do not close this page. Securing medical response.</p>
                </div>

                {/* Dispatch steps checklist */}
                <div className="w-full space-y-4 text-left">
                  {stepDetails.map((step, idx) => {
                    const isVisible = currentStep >= step.showAtStep;
                    const isCompleted = currentStep > idx;
                    const isActive = currentStep === idx;

                    return (
                      <div key={step.label} className="min-h-[64px]">
                        <AnimatePresence>
                          {isVisible && (
                            <motion.div
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.4, ease: "easeOut" }}
                              className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm p-4 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
                            >
                              {/* Status Indicator */}
                              <div className="flex-shrink-0">
                                {isCompleted ? (
                                  <motion.div
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center"
                                  >
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </motion.div>
                                ) : isActive ? (
                                  <div className="relative w-6 h-6 flex items-center justify-center">
                                    <div className="absolute w-5 h-5 rounded-full bg-emergency/35 animate-ping" />
                                    <div className="w-3 h-3 rounded-full bg-emergency shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
                                  </div>
                                ) : (
                                  <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-white/20" />
                                  </div>
                                )}
                              </div>

                              {/* Step label */}
                              <div className="flex-1">
                                <span className={`text-sm font-semibold tracking-wide ${isCompleted ? 'text-white/60 line-through decoration-emerald-500/40' : isActive ? 'text-white' : 'text-white/30'}`}>
                                  {step.label}
                                </span>
                                {isActive && (
                                  <span className="block text-[10px] text-goldenhour font-bold uppercase tracking-widest mt-0.5 animate-pulse">
                                    In Progress...
                                  </span>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>

    </div>
  );
}
