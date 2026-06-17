import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PatientIntakeView from './components/PatientIntakeView';
import PatientResultsView from './components/PatientResultsView';
import HospitalConfirmPage from './components/HospitalConfirmPage';
import DonorRegistration from './components/DonorRegistration';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-red-600 text-white p-4 text-center font-bold text-xl shadow-md">
          GoldenHour
        </header>
        <main className="flex-1 overflow-y-auto p-4 max-w-md mx-auto w-full">
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
