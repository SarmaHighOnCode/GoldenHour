import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ReactLenis, useLenis } from 'lenis/react';
import 'lenis/dist/lenis.css';

import { AppBar } from './components/ui/AppBar';
import { CustomCursor } from './components/ui/CustomCursor';
import PatientIntakeView from './components/PatientIntakeView';
import PatientResultsView from './components/PatientResultsView';
import HospitalConfirmPage from './components/HospitalConfirmPage';
import DonorRegistration from './components/DonorRegistration';
import { gsap, ScrollTrigger } from './lib/gsap-setup';

// Shared premium page entry animation wrapper
const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      className="w-full flex flex-col items-center justify-center"
    >
      {children}
    </motion.div>
  );
};

function AppContent({ prefersReduced }: { prefersReduced: boolean }) {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isRegister = location.pathname === '/register';
  const isResults = location.pathname.startsWith('/results/');
  const isHospitalConfirm = location.pathname.startsWith('/confirm/');

  // Dark theme for home, donor registration, and results page
  const theme = isHome || isRegister || isResults ? 'dark' : 'light';

  // Sync Lenis with GSAP ScrollTrigger
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis || prefersReduced) return;

    const handleScroll = () => {
      ScrollTrigger.update();
    };
    lenis.on('scroll', handleScroll);

    const updateRaf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(updateRaf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.off('scroll', handleScroll);
      gsap.ticker.remove(updateRaf);
    };
  }, [lenis, prefersReduced]);

  return (
    <div
      data-theme={theme}
      className={`min-h-screen flex flex-col antialiased relative selection:bg-goldenhour/25 transition-colors duration-500 ${
        (isHome || isRegister || isResults)
          ? 'bg-dark-bg text-dark-ink'
          : 'bg-bg-warm text-ink'
      }`}
    >
      <CustomCursor />
      {/* GoldenHour sunset gradient branding line */}
      {!(isHome || isRegister) && (
        <div
          className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emergency via-goldenhour to-emergency z-[100]"
          role="presentation"
        />
      )}

      {!isHospitalConfirm && <AppBar />}

      <main className={`flex-grow flex flex-col items-center justify-center w-full relative ${
        (isHome || isRegister) ? '' : 'p-4 pt-6 pb-12'
      }`}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={isHome ? <PatientIntakeView /> : <PageWrapper><PatientIntakeView /></PageWrapper>} />
            <Route path="/results/:id" element={<PageWrapper><PatientResultsView /></PageWrapper>} />
            <Route path="/confirm/:token" element={<PageWrapper><HospitalConfirmPage /></PageWrapper>} />
            <Route path="/register" element={<PageWrapper><DonorRegistration /></PageWrapper>} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}

function App() {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return (
    <BrowserRouter>
      <ReactLenis
        root
        options={{
          lerp: 0.1,
          smoothWheel: !prefersReduced,
          syncTouch: false,
        }}
        autoRaf={prefersReduced}
      >
        <AppContent prefersReduced={prefersReduced} />
      </ReactLenis>
    </BrowserRouter>
  );
}

export default App;
