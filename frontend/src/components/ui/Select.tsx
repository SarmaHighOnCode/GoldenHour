import React, { useId } from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  className = '',
  ...props
}) => {
  const id = useId();

  return (
    <div className="space-y-1.5 w-full relative">
      <label 
        htmlFor={id} 
        className="block text-xs font-bold text-ink-muted uppercase tracking-wider select-none"
      >
        {label}
      </label>
      
      <div className="relative">
        <select
          id={id}
          className={`w-full h-14 bg-white border-2 border-slate-200 focus:border-ink rounded-xl pl-4 pr-10 text-sm font-bold text-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-500/15 appearance-none cursor-pointer transition-all ${
            error ? 'border-emergency focus:border-emergency focus-visible:ring-red-500/15' : ''
          } ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236B6560' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 1rem center',
            backgroundSize: '1.25rem 1.25rem',
            backgroundRepeat: 'no-repeat',
          }}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="font-bold text-slate-800 bg-white">
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      
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
