import React, { useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  const id = useId();
  
  return (
    <div className="space-y-1.5 w-full">
      <label 
        htmlFor={id} 
        className="block text-xs font-bold text-ink-muted uppercase tracking-wider select-none"
      >
        {label}
      </label>
      <input
        id={id}
        className={`w-full h-14 bg-white border-2 border-slate-200 focus:border-ink rounded-xl px-4 text-sm font-semibold text-ink placeholder-slate-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-500/15 transition-all ${
          error ? 'border-emergency focus:border-emergency focus-visible:ring-red-500/15' : ''
        } ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <p 
          id={`${id}-error`} 
          className="text-xs text-emergency font-bold tracking-wide mt-1 select-none"
        >
          {error}
        </p>
      )}
    </div>
  );
};
