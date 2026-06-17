import React from 'react';
import { useParams } from 'react-router-dom';

const fakeHospitals = [
  { hospital_id: "h1", name: "SMS Hospital", eta_minutes: 6, department_match: true, status: "pending", phone: "+910000000000" },
  { hospital_id: "h2", name: "Fortis Jaipur", eta_minutes: 9, department_match: true, status: "confirmed", phone: "+910000000000" },
  { hospital_id: "h3", name: "Manipal Jaipur", eta_minutes: 12, department_match: false, status: "pending", phone: "+910000000000" },
];

function PatientResultsView() {
  const { id } = useParams();

  return (
    <div className="space-y-4 pb-20">
      <h2 className="text-xl font-bold">Hospitals Nearby</h2>
      
      <div className="space-y-3">
        {fakeHospitals.map(h => (
          <div key={h.hospital_id} className={`p-4 rounded-xl shadow border ${h.status === 'confirmed' ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-lg">{h.name}</h3>
              <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${h.status === 'confirmed' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                {h.status}
              </span>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
              <span className="font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{h.eta_minutes} min ETA</span>
              {h.department_match && <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded">Dept match</span>}
            </div>

            <a href={`tel:${h.phone}`} className="flex items-center justify-center w-full py-2 bg-gray-900 text-white rounded-lg font-medium">
              Call Hospital
            </a>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-red-600 font-bold">5 donors alerted nearby</span>
            <span className="text-sm text-gray-500">2 responded</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            {/* Blood drop icon */}
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientResultsView;
