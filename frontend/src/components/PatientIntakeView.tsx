import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
        console.error('Error fetching GPS', error);
        let errorMsg = 'Failed to acquire location. Please try again.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied. Please enable location access in settings.';
        }
        setLocationError(errorMsg);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Check if all fields are valid for submission
  const isFormValid = coords !== null && emergencyType !== '' && bloodGroup !== '';

  const dispatchEmergency = async () => {
    if (!isFormValid || !coords) return;
    
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const data = await api.triggerEmergency(
        coords.lat,
        coords.lng,
        emergencyType,
        bloodGroup
      );
      if (data && data.request_id) {
        navigate(`/results/${data.request_id}`);
      } else {
        throw new Error('Invalid request ID returned from server.');
      }
    } catch (err: any) {
      console.error('Failed to trigger emergency:', err);
      setSubmitError(err.message || 'Connection failed. Please verify that the API is online.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form options mapping
  const typeOptions = [
    { value: '', label: '-- Choose Emergency Type --' },
    { value: 'trauma', label: 'Trauma / Accident' },
    { value: 'cardiac', label: 'Cardiac / Heart' },
    { value: 'obstetric', label: 'Obstetric / Pregnancy' },
    { value: 'general', label: 'General Medical' }
  ];

  const bloodOptions = [
    { value: '', label: '-- Choose Blood Group --' },
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' },
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' }
  ];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-16 px-4">
      {/* Hero Section Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center pt-4 md:pt-10">
        
        {/* Left Side: Intake Booking Card */}
        <div className="md:col-span-5 w-full">
          <Card 
            className="w-full relative shadow-layered select-none border border-slate-200/50" 
            animateEntrance 
            delayIndex={0}
            role="region"
            aria-labelledby="intake-heading"
          >
            {/* Visual Identity Highlight (Medulance red to cyan stripe) */}
            <div 
              className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emergency via-goldenhour to-emergency" 
              role="presentation"
            />
            
            {/* Header Headline */}
            <div className="text-center space-y-2 mb-6 pt-2">
              <h2 id="intake-heading" className="text-2xl font-black tracking-tight text-ink leading-tight">
                Emergency? Book Now.
              </h2>
              <p className="text-xs text-ink-muted leading-relaxed px-2">
                We'll find the nearest ready hospital and alert matching blood donors in your area.
              </p>
            </div>

            <div className="space-y-4">
              {/* Geolocation Lock Button */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider">
                  Patient Location
                </label>
                
                <Button
                  type="button"
                  onClick={handleAcquireLocation}
                  isLoading={locating}
                  variant={coords ? 'success' : 'ghost'}
                  fullWidth
                  aria-label={coords ? "Location secured" : "Pin my current location using browser GPS"}
                  className="transition-all duration-300 h-14 rounded-xl"
                >
                  {coords ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-white animate-[bounce_0.5s_ease]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Location locked
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Pin my current location
                    </span>
                  )}
                </Button>

                {!coords && !locating && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setCoords({ lat: 26.9124, lng: 75.7873 });
                        setLocationError(null);
                      }}
                      className="text-[11px] text-ink-muted hover:text-emerald-600 transition-colors font-medium underline cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 rounded px-1.5 py-0.5"
                      aria-label="Use mock Jaipur location coordinates for testing"
                    >
                      Or use demo location (Jaipur)
                    </button>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {coords && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center"
                    >
                      <p className="text-xs font-semibold text-ink-muted">
                        Coordinates Secured
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5 select-all">
                        Lat: {coords.lat} &middot; Lng: {coords.lng}
                      </p>
                      <button
                        type="button"
                        onClick={() => setCoords(null)}
                        className="text-[10px] text-rose-500 hover:text-rose-700 underline font-bold mt-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30 rounded px-1.5 cursor-pointer"
                        aria-label="Clear current coordinates"
                      >
                        Clear location
                      </button>
                    </motion.div>
                  )}

                  {locationError && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="bg-red-50 border border-red-100/50 rounded-xl p-3 text-center space-y-2"
                      role="alert"
                    >
                      <p className="text-xs font-bold text-emergency">
                        {locationError}
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={handleAcquireLocation}
                          className="text-xs text-rose-600 hover:text-rose-700 font-extrabold underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 rounded px-1 cursor-pointer"
                          aria-label="Retry fetching browser location"
                        >
                          Retry Search
                        </button>
                        <span className="text-xs text-slate-300" role="presentation">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCoords({ lat: 26.9124, lng: 75.7873 });
                            setLocationError(null);
                          }}
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-extrabold underline focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 rounded px-1 cursor-pointer"
                          aria-label="Fallback to Jaipur demo coordinates"
                        >
                          Use Demo Location
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Emergency Type Selection */}
              <Select
                label="Emergency type"
                value={emergencyType}
                onChange={(e) => setEmergencyType(e.target.value)}
                options={typeOptions}
                aria-required="true"
              />

              {/* Blood Group Selection */}
              <Select
                label="Blood group needed"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                options={bloodOptions}
                aria-required="true"
              />

              {submitError && (
                <div 
                  className="bg-red-50 border border-red-100 rounded-xl p-3 text-center text-xs font-bold text-emergency animate-fade-in"
                  role="alert"
                >
                  {submitError}
                </div>
              )}

              {/* Dispatch Action Button */}
              <Button
                type="button"
                onClick={dispatchEmergency}
                variant="emergency"
                disabled={!isFormValid || isSubmitting}
                isLoading={isSubmitting}
                fullWidth
                aria-label="Get emergency help immediately"
                className="mt-2 shadow-lg font-extrabold uppercase tracking-wider text-sm h-14"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  GET HELP NOW
                </span>
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Side: Hero Branding + Animated SVG scene */}
        <div className="md:col-span-7 space-y-6 flex flex-col justify-center text-left">
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-ink leading-tight">
              24/7 Emergency Care <br />
              with <span className="text-emergency">Medu</span><span className="text-goldenhour">Lance</span>
            </h1>
            <p className="text-lg font-bold text-goldenhour uppercase tracking-widest text-sm">
              Emergency Service Response Provider
            </p>
            <p className="text-sm text-ink-muted max-w-lg leading-relaxed">
              Help should be given when it matters the most. Secure immediate routing to matched hospital beds and notify local blood banks/donors instantly.
            </p>
          </div>

          {/* Hotline Assist Button */}
          <div className="pt-2">
            <a
              href="tel:+918882978888"
              className="inline-flex items-center justify-center gap-3 w-full max-w-sm h-14 border-2 border-emergency text-emergency hover:bg-emergency/5 rounded-xl font-extrabold text-sm tracking-wider uppercase transition-all duration-300 active:scale-[0.98] bg-white shadow-sm"
            >
              <svg className="w-5 h-5 text-emergency animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Call Helpline: +91 88829 78888
            </a>
          </div>

          {/* Animated SVG Scene */}
          <div className="w-full pt-4">
            <svg viewBox="0 0 600 350" fill="none" className="w-full max-w-lg mx-auto animate-sway rounded-2xl overflow-hidden shadow-sm border border-slate-100 bg-[#F0FDF4]/30">
              {/* Sky background */}
              <rect x="0" y="0" width="600" height="350" fill="url(#sky-gradient)" />
              
              {/* Skyline silhouettes */}
              <path d="M50 300 L50 180 L90 180 L90 150 L140 150 L140 300 Z" fill="#E2E8F0" opacity="0.4" />
              <path d="M160 300 L160 120 L210 120 L210 300 Z" fill="#E2E8F0" opacity="0.6" />
              <path d="M230 300 L230 90 L290 90 L290 300 Z" fill="#E2E8F0" opacity="0.3" />
              <path d="M320 300 L320 160 L380 160 L380 300 Z" fill="#E2E8F0" opacity="0.5" />
              <path d="M410 300 L410 110 L470 110 L470 300 Z" fill="#E2E8F0" opacity="0.6" />
              
              {/* Sun */}
              <circle cx="530" cy="80" r="30" fill="#FDE047" opacity="0.8" />
              
              {/* Road */}
              <rect x="0" y="280" width="600" height="70" fill="#94A3B8" />
              <line x1="0" y1="280" x2="600" y2="280" stroke="#CBD5E1" strokeWidth="4" />
              {/* Road lines */}
              <line x1="20" y1="315" x2="80" y2="315" stroke="#FFFFFF" strokeWidth="4" strokeDasharray="15 10" />
              <line x1="120" y1="315" x2="220" y2="315" stroke="#FFFFFF" strokeWidth="4" strokeDasharray="30 20" />
              <line x1="280" y1="315" x2="380" y2="315" stroke="#FFFFFF" strokeWidth="4" strokeDasharray="30 20" />
              <line x1="440" y1="315" x2="580" y2="315" stroke="#FFFFFF" strokeWidth="4" strokeDasharray="30 20" />

              {/* Ambulance Group */}
              <g transform="translate(160, 110)">
                {/* Vehicle shadow */}
                <ellipse cx="140" cy="172" rx="130" ry="12" fill="#475569" opacity="0.25" />
                
                {/* Ambulance body shape */}
                <path d="M30 60 L220 60 C235 60 245 70 248 85 L258 130 C260 135 256 140 250 140 L30 140 Z" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
                
                {/* Front Bumper area */}
                <path d="M246 140 L266 140 L270 145 C272 152 269 160 262 160 L242 160 Z" fill="#E2E8F0" />
                
                {/* Red cross banner stripe */}
                <rect x="30" y="98" width="180" height="26" fill="#EC1F52" />
                <rect x="210" y="98" width="38" height="26" fill="#EC1F52" />
                
                {/* Circular white plate for cross */}
                <circle cx="120" cy="111" r="16" fill="#FFFFFF" />
                <rect x="117" y="101" width="6" height="20" fill="#EC1F52" />
                <rect x="110" y="108" width="20" height="6" fill="#EC1F52" />
                
                {/* Medulance Cyan stripe on base */}
                <rect x="30" y="130" width="215" height="10" fill="#06A5E9" />
                
                {/* Windows */}
                <path d="M200 70 L234 70 C238 70 242 74 243 78 L248 98 C249 104 245 110 239 110 L200 110 Z" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="1.5" />
                <rect x="140" y="70" width="50" height="40" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="1.5" />
                <rect x="50" y="70" width="80" height="40" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="1.5" />

                {/* Beacon lights */}
                <rect x="135" y="48" width="18" height="12" rx="4" fill="#EC1F52" className="animate-flash-red" />
                <rect x="165" y="48" width="18" height="12" rx="4" fill="#00E5FF" className="animate-flash-blue" />
                
                {/* Wheels */}
                <g className="animate-wheel">
                  <circle cx="75" cy="160" r="24" fill="#1E293B" stroke="#475569" strokeWidth="4" />
                  <circle cx="75" cy="160" r="8" fill="#F1F5F9" />
                  
                  <circle cx="205" cy="160" r="24" fill="#1E293B" stroke="#475569" strokeWidth="4" />
                  <circle cx="205" cy="160" r="8" fill="#F1F5F9" />
                </g>
                
                {/* Headlight beam */}
                <path d="M256 142 L260 142 L263 148 L256 148 Z" fill="#FDE047" />
              </g>
              
              <defs>
                <linearGradient id="sky-gradient" x1="0" y1="0" x2="0" y2="350" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#E0F2FE" />
                  <stop offset="70%" stopColor="#F8FAFC" />
                  <stop offset="100%" stopColor="#FFFFFF" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

      </div>

      {/* Why Choose Us Section */}
      <div className="space-y-6 pt-6">
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-tight text-ink">Why Choose Us?</h2>
          <p className="text-xs text-ink-muted mt-1">India's leading smart emergency ambulance response network.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          {/* Card 1 */}
          <Card animateEntrance className="border-slate-100 flex flex-col items-center text-center p-5 space-y-3" delayIndex={1}>
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 text-xl font-bold">
              🏥
            </div>
            <h3 className="font-extrabold text-sm text-ink leading-tight">Patient First Policy</h3>
            <p className="text-xs text-ink-muted leading-relaxed">Dedicated focus on clinical care, pre-hospital vitals, and patient safety.</p>
          </Card>
          
          {/* Card 2 */}
          <Card animateEntrance className="border-slate-100 flex flex-col items-center text-center p-5 space-y-3" delayIndex={2}>
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 text-xl font-bold">
              ⏱️
            </div>
            <h3 className="font-extrabold text-sm text-ink leading-tight">15 Min or Less Response</h3>
            <p className="text-xs text-ink-muted leading-relaxed">Fast response time backed by GPS dispatch algorithms and smart traffic routing.</p>
          </Card>

          {/* Card 3 */}
          <Card animateEntrance className="border-slate-100 flex flex-col items-center text-center p-5 space-y-3" delayIndex={3}>
            <div className="w-12 h-12 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-500 text-xl font-bold">
              🌙
            </div>
            <h3 className="font-extrabold text-sm text-ink leading-tight">24/7 Helpline Support</h3>
            <p className="text-xs text-ink-muted leading-relaxed">Dedicated call assistance operators standing by for immediate backup guidance.</p>
          </Card>

          {/* Card 4 */}
          <Card animateEntrance className="border-slate-100 flex flex-col items-center text-center p-5 space-y-3" delayIndex={4}>
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 text-xl font-bold">
              🚑
            </div>
            <h3 className="font-extrabold text-sm text-ink leading-tight">India's Largest Fleet</h3>
            <p className="text-xs text-ink-muted leading-relaxed">Access to thousands of smart ambulances across major Indian cities.</p>
          </Card>
        </div>
      </div>

      {/* Core Services Section */}
      <div className="space-y-6 pt-4 pb-12">
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-tight text-ink">Our Core Services</h2>
          <p className="text-xs text-ink-muted mt-1">Plan offerings catering to various emergency response use cases.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          {/* Service 1 */}
          <Card animateEntrance className="border-slate-100 p-5 space-y-2.5 flex flex-col justify-between" delayIndex={1}>
            <div>
              <h3 className="font-black text-base text-ink leading-tight">Individual</h3>
              <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
                Anyone can register or trigger an emergency dispatch through our web console and mobile application in critical situations.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-50 text-[10px] uppercase font-bold text-emergency">Plan Activated</div>
          </Card>

          {/* Service 2 */}
          <Card animateEntrance className="border-slate-100 p-5 space-y-2.5 flex flex-col justify-between" delayIndex={2}>
            <div>
              <h3 className="font-black text-base text-ink leading-tight">Hospital</h3>
              <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
                We manage end-to-end pre-hospital emergency care routing, providing hospitals with real-time ETA and matching diagnostics.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-50 text-[10px] uppercase font-bold text-goldenhour">Active Network</div>
          </Card>

          {/* Service 3 */}
          <Card animateEntrance className="border-slate-100 p-5 space-y-2.5 flex flex-col justify-between" delayIndex={3}>
            <div>
              <h3 className="font-black text-base text-ink leading-tight">Enterprise</h3>
              <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
                Dedicated emergency response service, corporate health checkups, and ambulance standby plans for companies.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-50 text-[10px] uppercase font-bold text-slate-400">Request Custom Plan</div>
          </Card>

          {/* Service 4 */}
          <Card animateEntrance className="border-slate-100 p-5 space-y-2.5 flex flex-col justify-between" delayIndex={4}>
            <div>
              <h3 className="font-black text-base text-ink leading-tight">Government</h3>
              <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
                Public-Private Partnerships (PPP) enabling smart integrations with public medical emergency systems for rapid reach.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-50 text-[10px] uppercase font-bold text-slate-400">PPP Integration</div>
          </Card>
        </div>
      </div>

    </div>
  );
}
