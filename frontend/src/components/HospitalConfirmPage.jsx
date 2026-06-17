import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

function HospitalConfirmPage() {
  const { token } = useParams();
  const [responded, setResponded] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const handleResponse = (isAccepted) => {
    // API call will go here
    setAccepted(isAccepted);
    setResponded(true);
  };

  if (responded) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">✓</div>
        <h2 className="text-2xl font-bold text-gray-900">Thank you</h2>
        <p className="text-gray-600">The family has been notified.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-sm mx-auto">
      <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 shadow-sm text-center">
        <h1 className="text-xl font-bold mb-2">🚨 Emergency Request</h1>
        <div className="space-y-1 font-medium">
          <p>Type: Trauma</p>
          <p>Blood: O+</p>
          <p>ETA: 6 mins</p>
        </div>
      </div>

      <div className="space-y-3">
        <button 
          onClick={() => handleResponse(true)}
          className="w-full bg-green-600 text-white font-bold text-lg py-4 rounded-xl shadow hover:bg-green-700"
        >
          ✓ Accept Patient
        </button>
        <button 
          onClick={() => handleResponse(false)}
          className="w-full bg-gray-200 text-gray-800 font-bold text-lg py-4 rounded-xl shadow hover:bg-gray-300"
        >
          ✗ Not Available
        </button>
      </div>
    </div>
  );
}

export default HospitalConfirmPage;
