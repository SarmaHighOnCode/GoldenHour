const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface Hospital {
  hospital_id: string;
  name: string;
  eta_minutes: number;
  department_match: boolean;
  distance_km?: number;
  status: 'pending' | 'confirmed' | 'declined';
  phone: string;
}

export interface EmergencyResponse {
  request_id: string;
  hospitals: Hospital[];
  donors_alerted: number;
  rare_group?: boolean;
}

export interface EmergencyStatusResponse {
  request_id: string;
  hospitals: Array<{
    hospital_id: string;
    name: string;
    eta_minutes: number;
    status: 'pending' | 'confirmed' | 'declined';
  }>;
  donors_alerted: number;
  donors_responded: number;
  unconfirmed_fallback?: boolean;
}

export interface DonorRegisterResponse {
  ok: boolean;
  donor_id: string;
}

export interface HospitalConfirmDetailsResponse {
  hospital_name: string;
  emergency_type: string;
  blood_group: string;
  eta_minutes: number;
  already_confirmed: boolean;
  responded: boolean;
  accepted: boolean;
}

export interface HospitalConfirmResponse {
  ok: boolean;
  hospital_name: string;
  already_confirmed: boolean;
}

// Thin typed API Client for GoldenHour
export const api = {
  // POST /emergency
  async triggerEmergency(
    lat: number,
    lng: number,
    emergencyType: string,
    bloodGroup: string
  ): Promise<EmergencyResponse> {
    const res = await fetch(`${BASE_URL}/emergency`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lat,
        lng,
        emergency_type: emergencyType,
        blood_group: bloodGroup,
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to trigger emergency: ${res.statusText}`);
    }
    return res.json();
  },

  // GET /emergency/{request_id}/status
  async getEmergencyStatus(requestId: string): Promise<EmergencyStatusResponse> {
    const res = await fetch(`${BASE_URL}/emergency/${requestId}/status`);
    if (!res.ok) {
      throw new Error(`Failed to fetch emergency status: ${res.statusText}`);
    }
    return res.json();
  },

  // POST /donor/register
  async registerDonor(
    name: string,
    phone: string,
    bloodGroup: string,
    lat: number | null,
    lng: number | null,
    lastDonated: string | null,
    sex?: 'male' | 'female' | null
  ): Promise<DonorRegisterResponse> {
    const res = await fetch(`${BASE_URL}/donor/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        phone,
        blood_group: bloodGroup,
        lat,
        lng,
        last_donated: lastDonated,
        sex,
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to register donor: ${res.statusText}`);
    }
    return res.json();
  },

  // GET /confirm/{token}
  async getHospitalConfirmDetails(token: string): Promise<HospitalConfirmDetailsResponse> {
    const res = await fetch(`${BASE_URL}/confirm/${token}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch confirmation details: ${res.statusText}`);
    }
    return res.json();
  },

  // POST /confirm/{token}
  async confirmHospitalRequest(
    token: string,
    accepted: boolean
  ): Promise<HospitalConfirmResponse> {
    const res = await fetch(`${BASE_URL}/confirm/${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accepted }),
    });
    if (!res.ok) {
      throw new Error(`Failed to submit hospital confirmation: ${res.statusText}`);
    }
    return res.json();
  },
};
