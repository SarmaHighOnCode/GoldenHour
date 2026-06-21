import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { gsap, ScrollTrigger } from '../lib/gsap-setup';
import { HeroScene } from './three/HeroScene';
import { TextReveal } from './motion/TextReveal';
import { CardReveal } from './motion/CardReveal';
import { CountUp } from './motion/CountUp';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { api } from '../lib/api';

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
  const [isSceneLoaded, setIsSceneLoaded] = useState<boolean>(false);

  // Refs for GSAP animations
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const heroSubRef = useRef<HTMLParagraphElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);
  const horizontalRef = useRef<HTMLDivElement>(null);
  const horizontalInnerRef = useRef<HTMLDivElement>(null);

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
    try {
      const data = await api.triggerEmergency(coords.lat, coords.lng, emergencyType, bloodGroup);
      if (data && data.request_id) {
        sessionStorage.setItem(`emergency_${data.request_id}`, JSON.stringify({
          bloodGroup,
          emergencyType,
          rareGroup: data.rare_group ?? bloodGroup.endsWith('-')
        }));
        navigate(`/results/${data.request_id}`);
      } else {
        throw new Error('Invalid request ID returned from server.');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Connection failed. Please verify that the API is online.');
    } finally {
      setIsSubmitting(false);
    }
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

  // === GSAP ANIMATIONS ===

  // Hero staggered title reveal
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title letters stagger
      if (heroTitleRef.current) {
        const text = heroTitleRef.current.textContent || '';
        const words = text.trim().split(' ');
        heroTitleRef.current.innerHTML = '';
        
        words.forEach((word, wordIdx) => {
          const wordSpan = document.createElement('span');
          wordSpan.style.display = 'inline-block';
          wordSpan.style.whiteSpace = 'nowrap';
          
          word.split('').forEach((char) => {
            const span = document.createElement('span');
            span.textContent = char;
            span.style.display = 'inline-block';
            span.style.opacity = '0';
            span.style.transform = 'translateY(100%)';
            wordSpan.appendChild(span);
          });
          
          heroTitleRef.current!.appendChild(wordSpan);
          if (wordIdx < words.length - 1) {
            heroTitleRef.current!.appendChild(document.createTextNode(' '));
          }
        });

        gsap.to(heroTitleRef.current.querySelectorAll('span > span'), {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.03,
          ease: 'power3.out',
          delay: 0.3,
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
  }, []);

  // Horizontal scroll section
  useEffect(() => {
    const section = horizontalRef.current;
    const inner = horizontalInnerRef.current;
    if (!section || !inner) return;

    const ctx = gsap.context(() => {
      const cards = inner.children;
      const totalWidth = inner.scrollWidth - section.offsetWidth;

      gsap.to(inner, {
        x: -totalWidth,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${totalWidth}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
        },
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="w-full">
      
      {/* Real-time WebGL shader preloader overlay */}
      <AnimatePresence>
        {!isSceneLoaded && (
          <motion.div
            key="preloader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 bg-[#14141A] z-[99999] flex flex-col items-center justify-center space-y-6"
            style={{ pointerEvents: 'auto' }}
          >
            <div className="flex flex-col items-center max-w-sm text-center px-6">
              {/* Pulse heartbeat SVG */}
              <svg className="w-12 h-12 text-emergency animate-pulse mb-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <h2 className="font-display font-bold text-sm text-dark-ink uppercase tracking-[0.25em] leading-snug">
                Compiling Volumetric Shaders
              </h2>
              <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mt-5 relative">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                  className="h-full bg-gradient-to-r from-emergency to-goldenhour" 
                />
              </div>
              <p className="text-[9px] text-dark-ink-muted uppercase tracking-[0.2em] mt-5 animate-pulse">
                Preloading GPU Textures...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =============================================
          SECTION 1: HERO — Full screen dark canvas
          ============================================= */}
      <section className="editorial-section glow-amber glow-crimson grid-overlay relative">
        {/* Three.js particle canvas with shader compile feedback callback */}
        <HeroScene onLoaded={() => setIsSceneLoaded(true)} />

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto space-y-8">
          {/* Giant display title */}
          <h1
            ref={heroTitleRef}
            className="text-display-xl text-gradient overflow-hidden"
          >
            Every Second Counts
          </h1>

          {/* Subtitle */}
          <p
            ref={heroSubRef}
            className="text-display-md text-dark-ink-muted max-w-2xl mx-auto opacity-0"
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
            <a
              href="#intake"
              className="inline-flex items-center justify-center gap-3 h-14 px-10 bg-gradient-to-r from-emergency to-emergency-pressed text-white rounded-2xl font-bold text-sm tracking-wider uppercase transition-all duration-300 hover:scale-105 active:scale-[0.98] shadow-lg shadow-emergency/20 animate-pulse-glow"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Get Help Now
            </a>
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 h-14 px-10 border border-white/15 text-dark-ink hover:bg-white/5 rounded-2xl font-bold text-sm tracking-wider uppercase transition-all duration-300"
            >
              🩸 Register as Donor
            </Link>
          </motion.div>
        </div>

        {/* Scroll hint */}
        <div ref={scrollHintRef} className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-0">
          <span className="text-[10px] text-dark-ink-muted uppercase tracking-[0.3em] font-semibold">Scroll</span>
          <div className="w-5 h-8 border border-white/20 rounded-full flex items-start justify-center p-1.5">
            <div className="w-1 h-2 bg-goldenhour rounded-full animate-scroll-hint" />
          </div>
        </div>
      </section>

      {/* =============================================
          SECTION 2: PROBLEM STATEMENT — Text reveals
          ============================================= */}
      <section className="editorial-section px-6 glow-crimson">
        <div className="max-w-4xl mx-auto space-y-16">
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
      <section id="intake" className="py-32 px-6 relative glow-amber">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left: Descriptive text */}
          <CardReveal direction="left" className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emergency/10 border border-emergency/20 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emergency animate-pulse" />
              <span className="text-[10px] font-black text-emergency uppercase tracking-widest">Emergency Console</span>
            </div>
            <h2 className="text-display-lg text-dark-ink">
              Lock. Dispatch. <span className="text-gradient">Save.</span>
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
          </CardReveal>

          {/* Right: Intake Form Card */}
          <CardReveal direction="right" delay={0.15}>
            <div className="relative rounded-2xl overflow-hidden" style={{
              background: 'linear-gradient(145deg, rgba(30, 30, 45, 0.95) 0%, rgba(18, 18, 28, 0.98) 100%)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 24px 80px rgba(0,0,0,0.6), 0 0 60px rgba(220,38,38,0.08), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}>
              {/* Top accent bar */}
              <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-emergency to-transparent" />
              
              {/* Inner content */}
              <div className="px-8 py-9 space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emergency/10 border border-emergency/15 mx-auto">
                    <span className="w-1.5 h-1.5 rounded-full bg-emergency animate-pulse" />
                    <span className="text-[9px] font-extrabold text-emergency uppercase tracking-[0.2em]">Live Dispatch</span>
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-white">Emergency Dispatch</h3>
                  <p className="text-xs text-white/40">Secure your location and select emergency details.</p>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                {/* Location Button */}
                <div className="space-y-3">
                  <label className="block text-[10px] font-extrabold text-white/50 uppercase tracking-[0.15em]">Patient Location</label>
                  <button
                    type="button"
                    onClick={handleAcquireLocation}
                    disabled={locating}
                    className={`w-full h-14 flex items-center justify-center gap-2.5 rounded-xl font-bold text-sm transition-all duration-300 cursor-pointer ${
                      coords 
                        ? 'bg-success/15 border border-success/30 text-success' 
                        : 'bg-white/[0.04] border border-white/[0.08] text-white/80 hover:bg-white/[0.08] hover:border-white/[0.15]'
                    }`}
                  >
                    {locating ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Acquiring...
                      </span>
                    ) : coords ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        Location Locked
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Pin Current Location
                      </span>
                    )}
                  </button>

                  {!coords && !locating && (
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => { setCoords({ lat: 26.9124, lng: 75.7873 }); setLocationError(null); }}
                        className="text-[11px] text-white/30 hover:text-goldenhour transition-colors font-medium underline cursor-pointer"
                      >
                        Or use demo location (Jaipur)
                      </button>
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    {coords && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="bg-success/5 border border-success/15 rounded-xl p-3 text-center"
                      >
                        <p className="text-xs font-semibold text-success/80">Coordinates Secured</p>
                        <p className="text-[11px] font-mono text-white/30 mt-0.5">Lat: {coords.lat} · Lng: {coords.lng}</p>
                        <button type="button" onClick={() => setCoords(null)} className="text-[10px] text-emergency/70 hover:text-emergency underline font-bold mt-1.5 cursor-pointer">Clear</button>
                      </motion.div>
                    )}
                    {locationError && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="bg-emergency/10 border border-emergency/20 rounded-xl p-3 text-center space-y-2" role="alert"
                      >
                        <p className="text-xs font-bold text-emergency">{locationError}</p>
                        <div className="flex items-center justify-center gap-3">
                          <button type="button" onClick={handleAcquireLocation} className="text-xs text-emergency font-extrabold underline cursor-pointer">Retry</button>
                          <span className="text-xs text-white/15">|</span>
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
                <button
                  type="button"
                  onClick={dispatchEmergency}
                  disabled={!isFormValid || isSubmitting}
                  className="w-full h-14 flex items-center justify-center gap-2.5 rounded-xl font-extrabold uppercase tracking-wider text-sm text-white cursor-pointer transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
                  style={{
                    background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                    boxShadow: isFormValid ? '0 8px 32px rgba(220,38,38,0.35), inset 0 1px 0 rgba(255,255,255,0.12)' : 'none',
                  }}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      GET HELP NOW
                    </span>
                  )}
                </button>
              </div>
            </div>
          </CardReveal>

        </div>
      </section>

      {/* =============================================
          SECTION 4: HOW IT WORKS — Horizontal scroll
          ============================================= */}
      <section ref={horizontalRef} id="how-it-works" className="relative overflow-hidden" style={{ height: '100vh' }}>
        <div className="absolute top-0 left-0 w-full py-12 px-6 z-10">
          <div className="max-w-6xl mx-auto">
            <p className="text-[10px] font-black text-goldenhour uppercase tracking-[0.3em] mb-2">How It Works</p>
            <h2 className="text-display-lg text-dark-ink">Three steps. <span className="text-gradient">Zero delay.</span></h2>
          </div>
        </div>

        <div ref={horizontalInnerRef} className="flex items-center gap-8 px-6 absolute top-1/2 -translate-y-1/2" style={{ width: 'max-content', paddingLeft: '10vw', paddingRight: '10vw' }}>
          {/* Step 1 */}
          <div className="glass-card p-10 w-[400px] h-[360px] flex flex-col justify-between shrink-0">
            <div>
              <div className="text-5xl mb-4">📍</div>
              <p className="text-[10px] font-black text-goldenhour uppercase tracking-[0.3em] mb-1">Step 01</p>
              <h3 className="text-2xl font-bold text-dark-ink mb-3 font-display">Lock Location</h3>
              <p className="text-sm text-dark-ink-muted leading-relaxed">
                Your browser GPS pins your exact coordinates. High-accuracy mode ensures precision even in dense urban areas.
              </p>
            </div>
            <div className="h-1 bg-gradient-to-r from-goldenhour to-transparent rounded-full mt-4" />
          </div>

          {/* Step 2 */}
          <div className="glass-card p-10 w-[400px] h-[360px] flex flex-col justify-between shrink-0">
            <div>
              <div className="text-5xl mb-4">🏥</div>
              <p className="text-[10px] font-black text-emergency uppercase tracking-[0.3em] mb-1">Step 02</p>
              <h3 className="text-2xl font-bold text-dark-ink mb-3 font-display">Smart Dispatch</h3>
              <p className="text-sm text-dark-ink-muted leading-relaxed">
                Our algorithm matches your emergency type to the nearest hospital with the right department and available bed capacity.
              </p>
            </div>
            <div className="h-1 bg-gradient-to-r from-emergency to-transparent rounded-full mt-4" />
          </div>

          {/* Step 3 */}
          <div className="glass-card p-10 w-[400px] h-[360px] flex flex-col justify-between shrink-0">
            <div>
              <div className="text-5xl mb-4">🩸</div>
              <p className="text-[10px] font-black text-success uppercase tracking-[0.3em] mb-1">Step 03</p>
              <h3 className="text-2xl font-bold text-dark-ink mb-3 font-display">Donor Alert</h3>
              <p className="text-sm text-dark-ink-muted leading-relaxed">
                Every registered blood donor matching your blood type within range receives an instant alert with your location coordinates.
              </p>
            </div>
            <div className="h-1 bg-gradient-to-r from-success to-transparent rounded-full mt-4" />
          </div>
        </div>
      </section>

      {/* =============================================
          SECTION 5: STATS — Animated counters
          ============================================= */}
      <section className="editorial-section px-6">
        <div className="max-w-5xl mx-auto w-full">
          <div className="text-center space-y-4 mb-20">
            <p className="text-[10px] font-black text-goldenhour uppercase tracking-[0.3em]">By The Numbers</p>
            <h2 className="text-display-lg text-dark-ink">Built for speed. <span className="text-gradient">Designed for trust.</span></h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <CardReveal className="glass-card p-8 text-center space-y-3" delay={0}>
              <div className="text-5xl font-display font-bold text-gradient">
                <CountUp end={6} prefix="< " suffix=" min" />
              </div>
              <p className="text-sm font-semibold text-dark-ink">Average Response</p>
              <p className="text-xs text-dark-ink-muted">From dispatch to hospital confirmation</p>
            </CardReveal>

            <CardReveal className="glass-card p-8 text-center space-y-3" delay={0.1}>
              <div className="text-5xl font-display font-bold text-gradient">
                24/7
              </div>
              <p className="text-sm font-semibold text-dark-ink">Always On</p>
              <p className="text-xs text-dark-ink-muted">Real-time websocket sync, polling fallback</p>
            </CardReveal>

            <CardReveal className="glass-card p-8 text-center space-y-3" delay={0.2}>
              <div className="text-5xl font-display font-bold text-gradient">
                <CountUp end={100} suffix="%" />
              </div>
              <p className="text-sm font-semibold text-dark-ink">Open Source</p>
              <p className="text-xs text-dark-ink-muted">Transparent, auditable, community-driven</p>
            </CardReveal>
          </div>
        </div>
      </section>

      {/* =============================================
          SECTION 6: CTA FOOTER
          ============================================= */}
      <section className="py-32 px-6 relative">
        <div className="max-w-3xl mx-auto text-center space-y-10">
          <TextReveal
            as="h2"
            className="text-display-lg text-dark-ink"
            stagger={0.04}
            start="top 80%"
            end="top 50%"
          >
            When someone you love needs help, every second is a lifetime.
          </TextReveal>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a
              href="tel:112"
              className="inline-flex items-center justify-center gap-3 h-16 px-12 bg-gradient-to-r from-emergency to-emergency-pressed text-white rounded-2xl font-extrabold text-base tracking-wider uppercase transition-all duration-300 hover:scale-105 active:scale-[0.98] shadow-lg shadow-emergency/25"
            >
              <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Call 112
            </a>
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-3 h-16 px-12 border-2 border-goldenhour text-goldenhour hover:bg-goldenhour/10 rounded-2xl font-extrabold text-base tracking-wider uppercase transition-all duration-300"
            >
              🩸 Become a Donor
            </Link>
          </div>

          {/* Heartbeat line */}
          <div className="pt-16">
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

    </div>
  );
}
