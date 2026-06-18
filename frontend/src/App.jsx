import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import PatientIntakeView from './components/PatientIntakeView';
import PatientResultsView from './components/PatientResultsView';
import HospitalConfirmPage from './components/HospitalConfirmPage';
import DonorRegistration from './components/DonorRegistration';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100 flex flex-col selection:bg-rose-500/30 selection:text-rose-200">
        
        {/* Glowing Top Navigation Header */}
        <header className="sticky top-0 z-50 bg-slate-950/70 backdrop-blur-xl border-b border-slate-900 p-4 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="relative flex items-center justify-center">
                {/* Heartbeat pulse rings */}
                <span className="absolute inline-flex h-8 w-8 rounded-full bg-rose-500 opacity-20 animate-ping" />
                <span className="absolute inline-flex h-6 w-6 rounded-full bg-rose-500 opacity-30 animate-pulse" />
                <svg className="w-5 h-5 text-rose-500 relative z-10 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-rose-400 transition-colors">
                Golden<span className="bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent">Hour</span>
              </span>
            </Link>
            
            {/* Live Indicator Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
              <span className="text-[10px] font-bold text-rose-400 tracking-wider uppercase">Emergency Link</span>
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-grow flex flex-col items-center justify-center p-4 max-w-md w-full mx-auto relative">
          <div className="w-full bg-slate-900/50 backdrop-blur-md border border-slate-900/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            {/* Ambient background glow inside the card */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <Routes>
              <Route path="/" element={<PatientIntakeView />} />
              <Route path="/results/:id" element={<PatientResultsView />} />
              <Route path="/confirm/:token" element={<HospitalConfirmPage />} />
              <Route path="/register" element={<DonorRegistration />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
