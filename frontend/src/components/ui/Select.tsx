import React, { useId, useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface SelectProps {
  label: string;
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  options: { value: string; label: string }[];
  error?: string;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  options,
  error,
  className = '',
}) => {
  const id = useId();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : options[0]?.label;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-1.5 w-full relative" ref={dropdownRef}>
      <label 
        htmlFor={id} 
        className="block text-[10px] font-extrabold text-white/50 uppercase tracking-[0.15em] select-none"
      >
        {label}
      </label>
      
      <div className="relative">
        <button
          id={id}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full h-14 flex items-center justify-between bg-white/5 border border-white/10 hover:border-white/20 focus:border-goldenhour focus:bg-white/10 rounded-xl pl-4 pr-4 text-sm font-bold text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-goldenhour/20 cursor-pointer transition-all backdrop-blur-sm ${
            error ? 'border-emergency focus:border-emergency focus-visible:ring-red-500/15' : ''
          } ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className={value ? 'text-white' : 'text-white/40'}>
            {displayLabel}
          </span>
          <svg 
            className={`w-5 h-5 text-white/60 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute z-50 w-full mt-2 bg-[#1A1A24] border border-white/10 rounded-xl shadow-xl overflow-hidden backdrop-blur-md"
              role="listbox"
            >
              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={value === opt.value}
                    className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors ${
                      value === opt.value 
                        ? 'bg-goldenhour/20 text-goldenhour' 
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                    onClick={() => {
                      onChange({ target: { value: opt.value } });
                      setIsOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
