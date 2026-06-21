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
        className="block text-[10px] font-extrabold text-white/50 uppercase tracking-[0.15em] select-none"
      >
        {label}
      </label>
      <input
        id={id}
        className={`w-full h-14 bg-white/5 border border-white/10 hover:border-white/20 focus:border-goldenhour focus:bg-white/10 rounded-xl px-4 text-sm font-bold text-white placeholder-white/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-goldenhour/20 transition-all backdrop-blur-sm ${
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
