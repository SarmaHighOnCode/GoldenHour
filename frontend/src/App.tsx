import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AppBar } from './components/ui/AppBar';
import PatientIntakeView from './components/PatientIntakeView';
import PatientResultsView from './components/PatientResultsView';
import HospitalConfirmPage from './components/HospitalConfirmPage';
import DonorRegistration from './components/DonorRegistration';

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

function AppContent() {
  const location = useLocation();
  const isHospitalConfirm = location.pathname.startsWith('/confirm/');

  return (
    <div className="min-h-screen bg-bg-warm text-ink flex flex-col antialiased relative selection:bg-goldenhour/25">
      {/* Memorable GoldenHour sunset gradient branding line threaded on very top */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emergency via-goldenhour to-emergency z-[100]" 
        role="presentation"
      />
      
      {!isHospitalConfirm && <AppBar />}
      
      <main className="flex-grow flex flex-col items-center justify-center p-4 w-full relative pt-6 pb-12">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageWrapper><PatientIntakeView /></PageWrapper>} />
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
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
