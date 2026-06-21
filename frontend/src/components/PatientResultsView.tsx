import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGSAP } from '@gsap/react';
import { Card } from './ui/Card';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { GlassCard, CountUp, ShimmerSkeleton, AnimatedStatusBadge } from './ui/Effects';
import { gsap, ScrollTrigger } from '../lib/gsap-setup';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Hospital {
  hospital_id: string;
  name: string;
  eta_minutes: number;
  department_match: boolean;
  status: 'pending' | 'confirmed' | 'declined';
  phone: string;
}

export default function PatientResultsView() {
  const { id } = useParams<{ id: string }>();

  // State initialized with all hospitals starting as "pending"
  const [hospitals, setHospitals] = useState<Hospital[]>([
    { hospital_id: "h1", name: "SMS Hospital", eta_minutes: 6, department_match: true, status: "pending", phone: "+910000000000" },
    { hospital_id: "h2", name: "Fortis Escorts Jaipur", eta_minutes: 9, department_match: true, status: "pending", phone: "+910000000000" },
    { hospital_id: "h3", name: "Manipal Jaipur", eta_minutes: 12, department_match: false, status: "pending", phone: "+910000000000" },
  ]);

  // Alert metrics
  const [donorsAlerted] = useState(5);
  const [donorsResponded, setDonorsResponded] = useState(0);

  // loading skeleton & error states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  // Dynamic status states
  const [bloodGroup, setBloodGroup] = useState<string>('');
  const [rareGroup, setRareGroup] = useState<boolean>(false);
  const [unconfirmedFallback, setUnconfirmedFallback] = useState<boolean>(false);
  const [mockTimeoutSimulation, setMockTimeoutSimulation] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState(3512); // ~58m 32s

  const isAnyHospitalConfirmed = hospitals.some(h => h.status === 'confirmed');

  useEffect(() => {
    if (isAnyHospitalConfirmed || isLoading || hasError) return;
    const timer = setInterval(() => {
      setSecondsRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isAnyHospitalConfirmed, isLoading, hasError]);

  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [confirmedHospital, setConfirmedHospital] = useState<Hospital | null>(null);
  const confirmedIdsRef = useRef<Set<string>>(new Set());

  const playConfirmationChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Tone 1: E5 (659.25 Hz)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, audioCtx.currentTime);
      gain1.gain.setValueAtTime(0, audioCtx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
      
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      
      // Tone 2: A5 (880.00 Hz) - slightly delayed
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.12);
      gain2.gain.setValueAtTime(0, audioCtx.currentTime + 0.12);
      gain2.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.17);
      gain2.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.8);
      
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.5);
      
      osc2.start(audioCtx.currentTime + 0.12);
      osc2.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      console.error('Failed to play synthesized confirmation chime:', e);
    }
  };

  useEffect(() => {
    const newlyConfirmed = hospitals.find(h => h.status === 'confirmed');
    if (newlyConfirmed) {
      if (!confirmedIdsRef.current.has(newlyConfirmed.hospital_id)) {
        confirmedIdsRef.current.add(newlyConfirmed.hospital_id);
        setConfirmedHospital(newlyConfirmed);
        setShowSuccessBanner(true);
        playConfirmationChime();
        const timer = setTimeout(() => {
          setShowSuccessBanner(false);
        }, 6000);
        return () => clearTimeout(timer);
      }
    } else {
      confirmedIdsRef.current.clear();
      setConfirmedHospital(null);
      setShowSuccessBanner(false);
    }
  }, [hospitals]);

  // Coordinates
  const [statusLat, setStatusLat] = useState<number | null>(null);
  const [statusLng, setStatusLng] = useState<number | null>(null);

  // Leaflet Map Refs
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const patientMarkerRef = useRef<L.Marker | null>(null);
  const hospitalMarkersRef = useRef<Record<string, L.Marker>>({});
  const routeLinesRef = useRef<Record<string, L.Polyline>>({});

  // Configurable Mock state (defaults to true for reliable demo offline mode)
  const [isMockMode, setIsMockMode] = useState<boolean>(() => {
    return localStorage.getItem('goldenhour_mock_mode') !== 'false';
  });

  const mountTime = useRef<number>(Date.now());
  const listContainerRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mediaQuery.matches);
    const motionHandler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mediaQuery.addEventListener('change', motionHandler);

    return () => {
      window.removeEventListener('resize', checkMobile);
      mediaQuery.removeEventListener('change', motionHandler);
    };
  }, []);

  const enableStacking = !isMobile && !prefersReduced;

  // Save toggle choice in localStorage
  useEffect(() => {
    localStorage.setItem('goldenhour_mock_mode', String(isMockMode));
  }, [isMockMode]);

  // Load cached emergency details from sessionStorage
  useEffect(() => {
    if (!id) return;
    const stored = sessionStorage.getItem(`emergency_${id}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setBloodGroup(parsed.bloodGroup || '');
        setRareGroup(parsed.rareGroup ?? parsed.bloodGroup?.endsWith('-') ?? false);
        if (parsed.lat && parsed.lng) {
          setStatusLat(parsed.lat);
          setStatusLng(parsed.lng);
        }
      } catch (e) {
        console.error('Failed to parse cached emergency metadata:', e);
      }
    }
  }, [id]);

  // Normalize ETA: API contract says eta_minutes, but some rows (esp. from
  // older Supabase inserts or the Google Maps path before the /60 guard was
  // added) may arrive as raw seconds. If the value is >120 we treat it as
  // seconds and convert. Always clamp to a realistic 1–120 min range.
  const normalizeEta = (raw: number): number => {
    if (raw == null || isNaN(raw)) return 5;
    const asMinutes = raw > 120 ? Math.round(raw / 60) : Math.round(raw);
    return Math.max(1, Math.min(120, asMinutes));
  };

  // Process data returned from status payload
  const updateStateFromPayload = (data: any) => {
    setDonorsResponded(data.donors_responded ?? 0);
    setUnconfirmedFallback(data.unconfirmed_fallback ?? false);
    if (data.lat && data.lng) {
      setStatusLat(data.lat);
      setStatusLng(data.lng);
    }
    if (Array.isArray(data.hospitals)) {
      setHospitals(prev => {
        return data.hospitals.map((newH: any) => {
          const existing = prev.find(h => h.hospital_id === newH.hospital_id);
          return {
            hospital_id: newH.hospital_id,
            name: newH.name,
            eta_minutes: normalizeEta(newH.eta_minutes),
            status: newH.status,
            department_match: existing ? existing.department_match : (newH.department_match ?? false),
            phone: existing ? existing.phone : (newH.phone ?? "+910000000000")
          };
        });
      });
    }
  };

  // Poll status endpoint or run offline simulation
  const pollStatus = async (requestId: string) => {
    if (isMockMode) {
      const elapsed = Date.now() - mountTime.current;
      // After ~4s, Fortis Escorts Jaipur flips from pending to confirmed, Manipal Jaipur flips to declined, and responded goes to 2
      const isAfter4s = elapsed >= 4000;
      const isAfter8s = elapsed >= 8000;

      const mockPayload = {
        request_id: requestId,
        lat: statusLat ?? 26.9124,
        lng: statusLng ?? 75.7873,
        hospitals: mockTimeoutSimulation
          ? [
              { hospital_id: "h1", name: "SMS Hospital", eta_minutes: 6, status: "pending" as const },
              { hospital_id: "h2", name: "Fortis Escorts Jaipur", eta_minutes: 9, status: "pending" as const },
              { hospital_id: "h3", name: "Manipal Jaipur", eta_minutes: 12, status: "pending" as const }
            ]
          : [
              { hospital_id: "h1", name: "SMS Hospital", eta_minutes: 6, status: "pending" as const },
              { hospital_id: "h2", name: "Fortis Escorts Jaipur", eta_minutes: 9, status: isAfter4s ? "confirmed" as const : "pending" as const },
              { hospital_id: "h3", name: "Manipal Jaipur", eta_minutes: 12, status: isAfter8s ? "declined" as const : "pending" as const }
            ],
        donors_alerted: 5,
        donors_responded: isAfter4s && !mockTimeoutSimulation ? 2 : 0,
        unconfirmed_fallback: mockTimeoutSimulation
      };

      updateStateFromPayload(mockPayload);
      setHasError(false);
    } else {
      try {
        const data = await api.getEmergencyStatus(requestId);
        updateStateFromPayload(data);
        setHasError(false);
      } catch (err) {
        console.error('Network error during status polling:', err);
        setHasError(true);
      }
    }
  };

  // Interval polling subscription (serves as fallback if Supabase socket drops)
  useEffect(() => {
    if (!id) return;

    setIsLoading(true);
    setHasError(false);

    // Initial 1.2s delay for a premium skeleton load animation
    const skeletonTimer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);

    pollStatus(id);

    const intervalId = setInterval(() => {
      pollStatus(id);
    }, 3000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(skeletonTimer);
    };
  }, [id, isMockMode]);

  // Supabase Realtime subscription (live socket push changes)
  useEffect(() => {
    if (!id || isMockMode) return;

    console.log(`Establishing Supabase Realtime channel for request: ${id}`);

    const channel = supabase
      .channel(`emergency-all-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'confirmation_requests',
          filter: `emergency_id=eq.${id}`
        },
        (payload: any) => {
          console.log('Realtime DB update received from confirmation_requests:', payload);
          const updatedConf = payload.new;
          if (updatedConf) {
            setHospitals(prev =>
              prev.map(h =>
                h.hospital_id === updatedConf.hospital_id
                  ? {
                      ...h,
                      status: updatedConf.confirmed === true 
                        ? 'confirmed' 
                        : updatedConf.confirmed === false 
                        ? 'declined' 
                        : 'pending'
                    }
                  : h
              )
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'emergency_requests',
          filter: `id=eq.${id}`
        },
        (payload: any) => {
          console.log('Realtime DB update received from emergency_requests:', payload);
          const updatedReq = payload.new;
          if (updatedReq) {
            setDonorsResponded(updatedReq.donors_responded ?? 0);
            setUnconfirmedFallback(updatedReq.unconfirmed_fallback ?? false);
            if (updatedReq.hospitals) {
              setHospitals(prev => {
                return updatedReq.hospitals.map((newH: any) => {
                  const existing = prev.find(h => h.hospital_id === newH.hospital_id);
                  return {
                    hospital_id: newH.hospital_id,
                    name: newH.name,
                    eta_minutes: normalizeEta(newH.eta_minutes),
                    status: newH.status,
                    department_match: existing ? existing.department_match : (newH.department_match ?? false),
                    phone: existing ? existing.phone : (newH.phone ?? "+910000000000")
                  };
                });
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`Supabase Realtime subscription status: ${status}`);
      });

    return () => {
      console.log(`Teardown Supabase Realtime channel for request: ${id}`);
      supabase.removeChannel(channel);
    };
  }, [id, isMockMode]);

  // Sort: Confirmed float to top, then sorted by ETA (shortest first), declined at the very bottom
  const sortedHospitals = [...hospitals].sort((a, b) => {
    if (a.status === 'confirmed' && b.status !== 'confirmed') return -1;
    if (a.status !== 'confirmed' && b.status === 'confirmed') return 1;
    if (a.status === 'declined' && b.status !== 'declined') return 1;
    if (a.status !== 'declined' && b.status === 'declined') return -1;
    return a.eta_minutes - b.eta_minutes;
  });

  const dependencyKey = sortedHospitals.map(h => `${h.hospital_id}-${h.status}`).join(',');
 
  useGSAP(() => {
    if (!enableStacking) return;
 
    // Clean up any existing card-stacking ScrollTriggers first to avoid collisions
    ScrollTrigger.getAll().forEach(trigger => {
      if (trigger.vars.id === 'card-stacking') {
        trigger.kill();
      }
    });
 
    const cards = gsap.utils.toArray<HTMLElement>('.hospital-card-wrapper');
    if (cards.length === 0) return;
 
    cards.forEach((card, index) => {
      // The last card doesn't need to scale down/fade out since nothing stacks on top of it
      if (index === cards.length - 1) return;
 
      const innerCard = card.querySelector('.shadow-layered') || card.firstElementChild;
      if (!innerCard) return;
 
      gsap.to(innerCard, {
        scale: 0.92,
        opacity: 0.5,
        boxShadow: '0 25px 50px -12px rgba(26, 23, 20, 0.25)',
        transformOrigin: 'top center',
        ease: 'none',
        scrollTrigger: {
          id: 'card-stacking',
          trigger: card,
          start: `top top+=${80 + index * 16}`,
          end: `bottom top+=${80 + index * 16}`,
          scrub: true,
          invalidateOnRefresh: true,
        }
      });
    });
 
    ScrollTrigger.refresh();
  }, { scope: listContainerRef, dependencies: [dependencyKey, enableStacking, isLoading, hasError] });

  // 1. Initialize Map instance
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const patientLat = statusLat ?? 26.9124;
    const patientLng = statusLng ?? 75.7873;

    // Create Map
    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([patientLat, patientLng], 13);

    // Dark vector tiles matching dark/glassmorphic aesthetics
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      routeLinesRef.current = {};
      hospitalMarkersRef.current = {};
      patientMarkerRef.current = null;
    };
  }, [statusLat, statusLng]);

  // 2. Synchronize Map Markers & Radar Ping Animation
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const patientLat = statusLat ?? 26.9124;
    const patientLng = statusLng ?? 75.7873;

    // Check if a hospital is confirmed
    const isAnyHospitalConfirmed = hospitals.some(h => h.status === 'confirmed');

    // Dynamically update patient marker and radar ping
    if (patientMarkerRef.current) {
      patientMarkerRef.current.remove();
    }

    const pingClass = isAnyHospitalConfirmed ? 'radar-ping-paused' : 'radar-ping-ring';
    
    let htmlContent = '';
    if (prefersReduced) {
      // Static range circle for prefers-reduced-motion fallback
      htmlContent = `
        <div class="relative flex items-center justify-center">
          <div class="absolute radar-ping-static-circle flex items-center justify-center"></div>
          <div class="w-5 h-5 rounded-full bg-red-600 border-2 border-white shadow-[0_0_10px_rgba(220,38,38,0.5)] z-10"></div>
        </div>
      `;
    } else {
      // Concentric crimson rings repeating every 2.2 seconds (defined in index.css)
      htmlContent = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-[180px] h-[180px] flex items-center justify-center pointer-events-none">
            <div class="absolute w-8 h-8 rounded-full border-2 border-red-500/80 ${pingClass}" style="animation-delay: 0s;"></div>
            <div class="absolute w-8 h-8 rounded-full border-2 border-red-500/60 ${pingClass}" style="animation-delay: 0.7s;"></div>
            <div class="absolute w-8 h-8 rounded-full border-2 border-red-500/40 ${pingClass}" style="animation-delay: 1.4s;"></div>
          </div>
          <div class="w-5 h-5 rounded-full bg-red-600 border-2 border-white shadow-[0_0_15px_rgba(220,38,38,0.85)] z-10"></div>
        </div>
      `;
    }

    const patientIcon = L.divIcon({
      className: 'custom-patient-icon',
      html: htmlContent,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    patientMarkerRef.current = L.marker([patientLat, patientLng], { icon: patientIcon })
      .addTo(map)
      .bindPopup('<strong class="text-red-500">Patient Location (SOS)</strong>', { closeButton: false });

    // Center map view on patient location
    map.setView([patientLat, patientLng], map.getZoom());

    // Sync Hospital Markers & Route Lines
    // Clean up markers for hospitals no longer present
    Object.keys(hospitalMarkersRef.current).forEach(hid => {
      if (!hospitals.some(h => h.hospital_id === hid)) {
        hospitalMarkersRef.current[hid].remove();
        delete hospitalMarkersRef.current[hid];
      }
    });

    Object.keys(routeLinesRef.current).forEach(hid => {
      if (!hospitals.some(h => h.hospital_id === hid)) {
        routeLinesRef.current[hid].remove();
        delete routeLinesRef.current[hid];
      }
    });

    // Seeded coordinates map for local Jaipur mock database fallback
    const jaipurHospCoords: Record<string, [number, number]> = {
      "h1": [26.9036, 75.8147], // SMS Hospital
      "h2": [26.8569, 75.8064], // Fortis Escorts Jaipur (Fortis Jaipur)
      "h3": [26.8853, 75.7470], // Manipal Hospital Jaipur (Manipal Jaipur)
    };

    hospitals.forEach(h => {
      let hLat = h.lat;
      let hLng = h.lng;

      if (!hLat || !hLng) {
        const coords = jaipurHospCoords[h.hospital_id];
        if (coords) {
          hLat = coords[0];
          hLng = coords[1];
        }
      }

      if (hLat && hLng) {
        let markerColor = 'bg-amber-500';
        let ringClass = 'border-amber-500/35';
        let statusLabel = 'Pending response';

        if (h.status === 'confirmed') {
          markerColor = 'bg-emerald-500 scale-110';
          ringClass = 'border-emerald-500/40 animate-ping';
          statusLabel = 'Confirmed Bed Available';
        } else if (h.status === 'declined') {
          markerColor = 'bg-slate-400 opacity-60';
          ringClass = 'border-slate-400/10';
          statusLabel = 'Decline / Unavailable';
        }

        // Draw/Update Polyline Route
        let polylineOptions: L.PolylineOptions = {};
        if (h.status === 'confirmed') {
          polylineOptions = {
            color: '#10B981',
            weight: 5,
            opacity: 0.9,
            className: prefersReduced ? 'route-line-confirmed-static' : 'route-line-confirmed'
          };
        } else if (h.status === 'declined') {
          polylineOptions = {
            color: '#94A3B8',
            weight: 2,
            opacity: 0.25,
            className: 'route-line-declined'
          };
        } else {
          polylineOptions = {
            color: '#F59E0B',
            weight: 3,
            opacity: 0.65,
            dashArray: '8, 8',
            className: 'route-line-pending'
          };
        }

        // Recreate the polyline on status change to trigger CSS animation
        if (routeLinesRef.current[h.hospital_id]) {
          routeLinesRef.current[h.hospital_id].remove();
        }
        
        const polyline = L.polyline([[patientLat, patientLng], [hLat, hLng]], polylineOptions).addTo(map);
        routeLinesRef.current[h.hospital_id] = polyline;

        const hospitalIcon = L.divIcon({
          className: 'custom-hospital-icon',
          html: `
            <div class="relative flex items-center justify-center">
              <div class="absolute w-8 h-8 rounded-full border ${ringClass}"></div>
              <div class="w-5 h-5 rounded-full ${markerColor} border-2 border-white shadow-md flex items-center justify-center text-white text-[9px] font-black leading-none">
                H
              </div>
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        if (hospitalMarkersRef.current[h.hospital_id]) {
          hospitalMarkersRef.current[h.hospital_id]
            .setLatLng([hLat, hLng])
            .setIcon(hospitalIcon);
        } else {
          const marker = L.marker([hLat, hLng], { icon: hospitalIcon })
            .addTo(map)
            .bindPopup(`
              <div class="p-1">
                <h4 class="font-bold text-xs text-white">${h.name}</h4>
                <p class="text-[10px] text-slate-300 font-semibold mt-0.5">${statusLabel}</p>
                <p class="text-[10px] text-goldenhour font-bold mt-1">${h.eta_minutes} min ETA</p>
              </div>
            `, { closeButton: false });
          hospitalMarkersRef.current[h.hospital_id] = marker;
        }
      }
    });
  }, [statusLat, statusLng, hospitals, prefersReduced]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pb-28 select-none">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-8 items-start">
        
        {/* Left Column: Interactive Map */}
        <div className="w-full h-[350px] lg:h-[calc(100vh-140px)] rounded-3xl overflow-hidden border border-slate-200 shadow-layered relative lg:sticky lg:top-24 bg-slate-900/10 z-10">
          <div ref={mapRef} className="w-full h-full" />
          
          {/* Overlay branding banner on map */}
          <div className="absolute top-4 left-4 z-[500] pointer-events-none">
            <div className="bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/5 flex items-center gap-2 shadow-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-emergency animate-pulse" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Live SOS Map</span>
            </div>
          </div>
        </div>

        {/* Right Column: Hospital list & Status */}
        <div className="w-full space-y-6">
          {/* Top Status Header with Golden Hour Progress Ring */}
          <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-slate-200/50 shadow-layered flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              {/* SVG Countdown Ring */}
              <div className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 40 40">
                  <circle
                    className="text-slate-100"
                    strokeWidth="3.5"
                    stroke="#E2E8F0"
                    fill="transparent"
                    r="16"
                    cx="20"
                    cy="20"
                  />
                  <motion.circle
                    className="transition-colors duration-500"
                    strokeWidth="3.5"
                    strokeDasharray="100.5"
                    strokeLinecap="round"
                    stroke={isAnyHospitalConfirmed ? "#10B981" : "#F59E0B"}
                    fill="transparent"
                    r="16"
                    cx="20"
                    cy="20"
                    initial={{ strokeDashoffset: 100.5 * (1 - secondsRemaining / 3600) }}
                    animate={{ strokeDashoffset: 100.5 * (1 - secondsRemaining / 3600) }}
                    transition={prefersReduced ? { duration: 0 } : { duration: 0.5 }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  {isAnyHospitalConfirmed ? (
                    <motion.svg
                      initial={prefersReduced ? {} : { scale: 0, rotate: -45 }}
                      animate={prefersReduced ? {} : { scale: 1, rotate: 0 }}
                      className="w-5 h-5 text-emerald-500"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </motion.svg>
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-emergency animate-pulse" />
                  )}
                </div>
              </div>

              {/* Countdown text / Label */}
              <div>
                <h3 className="font-extrabold text-sm text-ink flex items-center gap-2">
                  {isAnyHospitalConfirmed ? (
                    <span className="text-emerald-600">Hospital Confirmed</span>
                  ) : (
                    <span>Golden Hour Countdown</span>
                  )}
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  {isAnyHospitalConfirmed ? (
                    "Emergency dispatch established"
                  ) : (
                    <>
                      Time remaining: <span className="font-mono font-bold text-amber-600">{formatTime(secondsRemaining)}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors duration-500 ${
                isAnyHospitalConfirmed 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
              }`}>
                {isAnyHospitalConfirmed ? 'SECURED' : 'MONITORING'}
              </span>

              {import.meta.env.DEV && isMockMode && (
                <button
                  type="button"
                  onClick={() => {
                    setMockTimeoutSimulation(!mockTimeoutSimulation);
                    mountTime.current = Date.now(); // reset mock timer
                  }}
                  className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded border transition-colors cursor-pointer ${
                    mockTimeoutSimulation 
                      ? 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200' 
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  TIMEOUT: {mockTimeoutSimulation ? 'ON' : 'OFF'}
                </button>
              )}
            </div>
          </div>

          {/* Warning Banners (Rare blood / Timeout Fallback) */}
          <div className="space-y-3">
            {rareGroup && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-50 border border-amber-200/50 rounded-2xl p-4 flex items-start gap-3 shadow-sm"
              >
                <span className="text-xl flex-shrink-0" role="img" aria-label="Warning">⚠️</span>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Rare Blood Group Requested</h4>
                  <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                    Compatible donors for blood group <span className="font-extrabold text-amber-900">{bloodGroup || 'Rh-negative'}</span> are scarce. Alerts have been broadcast, but supply may be limited.
                  </p>
                </div>
              </motion.div>
            )}

            {unconfirmedFallback && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200/50 rounded-2xl p-4 flex items-start gap-3 shadow-sm animate-pulse-glow"
              >
                <span className="text-xl flex-shrink-0" role="img" aria-label="Alarm">🚨</span>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider">Response Timeout Fallback</h4>
                  <p className="text-[11px] text-red-700 leading-relaxed font-medium">
                    No hospital has confirmed the request yet. We strongly recommend contacting the nearest hospital directly using the call links below.
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Hospital Cards (AnimatePresence for layout transition animations) */}
          <div ref={listContainerRef} className="space-y-4 relative" aria-live="polite">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="skeleton-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4 w-full"
                >
                  {[1, 2, 3].map((idx) => (
                    <div 
                      key={idx} 
                      className="bg-white rounded-2xl p-5 shadow-layered border border-slate-100/50 space-y-4"
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 w-2/3">
                          <ShimmerSkeleton className="h-5 w-5/6 rounded-md" />
                          <ShimmerSkeleton className="h-3.5 w-1/3 rounded-md" />
                        </div>
                        <ShimmerSkeleton className="h-6 w-16 rounded-full" />
                      </div>
                      <ShimmerSkeleton className="h-5 w-28 rounded-md" />
                      <ShimmerSkeleton className="h-14 w-full rounded-xl" />
                    </div>
                  ))}
                </motion.div>
              ) : hasError ? (
                <motion.div
                  key="error-state"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-50/50 border border-red-200/40 rounded-2xl p-6 text-center space-y-3"
                >
                  <div className="w-12 h-12 rounded-full bg-red-100 text-emergency flex items-center justify-center text-xl font-black mx-auto">
                    !
                  </div>
                  <h3 className="font-extrabold text-ink text-lg leading-tight">Connection Issue</h3>
                  <p className="text-xs text-ink-muted leading-relaxed px-4">
                    We are having trouble contacting the dispatch server. Please check your connection.
                  </p>
                  <button
                    type="button"
                    onClick={() => pollStatus(id || '')}
                    className="text-xs font-black uppercase tracking-wider text-rose-600 hover:text-rose-700 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/25 rounded px-2 py-1 cursor-pointer"
                  >
                    Retry Connection
                  </button>
                </motion.div>
              ) : sortedHospitals.length === 0 ? (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-slate-50 border border-slate-200/50 rounded-2xl p-8 text-center space-y-3"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xl font-bold mx-auto">
                    ?
                  </div>
                  <h3 className="font-extrabold text-ink text-lg leading-tight">No Responders Found</h3>
                  <p className="text-xs text-ink-muted leading-relaxed px-4">
                    We couldn't locate any hospital dispatch units in your immediate radius.
                  </p>
                </motion.div>
              ) : (
                sortedHospitals.map((h, index) => {
                  const isConfirmed = h.status === 'confirmed';
                  const isDeclined = h.status === 'declined';

                  return (
                    <motion.div
                      key={h.hospital_id}
                      layout={!prefersReduced}
                      className="hospital-card-wrapper"
                      style={{
                        position: enableStacking ? 'sticky' : 'relative',
                        top: enableStacking ? `calc(80px + ${index * 16}px)` : 'auto',
                        zIndex: index + 1,
                      }}
                      initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={prefersReduced ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
                      transition={prefersReduced ? { duration: 0 } : {
                        type: 'spring',
                        stiffness: 300,
                        damping: 30,
                        delay: index * 0.04
                      }}
                    >
                      <Card
                        animateEntrance={false}
                        className={`transition-all duration-500 border relative overflow-hidden ${
                          isConfirmed 
                            ? (prefersReduced 
                                ? 'border-emerald-500/40 bg-emerald-50/10 shadow-[0_4px_20px_rgba(5,150,105,0.08)] border-l-4 border-l-emerald-500' 
                                : 'confirmed-card-sweep border-l-4 border-l-emerald-500')
                            : isDeclined 
                            ? 'opacity-40 grayscale border-slate-200/50 bg-slate-50/50 border-l-4 border-l-slate-400'
                            : 'border-slate-200/60 border-l-4 border-l-amber-500'
                        }`}
                      >
                        {/* Glowing amber branding highlight on confirmed card */}
                        {isConfirmed && (
                          <div className="absolute top-0 right-0 w-2 h-2 bg-goldenhour rounded-full m-3 animate-pulse z-10" />
                        )}

                        {/* Visual Sweep overlay effect on confirm */}
                        {isConfirmed && !prefersReduced && (
                          <motion.div
                            initial={{ x: '-100%', opacity: 1 }}
                            animate={{ x: '100%', opacity: 0 }}
                            transition={{ duration: 1.2, ease: 'easeInOut' }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent pointer-events-none z-20"
                          />
                        )}

                        <div className="flex justify-between items-start mb-3">
                          <div className="space-y-1">
                            <h3 className="font-bold text-lg text-ink leading-tight">
                              {h.name}
                            </h3>
                            
                            {h.department_match ? (
                              <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-500/10">
                                Dept ✓ matched
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                Dept mismatch
                              </span>
                            )}
                          </div>

                          <AnimatedStatusBadge status={h.status} />
                        </div>

                        {/* Badging: ETA */}
                        <div className="flex items-center gap-2 mb-4">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#F59E0B] bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-500/10">
                            <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <CountUp to={h.eta_minutes} suffix=" min ETA" />
                          </span>
                        </div>

                        {/* 1-tap Call Button */}
                        <a
                          href={`tel:${h.phone}`}
                          aria-label={`Call ${h.name} dispatch`}
                          className={`flex items-center justify-center gap-2 w-full h-14 rounded-xl font-extrabold text-sm tracking-wider uppercase transition-all duration-300 border focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-500/20 active:scale-[0.98] ${
                            isConfirmed
                              ? 'bg-success hover:bg-emerald-700 text-white border-transparent shadow-[0_4px_15px_rgba(5,150,105,0.25)] focus-visible:ring-emerald-500/30'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 active:bg-slate-100'
                          }`}
                        >
                          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {isConfirmed ? 'Establish Call Link' : 'Call Dispatch'}
                        </a>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div> {/* Right Column */}
      </div> {/* Grid */}

      {/* Pinned Bottom Donor Panel */}
      <div className="fixed bottom-0 left-0 right-0 p-4 z-40">
        <div className="max-w-md mx-auto">
          <GlassCard className="flex items-center justify-between !p-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-emergency font-extrabold text-sm flex items-center gap-1.5 leading-none">
                <svg className="w-4.5 h-4.5 text-emergency animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
                <CountUp to={donorsAlerted} className="font-extrabold" /> donors alerted nearby
              </span>
              <span className="text-[11px] text-[#64748B] font-semibold pl-6">
                {donorsResponded > 0 ? (
                  <>
                    <CountUp to={donorsResponded} className="font-bold" /> responded
                  </>
                ) : (
                  'Waiting for responses'
                )}
              </span>
            </div>

            {/* Blood drop placeholder badge */}
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
              <svg className="w-5 h-5 text-rose-500 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
              </svg>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Success Banner */}
      <AnimatePresence>
        {showSuccessBanner && confirmedHospital && (
          <motion.div
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -50, scale: 0.95 }}
            animate={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed top-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-xl z-[9999] pointer-events-auto"
          >
            <div className="bg-emerald-600 text-white shadow-2xl rounded-2xl p-4.5 border border-emerald-500/20 flex items-center gap-3.5 relative overflow-hidden">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/10 pointer-events-none" />
              
              {/* Checkmark Circle */}
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-extrabold text-[10px] uppercase tracking-wider text-emerald-100">SOS Confirmed</h4>
                <p className="text-sm font-semibold text-white">
                  {confirmedHospital.name} confirmed — they're expecting you.
                </p>
              </div>
              
              {/* Dismiss Button */}
              <button 
                onClick={() => setShowSuccessBanner(false)}
                className="text-emerald-100 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
