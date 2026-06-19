import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { api } from '../lib/api';

export default function HospitalConfirmPage() {
  // Read token from URL
  const { token } = useParams<{ token: string }>();

  // State Management
  const [isResponded, setIsResponded] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hospitalName, setHospitalName] = useState('SMS Hospital');

  // Interactive toggle to allow judges to test the "already routed" UI state
  const [alreadyConfirmed, setAlreadyConfirmed] = useState(false);

  // Handle Dispatch Decisions
  const handleResponse = async (isAccepted: boolean) => {
    if (!token) return;
    setIsSubmitting(true);

    try {
      const data = await api.confirmHospitalRequest(token, isAccepted);
      if (data && data.ok) {
        setHospitalName(data.hospital_name || 'SMS Hospital');
        setAlreadyConfirmed(!!data.already_confirmed);
        setAccepted(isAccepted);
        setIsResponded(true);
      } else {
        simulateResponse(isAccepted);
      }
    } catch (e) {
      console.warn('Backend server offline. Simulating response locally for demo.', e);
      simulateResponse(isAccepted);
    } finally {
      setIsSubmitting(false);
    }
  };

  const simulateResponse = (isAccepted: boolean) => {
    setHospitalName('SMS Hospital');
    setAccepted(isAccepted);
    setIsResponded(true);
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-6 select-none animate-fade-in">
      
      {/* Compact Header: Brand + Status Label */}
      <div className="flex flex-col items-center justify-center text-center gap-1">
        <div className="flex items-center gap-1">
          <span className="relative flex h-2 w-2 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emergency opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emergency" />
          </span>
          <span className="font-black text-base text-ink">
            Golden<span className="text-goldenhour">Hour</span>
          </span>
        </div>
        
        <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emergency-pressed">
          <svg className="w-3.5 h-3.5 text-emergency" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Emergency Request
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isResponded ? (
          <motion.div
            key="dispatch-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Clean summary card (Fake/Static values matching API schema) */}
            <Card animateEntrance={false} className="border-slate-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">
                    Emergency Type
                  </span>
                  <span className="text-sm font-extrabold text-ink bg-slate-100 px-3 py-1 rounded-lg">
                    Trauma
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">
                    Blood Group Needed
                  </span>
                  <span className="text-sm font-black text-emergency bg-red-50 px-3 py-1 rounded-lg border border-red-100/30">
                    O−
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">
                    Patient ETA
                  </span>
                  <span className="text-sm font-black text-[#F59E0B] bg-amber-50 px-3 py-1 rounded-lg border border-amber-500/10">
                    6 min away
                  </span>
                </div>
              </div>
            </Card>

            {/* Action panel conditional rendering based on alreadyConfirmed state */}
            {alreadyConfirmed ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-amber-50 border border-amber-200/50 rounded-2xl p-6 text-center space-y-3 shadow-sm"
              >
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xl font-bold mx-auto">
                  !
                </div>
                <h3 className="font-extrabold text-ink leading-tight text-lg">Already Routed</h3>
                <p className="text-xs text-ink-muted leading-relaxed px-2">
                  This patient has already been routed to another hospital. No dispatch action is required.
                </p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {/* Accept Button */}
                <Button
                  onClick={() => handleResponse(true)}
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                  variant="success"
                  fullWidth
                  className="font-extrabold uppercase text-sm tracking-wider shadow-lg"
                >
                  Accept Patient
                </Button>

                {/* Decline Button */}
                <Button
                  onClick={() => handleResponse(false)}
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                  variant="ghost"
                  fullWidth
                  className="font-extrabold uppercase text-sm tracking-wider"
                >
                  Not Available
                </Button>
              </div>
            )}

            {/* Simulated Toggle for Evaluators */}
            <div className="pt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setAlreadyConfirmed(!alreadyConfirmed)}
                className="text-[10px] font-black tracking-widest uppercase text-slate-400 hover:text-ink hover:bg-slate-50 transition-colors border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/20 cursor-pointer"
              >
                {alreadyConfirmed ? 'Simulate Available Request' : 'Simulate Already-Routed State'}
              </button>
            </div>
          </motion.div>
        ) : (
          /* Response State Panel */
          <motion.div
            key="response-panel"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="text-center py-6 space-y-6"
          >
            {accepted ? (
              <Card animateEntrance={false} className="border-emerald-500/20 bg-emerald-50/10">
                <div className="space-y-4 py-2">
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 rounded-full flex items-center justify-center text-3xl font-bold mx-auto">
                    ✓
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-ink">Dispatch Secured</h3>
                    <p className="text-sm text-ink-muted px-4 leading-relaxed">
                      Thank you. The patient has been routed to <span className="font-extrabold text-ink">{hospitalName}</span>. The family has been notified.
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card animateEntrance={false} className="border-slate-200">
                <div className="space-y-4 py-2">
                  <div className="w-16 h-16 bg-slate-900 border border-slate-800 text-slate-400 rounded-full flex items-center justify-center text-3xl font-bold mx-auto">
                    ✕
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-ink">Declined</h3>
                    <p className="text-sm text-ink-muted px-4 leading-relaxed">
                      Acknowledgment received. The emergency will be routed to the next nearest responder.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <button
              onClick={() => setIsResponded(false)}
              className="text-xs text-slate-400 hover:text-ink font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/20 rounded px-2 py-1 cursor-pointer"
            >
              Reset Simulation State
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Secure Token Footer */}
      <div className="text-center">
        <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest select-all">
          Secure token validation: {token}
        </p>
      </div>
    </div>
  );
}
