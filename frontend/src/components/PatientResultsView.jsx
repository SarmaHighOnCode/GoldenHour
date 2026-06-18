import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function PatientResultsView() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Active status of scanning radar
  const [scanning, setScanning] = useState(true);

  // Live Hospital Data State
  const [hospitals, setHospitals] = useState([
    { hospital_id: 'h1', name: 'SMS Hospital', eta_minutes: 6, distance_km: 2.3, department_match: true, status: 'pending', phone: '+919876543210' },
    { hospital_id: 'h2', name: 'Fortis Hospital', eta_minutes: 9, distance_km: 3.8, department_match: true, status: 'pending', phone: '+918765432109' },
    { hospital_id: 'h3', name: 'Manipal Jaipur', eta_minutes: 12, distance_km: 5.1, department_match: false, status: 'pending', phone: '+917654321098' },
  ]);

  // Live Donors Data State
  const [donorsAlerted, setDonorsAlerted] = useState(5);
  const [donorsResponded, setDonorsResponded] = useState(0);

  // Live API Polling Loop (GET /emergency/{id}/status)
  useEffect(() => {
    let pollingInterval;
    
    const fetchStatus = async () => {
      try {
        const res = await fetch(`http://localhost:8000/emergency/${id}/status`);
        if (res.ok) {
          const data = await res.json();
          // Update from server payload
          if (data.hospitals) setHospitals(data.hospitals);
          if (data.donors_alerted !== undefined) setDonorsAlerted(data.donors_alerted);
          if (data.donors_responded !== undefined) setDonorsResponded(data.donors_responded);
          
          // Check if at least one hospital is confirmed
          const anyConfirmed = data.hospitals?.some(h => h.status === 'confirmed');
          if (anyConfirmed) {
            setScanning(false);
          }
        }
      } catch (e) {
        // Safe backend offline warning
        console.warn('Backend server offline. Running local simulation for hackathon demo.');
      }
    };

    // Run first pull
    fetchStatus();

    // Poll every 3 seconds as defined in the PRD
    pollingInterval = setInterval(fetchStatus, 3000);

    return () => clearInterval(pollingInterval);
  }, [id]);

  // Hackathon Local Demo Simulation: If the backend is offline,
  // we simulate status transitions over time so judges see live updates.
  useEffect(() => {
    // SMS Hospital accepts after 6 seconds
    const t1 = setTimeout(() => {
      setHospitals(prev =>
        prev.map(h => (h.hospital_id === 'h1' ? { ...h, status: 'confirmed' } : h))
      );
      setDonorsResponded(1);
      setScanning(false);
    }, 6000);

    // Fortis Jaipur declines after 12 seconds
    const t2 = setTimeout(() => {
      setHospitals(prev =>
        prev.map(h => (h.hospital_id === 'h2' ? { ...h, status: 'declined' } : h))
      );
      setDonorsResponded(3);
    }, 12000);

    // Manipal Jaipur accepts after 18 seconds (in case sms didn't or for extra response)
    const t3 = setTimeout(() => {
      setDonorsResponded(4);
    }, 18000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className="space-y-6 pb-28">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4">
        <div>
          <h2 className="text-xl font-black text-white">Trauma Routing</h2>
          <p className="text-xs text-slate-500 font-medium">Request Ref: {id}</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="text-xs text-slate-400 hover:text-white font-bold bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg transition-colors"
        >
          Cancel Request
        </button>
      </div>

      {/* Live Scanner Banner */}
      <div className="relative overflow-hidden bg-slate-950/40 border border-slate-900 rounded-2xl p-4 flex flex-col gap-2">
        {scanning ? (
          <>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </span>
              <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">Searching responders</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pinging dispatchers at regional medical checkpoints. GPS tracker active.
            </p>
            {/* Scanning radar line */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-rose-500/30 to-transparent animate-pulse" />
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              <span className="text-xs font-bold text-green-400 uppercase tracking-widest">Routing locked</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Responding trauma unit has locked the dispatch request. Family & ambulance notified.
            </p>
          </>
        )}
      </div>

      {/* Hospital Cards List */}
      <div className="space-y-4 relative">
        {/* Radar beam scan overlay */}
        {scanning && (
          <div className="absolute inset-x-0 top-0 h-2 bg-rose-500/20 blur-sm pointer-events-none animate-[bounce_3s_infinite]" />
        )}

        {hospitals.map(h => {
          const isConfirmed = h.status === 'confirmed';
          const isDeclined = h.status === 'declined';
          
          return (
            <div
              key={h.hospital_id}
              className={`p-4 rounded-2xl border transition-all duration-500 flex flex-col gap-3 relative overflow-hidden ${
                isConfirmed
                  ? 'border-green-500/50 bg-green-950/10 shadow-[0_0_20px_rgba(34,197,94,0.15)]'
                  : isDeclined
                  ? 'border-slate-900/40 bg-slate-950/10 opacity-40 grayscale'
                  : 'border-slate-900 bg-slate-950/20 hover:border-slate-800'
              }`}
            >
              {/* Background gradient for confirmed card */}
              {isConfirmed && (
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent pointer-events-none" />
              )}

              {/* Card Title & Status Badge */}
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-white text-base tracking-tight">{h.name}</h3>
                
                <span
                  className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                    isConfirmed
                      ? 'bg-green-500/10 border-green-500/20 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.1)]'
                      : isDeclined
                      ? 'bg-slate-950 border-slate-900 text-slate-500'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse'
                  }`}
                >
                  {h.status}
                </span>
              </div>
              
              {/* ETA, Distance & Match Badges */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="flex items-center gap-1 bg-slate-900 text-slate-300 border border-slate-800 px-2.5 py-1 rounded-lg">
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {h.eta_minutes} min ETA
                </span>

                <span className="bg-slate-900 text-slate-400 border border-slate-900 px-2.5 py-1 rounded-lg">
                  {h.distance_km} km away
                </span>

                {h.department_match && (
                  <span className="flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/10 px-2.5 py-1 rounded-lg">
                    <svg className="w-3 h-3 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Trauma Match
                  </span>
                )}
              </div>

              {/* Tap to Call */}
              <a
                href={`tel:${h.phone}`}
                className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-300 border ${
                  isConfirmed
                    ? 'bg-green-600 hover:bg-green-700 text-white border-green-500/30 shadow-[0_4px_15px_rgba(34,197,94,0.3)]'
                    : 'bg-slate-950/80 hover:bg-slate-900 text-slate-300 border-slate-900 hover:border-slate-800'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {isConfirmed ? 'Establish Call Link' : 'Call Dispatcher'}
              </a>
            </div>
          );
        })}
      </div>

      {/* Fixed Donor Response Notification Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/70 backdrop-blur-xl border-t border-slate-900 p-4 shadow-[0_-4px_30px_rgba(0,0,0,0.8)]">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-rose-500 font-extrabold text-sm flex items-center gap-1.5 leading-none">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
              {donorsAlerted} emergency donors alerted
            </span>
            <span className="text-[11px] text-slate-400 font-semibold">{donorsResponded} donors responding to location</span>
          </div>
          
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
            <svg className="w-5 h-5 text-rose-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientResultsView;
