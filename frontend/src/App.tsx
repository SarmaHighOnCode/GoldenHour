import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AppBar } from './components/ui/AppBar';
import PatientIntakeView from './components/PatientIntakeView';
import PatientResultsView from './components/PatientResultsView';
import HospitalConfirmPage from './components/HospitalConfirmPage';
import DonorRegistration from './components/DonorRegistration';

function AppContent() {
  const location = useLocation();
  const isHospitalConfirm = location.pathname.startsWith('/confirm/');

  return (
    <div className="min-h-screen bg-bg-warm text-ink flex flex-col antialiased">
      {!isHospitalConfirm && <AppBar />}
      
      <main className="flex-grow flex flex-col items-center justify-center p-4 max-w-md w-full mx-auto relative">
        <Routes>
          <Route path="/" element={<PatientIntakeView />} />
          <Route path="/results/:id" element={<PatientResultsView />} />
          <Route path="/confirm/:token" element={<HospitalConfirmPage />} />
          <Route path="/register" element={<DonorRegistration />} />
        </Routes>
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
