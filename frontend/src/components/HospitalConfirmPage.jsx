import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

function HospitalConfirmPage() {
  const { token } = useParams();
  const [responded, setResponded] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [alreadyConfirmed, setAlreadyConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hospitalName, setHospitalName] = useState('SMS Hospital');

  // Handle Accept / Decline Responses
  const handleResponse = async (isAccepted) => {
    setLoading(true);
    try {
      const payload = { accepted: isAccepted };
      const res = await fetch(`http://localhost:8000/confirm/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setHospitalName(data.hospital_name || 'SMS Hospital');
        setAlreadyConfirmed(!!data.already_confirmed);
        setAccepted(isAccepted);
        setResponded(true);
      } else {
        // Fallback for mock demo
        simulateResponse(isAccepted);
      }
    } catch (e) {
      console.warn('Backend server offline. Simulating response locally.');
      simulateResponse(isAccepted);
    } finally {
      setLoading(false);
    }
  };

  const simulateResponse = (isAccepted) => {
    // Simulated demo:SMS Hospital accepted
    setHospitalName('SMS Hospital');
    setAlreadyConfirmed(false); // Can toggle for testing
    setAccepted(isAccepted);
    setResponded(true);
  };

  if (responded) {
    return (
      <div className="p-6 text-center space-y-6 animate-fade-in">
        {alreadyConfirmed ? (
          <>
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="w-16 h-16 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full flex items-center justify-center text-3xl font-bold">
                !
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">Already Claimed</h2>
              <p className="text-sm text-slate-400 leading-relaxed px-4">
                This patient has already been routed to another trauma center.
              </p>
            </div>
          </>
        ) : accepted ? (
          <>
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-500/10 animate-pulse" />
              <div className="w-16 h-16 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full flex items-center justify-center text-3xl font-bold">
                ✓
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">Dispatch Locked</h2>
              <p className="text-sm text-slate-400 leading-relaxed px-4">
                Thank you, <span className="text-white font-bold">{hospitalName}</span>. The ambulance has been directed to your facility, and the family has been notified.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="w-16 h-16 bg-slate-900 border border-slate-800 text-slate-400 rounded-full flex items-center justify-center text-3xl font-bold">
                ✕
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">Request Declined</h2>
              <p className="text-sm text-slate-400 leading-relaxed px-4">
                This request will be forwarded to the next nearest trauma center.
              </p>
            </div>
          </>
        )}

        <div className="pt-4">
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Secure token authorization: {token}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Header */}
      <div className="bg-rose-500/10 text-rose-400 p-5 rounded-2xl border border-rose-500/20 shadow-lg relative overflow-hidden flex flex-col gap-3">
        <div className="flex items-center justify-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
          </span>
          <h1 className="text-lg font-black uppercase tracking-wider text-white">🚨 EMERGENCY REQUEST</h1>
        </div>

        {/* Patient specs */}
        <div className="grid grid-cols-2 gap-3 text-center border-t border-rose-500/10 pt-3 text-xs font-bold">
          <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-900">
            <p className="text-[10px] text-slate-500 uppercase mb-0.5">Emergency Type</p>
            <p className="text-white text-sm">Trauma / Accident</p>
          </div>
          <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-900">
            <p className="text-[10px] text-slate-500 uppercase mb-0.5">Blood Needed</p>
            <p className="text-rose-400 text-sm">O+</p>
          </div>
          <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-900 col-span-2">
            <p className="text-[10px] text-slate-500 uppercase mb-0.5">Distance & ETA</p>
            <p className="text-white text-sm">2.3 km (6 mins ETA)</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={() => handleResponse(true)}
          disabled={loading}
          className="w-full relative group overflow-hidden bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-extrabold text-base py-4 rounded-2xl shadow-[0_4px_15px_rgba(34,197,94,0.25)] active:scale-[0.98] transition-all duration-300"
        >
          {loading ? (
            'Processing...'
          ) : (
            '✓ Accept Patient'
          )}
        </button>
        
        <button
          onClick={() => handleResponse(false)}
          disabled={loading}
          className="w-full bg-slate-950 border border-slate-900 hover:bg-slate-900 text-slate-400 hover:text-white font-extrabold text-base py-4 rounded-2xl active:scale-[0.98] transition-all duration-300"
        >
          {loading ? (
            'Processing...'
          ) : (
            '✗ Not Available'
          )}
        </button>
      </div>

      {/* Footer Info */}
      <div className="text-center">
        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider leading-none">Dispatcher token verification active</p>
      </div>
    </div>
  );
}

export default HospitalConfirmPage;
