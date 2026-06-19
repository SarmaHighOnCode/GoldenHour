import React from 'react';
import { motion } from 'framer-motion';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'emergency' | 'primary' | 'success' | 'ghost';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  isLoading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  // Base classes optimized for emergency gloves (minimum 56px target)
  const baseStyle = "relative flex items-center justify-center h-14 px-6 rounded-xl font-bold tracking-wide transition-colors focus:outline-none focus:ring-4 focus:ring-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed select-none";
  
  const widthStyle = fullWidth ? "w-full" : "";
  
  // Custom design token styling matching DESIGN.md
  const variantStyles = {
    emergency: "bg-emergency text-white hover:bg-emergency-hover focus:ring-red-500/20 active:bg-emergency-pressed shadow-[0_4px_12px_rgba(220,38,38,0.2)]",
    primary: "bg-ink text-white hover:bg-ink-muted focus:ring-slate-500/20 active:bg-ink shadow-[0_4px_12px_rgba(26,23,20,0.15)]",
    success: "bg-success text-white hover:opacity-90 focus:ring-emerald-500/20 shadow-[0_4px_12px_rgba(5,150,105,0.2)]",
    ghost: "bg-transparent text-ink border-2 border-slate-200 hover:bg-slate-100 hover:border-slate-300 focus:ring-slate-500/20"
  };

  return (
    <motion.button
      whileTap={{ scale: disabled || isLoading ? 1 : 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      disabled={disabled || isLoading}
      className={`${baseStyle} ${widthStyle} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          {/* Spinner icon */}
          <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Processing...
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
};
