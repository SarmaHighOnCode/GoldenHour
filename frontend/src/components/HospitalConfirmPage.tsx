import React from 'react';
import { useParams } from 'react-router-dom';

export default function HospitalConfirmPage() {
  const { token } = useParams<{ token: string }>();
  return (
    <div className="py-8 text-center space-y-4">
      <h1 className="text-3xl font-black tracking-tight text-ink">Hospital Confirmation Screen</h1>
      <p className="text-sm text-ink-muted">Route: "/confirm/{token}"</p>
    </div>
  );
}
