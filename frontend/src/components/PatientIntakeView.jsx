import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const emergencyTypes = [
  {
    id: 'trauma',
    name: 'Trauma / Accident',
    icon: (
      <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    description: 'Bones, cuts, crash injuries',
    color: 'from-red-500/20 to-red-600/5 hover:border-red-500/40 text-red-400',
    selectedBorder: 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.25)]',
  },
  {
    id: 'cardiac',
    name: 'Cardiac / Heart',
    icon: (
      <svg className="w-6 h-6 text-rose-500 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    description: 'Chest pain, arrest, stroke',
    color: 'from-rose-500/20 to-rose-600/5 hover:border-rose-500/40 text-rose-400',
    selectedBorder: 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.25)]',
  },
  {
    id: 'obstetric',
    name: 'Obstetric / Pregnancy',
    icon: (
      <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    description: 'Labor, maternity emergencies',
    color: 'from-amber-500/20 to-amber-600/5 hover:border-amber-500/40 text-amber-400',
    selectedBorder: 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)]',
  },
  {
    id: 'general',
    name: 'General Medical',
    icon: (
      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    description: 'Fever, breathing, poisoning',
    color: 'from-blue-500/20 to-blue-600/5 hover:border-blue-500/40 text-blue-400',
    selectedBorder: 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.25)]',
  },
];

const bloodGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

