import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Select } from './ui/Select';

export default function PatientIntakeView() {
  const navigate = useNavigate();

  // Selections
  const [emergencyType, setEmergencyType] = useState<string>('');
  const [bloodGroup, setBloodGroup] = useState<string>('');

  // Geolocation State
  const [locating, setLocating] = useState<boolean>(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

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

  // TODO: Implement real API call on submission
  const dispatchEmergency = async () => {
    if (!isFormValid || !coords) return;

    /*
      TODO: Wire up to real backend POST /emergency endpoint.
      
      POST Body Shape:
      {
        "lat": coords.lat,
        "lng": coords.lng,
        "emergency_type": emergencyType,
        "blood_group": bloodGroup
      }

      Expected Response:
      {
        "request_id": string,
        "hospitals": Hospital[],
        "donors_alerted": number
      }
    */
    
    // For now, simulate transition and navigate to results page
    console.log('Emergency Dispatched:', {
      type: emergencyType,
      blood: bloodGroup,
      coords
    });
    
    // Navigate directly to mock test results page
    navigate('/results/test123');
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
    <Card className="w-full select-none" animateEntrance delayIndex={0}>
      {/* Visual Identity Highlight (Subtle Amber "Golden Hour" Accent Indicator) */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-goldenhour to-rose-500" />
      
      {/* Header Headline */}
      <div className="text-center space-y-2 mb-8 pt-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink leading-tight">
          Emergency? Get help now.
        </h2>
        <p className="text-sm text-ink-muted leading-relaxed px-2">
          We'll find the nearest ready hospital and alert matching blood donors in your area.
        </p>
      </div>

      <div className="space-y-6">
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
            className="transition-all duration-300"
          >
            {coords ? (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 text-white animate-[bounce_0.5s_ease]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Location locked
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Pin my current location
              </span>
            )}
          </Button>

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
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                  Lat: {coords.lat} &middot; Lng: {coords.lng}
                </p>
              </motion.div>
            )}

            {locationError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-red-50 border border-red-100/50 rounded-xl p-3 text-center space-y-1.5"
              >
                <p className="text-xs font-bold text-emergency">
                  {locationError}
                </p>
                <button
                  type="button"
                  onClick={handleAcquireLocation}
                  className="text-xs text-rose-600 hover:text-rose-700 font-extrabold underline focus:outline-none"
                >
                  Retry Location Search
                </button>
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
        />

        {/* Blood Group Selection */}
        <Select
          label="Blood group needed"
          value={bloodGroup}
          onChange={(e) => setBloodGroup(e.target.value)}
          options={bloodOptions}
        />

        {/* Dispatch Action Button */}
        <Button
          type="button"
          onClick={dispatchEmergency}
          variant="emergency"
          disabled={!isFormValid}
          fullWidth
          className="mt-4 shadow-md font-extrabold uppercase tracking-wider text-base"
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            GET HELP
          </span>
        </Button>
      </div>
    </Card>
  );
}
