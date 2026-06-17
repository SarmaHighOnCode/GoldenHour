import React, { useState } from 'react';

function DonorRegistration() {
  const [registered, setRegistered] = useState(false);

  if (registered) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">✓</div>
        <h2 className="text-2xl font-bold text-gray-900">Registration Complete</h2>
        <p className="text-gray-600">Thank you for signing up to save a life.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Become a Donor</h1>
        <p className="text-gray-600">Register to be alerted when replacement blood is needed nearby.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input type="text" className="w-full border border-gray-300 rounded-lg p-3" placeholder="Asha Verma" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input type="tel" className="w-full border border-gray-300 rounded-lg p-3" placeholder="+91 99999 99999" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Donated (Optional)</label>
          <input type="date" className="w-full border border-gray-300 rounded-lg p-3" />
        </div>

        <button className="w-full py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-gray-700 font-medium hover:bg-gray-50 mb-4">
          📍 Use my current location
        </button>

        <button 
          onClick={() => setRegistered(true)}
          className="w-full bg-red-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:bg-red-700"
        >
          Register
        </button>
      </div>
    </div>
  );
}

export default DonorRegistration;
