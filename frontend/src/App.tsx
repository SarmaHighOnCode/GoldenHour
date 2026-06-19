import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppBar } from './components/ui/AppBar';
import PatientIntakeView from './components/PatientIntakeView';
import PatientResultsView from './components/PatientResultsView';
import HospitalConfirmPage from './components/HospitalConfirmPage';
import DonorRegistration from './components/DonorRegistration';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-bg-warm text-ink flex flex-col antialiased">
        <AppBar />
        
        <main className="flex-1 flex flex-col items-center justify-center p-4 max-w-md w-full mx-auto relative">
          <Routes>
            <Route path="/" element={<PatientIntakeView />} />
            <Route path="/results/:id" element={<PatientResultsView />} />
            <Route path="/confirm/:token" element={<HospitalConfirmPage />} />
            <Route path="/register" element={<DonorRegistration />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
