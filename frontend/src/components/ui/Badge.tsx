import React from 'react';

export interface BadgeProps {
  status: 'pending' | 'confirmed' | 'declined';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  // Styles aligned with calm urgency theme and DESIGN.md
  const baseStyle = "inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider select-none border";

  const statusStyles = {
    pending: "bg-amber-500/5 text-amber-600 border-amber-500/20",
    confirmed: "bg-success/5 text-success border-success/20",
    declined: "bg-slate-200/50 text-slate-500 border-slate-300/40",
  };

  const statusLabels = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    declined: 'Declined',
  };

  return (
    <span className={`${baseStyle} ${statusStyles[status]} ${className}`}>
      {status === 'pending' && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
      )}
      {status === 'confirmed' && (
        <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5" />
      )}
      {status === 'declined' && (
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
      )}
      {statusLabels[status]}
    </span>
  );
};
