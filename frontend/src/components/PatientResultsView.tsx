import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

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

  // State initialized with the exact fake data shape matching the contract
  const [hospitals, setHospitals] = useState<Hospital[]>([
    { hospital_id: "h1", name: "SMS Hospital", eta_minutes: 6, department_match: true, status: "pending", phone: "+910000000000" },
    { hospital_id: "h2", name: "Fortis Jaipur", eta_minutes: 9, department_match: true, status: "confirmed", phone: "+910000000000" },
    { hospital_id: "h3", name: "Manipal Jaipur", eta_minutes: 12, department_match: false, status: "pending", phone: "+910000000000" },
  ]);

  // Alert metrics
  const [donorsAlerted] = useState(5);
  const [donorsResponded, setDonorsResponded] = useState(0);

  // TODO: Replace this simulated hook with real API polling and Supabase Realtime subscription
  /*
    TODO Link:
    For real-time updates:
    1. Poll GET /emergency/{id}/status every 3 seconds:
       const res = await fetch(`/api/emergency/${id}/status`);
       const data = await res.json();
       setHospitals(data.hospitals);
       setDonorsResponded(data.donors_responded);
    2. Alternatively, subscribe to Supabase Realtime changes:
       supabase
         .channel('hospitals-status')
         .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'hospitals' }, payload => { ... })
         .subscribe()
  */

  // Hackathon Demo Simulation: transition SMS Hospital (h1) to 'confirmed'
  // and Manipal Jaipur (h3) to 'declined' over time to show smooth state transition animations.
  useEffect(() => {
    // 3 seconds: SMS Hospital gets confirmed
    const timer1 = setTimeout(() => {
      setHospitals(prev =>
        prev.map(h => h.hospital_id === 'h1' ? { ...h, status: 'confirmed' } : h)
      );
      setDonorsResponded(1);
    }, 4000);

    // 6 seconds: Manipal Jaipur gets declined
    const timer2 = setTimeout(() => {
      setHospitals(prev =>
        prev.map(h => h.hospital_id === 'h3' ? { ...h, status: 'declined' } : h)
      );
      setDonorsResponded(2);
    }, 8000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Sort: Confirmed float to top, then sorted by ETA (shortest first)
  const sortedHospitals = [...hospitals].sort((a, b) => {
    if (a.status === 'confirmed' && b.status !== 'confirmed') return -1;
    if (a.status !== 'confirmed' && b.status === 'confirmed') return 1;
    if (a.status === 'declined' && b.status !== 'declined') return 1;
    if (a.status !== 'declined' && b.status === 'declined') return -1;
    return a.eta_minutes - b.eta_minutes;
  });

  return (
    <div className="space-y-6 pb-28 select-none">
      
      {/* Top Status Header */}
      <div className="flex items-center justify-between border-b border-[#E5E2DD] pb-4">
        <div className="flex items-center gap-2">
          {/* Pulsing indicator */}
          <span className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500" />
          </span>
          <span className="font-extrabold text-lg text-ink">Finding help…</span>
        </div>
        <span className="text-xs font-semibold text-ink-muted bg-slate-100 px-2.5 py-1 rounded-lg">
          ID: {id}
        </span>
      </div>

      {/* Hospital Cards (AnimatePresence for layout transition animations) */}
      <div className="space-y-4">
        <AnimatePresence>
          {sortedHospitals.map((h, index) => {
            const isConfirmed = h.status === 'confirmed';
            const isDeclined = h.status === 'declined';

            return (
              <motion.div
                key={h.hospital_id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                  delay: index * 0.05
                }}
              >
                <Card
                  animateEntrance={false} // Framer-motion layout handles entrance
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
                      
                      {/* Subdued / Matched department chip */}
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

                    <Badge status={h.status} />
                  </div>

                  {/* Badging: ETA & Distance */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#F59E0B] bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-500/10">
                      <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {h.eta_minutes} min ETA
                    </span>
                  </div>

                  {/* 1-tap Call Button */}
                  <a
                    href={`tel:${h.phone}`}
                    className={`flex items-center justify-center gap-2 w-full h-14 rounded-xl font-bold text-sm tracking-wider uppercase transition-all duration-300 border ${
                      isConfirmed
                        ? 'bg-success hover:opacity-90 text-white border-transparent shadow-[0_4px_15px_rgba(5,150,105,0.25)]'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {isConfirmed ? 'Establish Call Link' : 'Call Dispatch'}
                  </a>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Pinned Bottom Donor Panel */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#FBFAF8]/90 backdrop-blur-md border-t border-[#E5E2DD] p-4 shadow-lg z-40">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-emergency font-extrabold text-sm flex items-center gap-1.5 leading-none">
              <svg className="w-4.5 h-4.5 text-emergency animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              {donorsAlerted} donors alerted nearby
            </span>
            <span className="text-[11px] text-slate-500 font-semibold pl-6">
              {donorsResponded > 0 ? `${donorsResponded} responded` : 'Waiting for responses'}
            </span>
          </div>

          {/* Blood drop placeholder badge */}
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
            <svg className="w-5 h-5 text-rose-500 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
            </svg>
          </div>
        </div>
      </div>

    </div>
  );
}
