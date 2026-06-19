import React from 'react';
import { useParams } from 'react-router-dom';

export default function PatientResultsView() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="py-8 text-center space-y-4">
      <h1 className="text-3xl font-black tracking-tight text-ink">Live Results Screen</h1>
      <p className="text-sm text-ink-muted">Route: "/results/{id}"</p>
    </div>
  );
}
