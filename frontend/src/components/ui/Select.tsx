import React, { useState, useEffect, useRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  className = '',
  value = '',
  onChange,
  disabled,
  placeholder,
  ...props
}) => {
  const id = useId();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Find the label of the currently selected option
  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder || options[0]?.label || '';

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val: string) => {
    if (disabled) return;
    setIsOpen(false);
    
    // Trigger synthetic change event to maintain full compatibility with native select onChange logic
    if (onChange) {
      const mockEvent = {
        target: {
          value: val,
          name: props.name || '',
        },
      } as unknown as React.ChangeEvent<HTMLSelectElement>;
      onChange(mockEvent);
    }
    
    // Focus back on the button for keyboard accessibility
    buttonRef.current?.focus();
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement | HTMLDivElement>) => {
    if (disabled) return;
    
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handleListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, val: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(val);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  };

  return (
    <div ref={containerRef} className="space-y-1.5 w-full relative">
      <label 
        id={`${id}-label`}
        className="block text-xs font-bold text-ink-muted uppercase tracking-wider select-none dark:text-slate-400"
      >
        {label}
      </label>
      
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={`${id}-label ${id}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full h-14 rounded-xl px-4 text-sm font-bold text-left flex items-center justify-between border-2 transition-all cursor-pointer focus:outline-none focus-visible:ring-4
            bg-white text-slate-900 border-slate-200 focus:border-[#DC2626] focus-visible:ring-[#DC2626]/20
            dark:bg-black/40 dark:text-white dark:border-white/10 dark:focus:border-[#DC2626] dark:focus-visible:ring-[#DC2626]/25
            ${error ? 'border-emergency focus:border-emergency focus-visible:ring-red-500/15 dark:border-emergency' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${className}`}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
        </button>

        {/* Dropdown Options List */}
        {isOpen && (
          <div 
            role="listbox"
            aria-labelledby={`${id}-label`}
            tabIndex={-1}
            className="absolute z-50 w-full mt-2 rounded-xl border shadow-[0_8px_32px_rgba(0,0,0,0.18)] max-h-60 overflow-y-auto focus:outline-none py-1
              bg-white text-slate-900 border-slate-200
              dark:bg-[#141419] dark:text-white dark:border-white/10"
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={0}
                  onClick={() => handleSelect(opt.value)}
                  onKeyDown={(e) => handleListKeyDown(e, opt.value)}
                  className={`px-4 py-3 text-sm font-bold cursor-pointer transition-all hover:bg-slate-100 focus:bg-slate-100 focus:outline-none
                    dark:hover:bg-white/5 dark:focus:bg-white/5
                    ${isSelected ? 'text-[#DC2626] bg-slate-50 dark:bg-white/5 dark:text-[#DC2626]' : ''}`}
                >
                  {opt.label}
                </div>
              );
            })}
          </div>
        )}
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
