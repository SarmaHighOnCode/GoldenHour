import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './ui/Card';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { GlassCard, CountUp, ShimmerSkeleton, AnimatedStatusBadge } from './ui/Effects';

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
    { hospital_id: "h2", name: "Fortis Jaipur", eta_minutes: 9, department_match: true, status: "pending", phone: "+910000000000" },
    { hospital_id: "h3", name: "Manipal Jaipur", eta_minutes: 12, department_match: false, status: "pending", phone: "+910000000000" },
  ]);

  // Alert metrics
  const [donorsAlerted] = useState(5);
  const [donorsResponded, setDonorsResponded] = useState(0);

  // Dynamic status states
  const [bloodGroup, setBloodGroup] = useState<string>('');
  const [rareGroup, setRareGroup] = useState<boolean>(false);
  const [unconfirmedFallback, setUnconfirmedFallback] = useState<boolean>(false);
  const [mockTimeoutSimulation, setMockTimeoutSimulation] = useState<boolean>(false);

  // loading skeleton & error states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  // Configurable Mock state (defaults to true for reliable demo offline mode)
  const [isMockMode, setIsMockMode] = useState<boolean>(() => {
    return localStorage.getItem('goldenhour_mock_mode') !== 'false';
  });

  const mountTime = useRef<number>(Date.now());

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
      // After ~4s, Fortis Jaipur flips from pending to confirmed, Manipal Jaipur flips to declined, and responded goes to 2
      const isAfter4s = elapsed >= 4000;
      const isAfter8s = elapsed >= 8000;

      const mockPayload = {
        request_id: requestId,
        hospitals: mockTimeoutSimulation
          ? [
              { hospital_id: "h1", name: "SMS Hospital", eta_minutes: 6, status: "pending" as const },
              { hospital_id: "h2", name: "Fortis Jaipur", eta_minutes: 9, status: "pending" as const },
              { hospital_id: "h3", name: "Manipal Jaipur", eta_minutes: 12, status: "pending" as const }
            ]
          : [
              { hospital_id: "h1", name: "SMS Hospital", eta_minutes: 6, status: "pending" as const },
              { hospital_id: "h2", name: "Fortis Jaipur", eta_minutes: 9, status: isAfter4s ? "confirmed" as const : "pending" as const },
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

  return (
    <div className="w-full max-w-md mx-auto space-y-6 pb-28 select-none">
      
      {/* Top Status Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          {/* Pulsing indicator */}
          <span className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500" />
          </span>
          <span className="font-extrabold text-lg text-ink">Finding help…</span>
        </div>
        <div className="flex items-center gap-2">
          {isMockMode && (
            <button
              type="button"
              onClick={() => {
                setMockTimeoutSimulation(!mockTimeoutSimulation);
                mountTime.current = Date.now(); // reset mock timer
              }}
              className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded border transition-colors cursor-pointer ${
                mockTimeoutSimulation 
                  ? 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200' 
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
            >
              TIMEOUT: {mockTimeoutSimulation ? 'ON' : 'OFF'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setIsMockMode(!isMockMode);
              mountTime.current = Date.now(); // reset mock timer on toggle
            }}
            className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded border transition-colors cursor-pointer ${
              isMockMode 
                ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200' 
                : 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
            }`}
          >
            {isMockMode ? 'MOCK: ON' : 'REAL API'}
          </button>
          <span className="text-xs font-semibold text-ink-muted bg-slate-100 px-2.5 py-1 rounded-lg">
            ID: {id}
          </span>
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
      <div className="space-y-4" aria-live="polite">
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
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                    delay: index * 0.04
                  }}
                >
                  <Card
                    animateEntrance={false}
                    className={`transition-all duration-500 border ${
                      isConfirmed 
                        ? 'border-emerald-500/40 bg-emerald-50/10 shadow-[0_4px_20px_rgba(5,150,105,0.08)]' 
                        : isDeclined 
                        ? 'opacity-40 grayscale border-slate-200/50 bg-slate-50/50'
                        : 'border-slate-200/60'
                    }`}
                  >
                    {/* Glowing amber branding highlight on confirmed card */}
                    {isConfirmed && (
                      <div className="absolute top-0 right-0 w-2 h-2 bg-goldenhour rounded-full m-3 animate-pulse" />
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

    </div>
  );
}