function PatientIntakeView() {
  const navigate = useNavigate();

  // Location State
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsData, setGpsData] = useState({
    lat: 26.9124, // Default Jaipur
    lng: 75.7873,
    address: 'Jaipur Highway, NH-8 (Default)',
    locked: false,
  });

  // Intake Form Selection State
  const [selectedType, setSelectedType] = useState('trauma');
  const [selectedBlood, setSelectedBlood] = useState('O+');

  // Countdown & Dispatch State
  const [showCountdown, setShowCountdown] = useState(false);
  const [count, setCount] = useState(5);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch GPS Coordinates
  const handleGPSFetch = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    setErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setGpsData({
          lat: parseFloat(latitude.toFixed(6)),
          lng: parseFloat(longitude.toFixed(6)),
          address: `NH-8 Highway, Coord: (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          locked: true,
        });
        setGpsLoading(false);
      },
      (error) => {
        console.error('GPS fetch error', error);
        setGpsData((prev) => ({ ...prev, locked: true })); // Lock with fallback
        setGpsLoading(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Start Countdown Flow
  const triggerEmergencyFlow = () => {
    setShowCountdown(true);
    setCount(5);
  };

  // Countdown Loop
  useEffect(() => {
    let timer;
    if (showCountdown && count > 0) {
      timer = setTimeout(() => setCount(count - 1), 1000);
    } else if (showCountdown && count === 0) {
      dispatchEmergency();
    }
    return () => clearTimeout(timer);
  }, [showCountdown, count]);

  // Cancel Dispatch
  const cancelDispatch = () => {
    setShowCountdown(false);
    setCount(5);
  };

  // Trigger POST API call to Backend
  const dispatchEmergency = async () => {
    try {
      const payload = {
        lat: gpsData.lat,
        lng: gpsData.lng,
        emergency_type: selectedType,
        blood_group: selectedBlood,
      };

      const res = await fetch('http://localhost:8000/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        navigate(`/results/${data.request_id || 'test123'}`);
      } else {
        // Fallback to test view on error/no backend
        navigate('/results/test123');
      }
    } catch (e) {
      console.warn('Backend offline, running in mock simulation mode.');
      navigate('/results/test123');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-white mb-1">Emergency dispatch</h1>
        <p className="text-sm text-slate-400">Please provide patient details to alert nearby trauma responders immediately.</p>
      </div>

      {/* GPS Location Widget */}
      <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-bold text-slate-200">Incident Location</span>
          </div>
          {gpsData.locked && (
            <span className="text-[10px] font-bold bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1 h-1 bg-green-400 rounded-full animate-ping" />
              GPS Locked
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGPSFetch}
            disabled={gpsLoading}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-extrabold tracking-wider uppercase transition-all duration-300 ${
              gpsData.locked
                ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.25)]'
            }`}
          >
            {gpsLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Locating...
              </span>
            ) : gpsData.locked ? (
              'Recalibrate'
            ) : (
              'Use My Location'
            )}
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 truncate font-semibold">{gpsData.address}</p>
            <p className="text-[10px] text-slate-500 font-medium">Coord: {gpsData.lat.toFixed(4)}, {gpsData.lng.toFixed(4)}</p>
          </div>
        </div>

        {errorMsg && <p className="text-xs text-red-400 font-bold">{errorMsg}</p>}
      </div>

      {/* Emergency Type Selector (Grid Card Interface) */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Emergency type</label>
        <div className="grid grid-cols-2 gap-3">
          {emergencyTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`p-3 text-left rounded-2xl border transition-all duration-300 flex flex-col gap-2 bg-gradient-to-br ${type.color} ${
                selectedType === type.id
                  ? type.selectedBorder
                  : 'border-slate-900 bg-slate-950/20'
              }`}
            >
              <div className="flex items-center gap-2">
                {type.icon}
                <span className="text-sm font-bold text-white leading-none">{type.name}</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">{type.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Blood Group Selector (Grid Pills Interface) */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Blood group needed</label>
        <div className="grid grid-cols-4 gap-2">
          {bloodGroups.map((group) => (
            <button
              key={group}
              onClick={() => setSelectedBlood(group)}
              className={`py-2 rounded-xl text-xs font-bold transition-all duration-200 border ${
                selectedBlood === group
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                  : 'bg-slate-950/30 border-slate-900 text-slate-400 hover:border-slate-800'
              }`}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      {/* Dispatch Button */}
      <button
        onClick={triggerEmergencyFlow}
        className="w-full relative group overflow-hidden bg-gradient-to-r from-rose-600 to-amber-600 text-white font-extrabold text-lg py-4 rounded-2xl shadow-[0_4px_20px_rgba(244,63,94,0.3)] hover:shadow-[0_4px_25px_rgba(244,63,94,0.5)] active:scale-[0.98] transition-all duration-300"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <span className="flex items-center justify-center gap-2">
          <svg className="w-5 h-5 text-white animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
          TRIGGER EMERGENCY
        </span>
      </button>

      {/* Become a Donor Link */}
      <div className="pt-2 text-center">
        <button
          onClick={() => navigate('/register')}
          className="text-xs text-rose-400 hover:text-rose-300 font-bold transition-colors underline decoration-rose-500/40 hover:decoration-rose-500"
        >
          Become a Life Saver — Register as a Blood Donor
        </button>
      </div>

      {/* Countdown Dispatch Overlay */}
      {showCountdown && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-fade-in">
          <div className="w-full max-w-sm p-8 text-center space-y-6">
            <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
              {/* Circular progress SVG */}
              <svg className="w-40 h-40 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="44"
                  fill="none"
                  stroke="rgba(244,63,94,0.15)"
                  strokeWidth="6"
                />
                <circle
                  cx="50" cy="50" r="44"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 44}`}
                  strokeDashoffset={`${2 * Math.PI * 44 * (1 - count / 5)}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-6xl font-black text-rose-500 tracking-tighter filter drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]">
                  {count}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Countdown</span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">Emergency Dispatch Pending</h2>
              <p className="text-sm text-slate-400 px-4">
                Alerting nearby responders for a <span className="text-rose-400 font-bold uppercase">{selectedType}</span> request ({selectedBlood}).
              </p>
            </div>

            <button
              onClick={cancelDispatch}
              className="px-8 py-3.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-300 font-bold rounded-2xl transition-all duration-200 uppercase tracking-wider text-xs"
            >
              Cancel Dispatch
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientIntakeView;
