import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';

export default function DonorRegistration() {
  const navigate = useNavigate();

  // Form Fields State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [lastDonated, setLastDonated] = useState('');
  
  // Geolocation State
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Form Submission & Success states
  const [errors, setErrors] = useState<{ name?: string; phone?: string; blood?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredId, setRegisteredId] = useState('');

  // GPS Locator handler
  const handleGPSFetch = () => {
    if (!navigator.geolocation) {
      setLocationError('Location services not supported.');
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
        console.error('GPS registration fetch error', error);
        let errorMsg = 'Failed to locate. Try again.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location permission blocked.';
        }
        setLocationError(errorMsg);
        setLocating(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Basic Validation
  const validateForm = () => {
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = 'Full name is required';
    
    // Check 10-digit phone format roughly
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (!phone) {
      newErrors.phone = 'Phone number is required';
    } else if (cleanPhone.length < 8) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!bloodGroup) newErrors.blood = 'Blood type selection is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    // Mock API Payload matches contract
    const payload = {
      name,
      phone,
      blood_group: bloodGroup,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      last_donated: lastDonated || null,
    };

    /*
      TODO: Wire up to real backend POST /donor/register endpoint.
      
      POST Body:
      {
        "name": string,
        "phone": string,
        "blood_group": string,
        "lat": number | null,
        "lng": number | null,
        "last_donated": string | null
      }

      Expected Response:
      {
        "ok": true,
        "donor_id": string
      }
    */

    try {
      const res = await fetch('http://localhost:8000/donor/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setRegisteredId(data.donor_id || 'd42');
        setIsRegistered(true);
      } else {
        // Fallback for hackathon demo
        simulateRegistrationSuccess();
      }
    } catch (err) {
      console.warn('Backend server offline. Simulating local registration success.');
      simulateRegistrationSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  const simulateRegistrationSuccess = () => {
    const mockId = `d-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setRegisteredId(mockId);
    setIsRegistered(true);
  };

  const bloodOptions = [
    { value: '', label: '-- Select Blood Group --' },
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' },
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' }
  ];

  // Disable check: Name, Phone, and Blood Group must be populated
  const isButtonDisabled = !name.trim() || !phone.trim() || !bloodGroup;

  return (
    <Card className="w-full relative" animateEntrance delayIndex={0}>
      {/* Visual Identity Highlight (Subtle Amber "Golden Hour" Accent Indicator) */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-goldenhour to-amber-500" />

      <AnimatePresence mode="wait">
        {!isRegistered ? (
          <motion.div
            key="donor-form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Header / Hero */}
            <div className="text-center space-y-2 mb-6 pt-2">
              <h2 className="text-3xl font-extrabold tracking-tight text-ink leading-tight">
                Become a donor. <span className="bg-gradient-to-r from-[#F59E0B] to-amber-600 bg-clip-text text-transparent">Save a life.</span>
              </h2>
              <p className="text-sm text-ink-muted leading-relaxed px-4">
                Register to receive alerts when emergency blood replacements are needed within 5km.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Input */}
              <Input
                label="Full Name"
                type="text"
                placeholder="Asha Verma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
              />

              {/* Phone Input */}
              <Input
                label="Phone Number"
                type="tel"
                placeholder="+91 99999 99999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={errors.phone}
              />

              {/* Blood Group Selector */}
              <Select
                label="Blood Group"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                options={bloodOptions}
                error={errors.blood}
              />

              {/* GPS Coordinates Locker */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider">
                  Rescue Coverage Area
                </label>
                
                <Button
                  type="button"
                  onClick={handleGPSFetch}
                  isLoading={locating}
                  variant={coords ? 'success' : 'ghost'}
                  fullWidth
                  className="transition-all duration-300"
                >
                  {coords ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Coverage locked
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Lock my coverage location
                    </span>
                  )}
                </Button>

                {coords && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                    <p className="text-[10px] font-mono text-slate-400">
                      Anchored: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                    </p>
                  </div>
                )}

                {locationError && (
                  <p className="text-xs font-bold text-emergency text-center">{locationError}</p>
                )}
              </div>

              {/* Optional Date Picker */}
              <Input
                label="Last Donated Date (Optional)"
                type="date"
                value={lastDonated}
                onChange={(e) => setLastDonated(e.target.value)}
              />

              {/* Submit Registration Button */}
              <Button
                type="submit"
                variant="primary"
                disabled={isButtonDisabled || isSubmitting}
                isLoading={isSubmitting}
                fullWidth
                className="mt-6 uppercase text-sm font-extrabold tracking-wider"
              >
                SUBMIT REGISTRATION
              </Button>
            </form>
          </motion.div>
        ) : (
          /* Premium Success State Panel */
          <motion.div
            key="success-panel"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="text-center py-6 space-y-6 animate-fade-in"
          >
            {/* Animated Ring Checkmark */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500/10 animate-pulse" />
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 rounded-full flex items-center justify-center text-3xl font-bold">
                ✓
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-black text-ink">You're registered 🎉</h2>
              <p className="text-sm text-ink-muted leading-relaxed px-4">
                Thank you, <span className="text-ink font-bold">{name}</span>. We've logged your profile under Donor ID <span className="font-mono text-goldenhour font-extrabold">{registeredId}</span>.
              </p>
              <p className="text-xs text-slate-500 leading-relaxed px-2 bg-slate-50 p-3 rounded-xl border border-slate-100/50 mt-4">
                We'll alert you immediately when someone nearby needs your blood type ({bloodGroup}).
              </p>
            </div>

            <Button
              type="button"
              onClick={() => navigate('/')}
              variant="ghost"
              fullWidth
              className="mt-6"
            >
              Return to Intake
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
