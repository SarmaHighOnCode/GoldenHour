import React from 'react';
import { useNavigate } from 'react-router-dom';

function PatientIntakeView() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Emergency? Get help now.</h1>
      
      {/* Fake location for now */}
      <button className="w-full py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-gray-700 font-medium hover:bg-gray-50">
        Use my location
      </button>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Emergency type</label>
        <select className="w-full border border-gray-300 rounded-lg p-3">
          <option>trauma</option>
          <option>cardiac</option>
          <option>obstetric</option>
          <option>general</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Blood group needed</label>
        <select className="w-full border border-gray-300 rounded-lg p-3">
          <option>O+</option>
          <option>O-</option>
          <option>A+</option>
          <option>A-</option>
          <option>B+</option>
          <option>B-</option>
          <option>AB+</option>
          <option>AB-</option>
        </select>
      </div>

      <button 
        onClick={() => navigate('/results/test123')}
        className="w-full bg-red-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:bg-red-700 active:scale-95 transition-transform"
      >
        GET HELP
      </button>
    </div>
  );
}

export default PatientIntakeView;
