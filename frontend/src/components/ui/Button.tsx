import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const MotionLink = motion(Link);

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  variant?: 'emergency' | 'secondary' | 'success' | 'ghost' | 'primary';
  size?: 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  href?: string;
  to?: string;
  onClick?: (e: React.MouseEvent<any>) => void;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  href,
  to,
  className = '',
  disabled,
  onClick,
  type = 'button',
  ...props
}) => {
  const baseStyle = "relative flex items-center justify-center font-extrabold tracking-wider uppercase transition-all duration-300 focus:outline-none focus-visible:ring-4 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer";
  
  const sizeStyles = {
    md: "h-14 px-10 text-sm rounded-2xl",
    lg: "h-16 px-12 text-base rounded-2xl"
  };
  
  const widthStyle = fullWidth ? "w-full" : "";
  
  const variantStyles = {
    emergency: "bg-gradient-to-r from-emergency to-emergency-pressed text-white shadow-lg shadow-emergency/25 animate-pulse-glow hover:scale-105 active:scale-[0.98] border-0",
    secondary: "border-2 border-goldenhour text-goldenhour hover:bg-goldenhour/10 bg-transparent hover:scale-105 active:scale-[0.98]",
    success: "bg-success text-white hover:bg-emerald-700 focus-visible:ring-emerald-500/20 active:bg-emerald-800 shadow-[0_4px_12px_rgba(5,150,105,0.2)] hover:scale-105 active:scale-[0.98]",
    primary: "bg-ink text-white hover:bg-ink-muted focus-visible:ring-slate-500/20 active:bg-slate-900 shadow-[0_4px_12px_rgba(26,23,20,0.15)] hover:scale-105 active:scale-[0.98]",
    ghost: "bg-transparent text-ink border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-slate-500/20 active:bg-slate-100 hover:scale-105 active:scale-[0.98]"
  };

  const combinedClassName = `${baseStyle} ${sizeStyles[size]} ${widthStyle} ${variantStyles[variant]} ${className}`;

  const content = isLoading ? (
    <span className="flex items-center gap-2">
      <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      Processing...
    </span>
  ) : (
    children
  );

  const tapAnimation = disabled || isLoading ? {} : { whileTap: { scale: 0.96 } };

  if (to) {
    return (
      <MotionLink
        to={to}
        onClick={onClick}
        className={combinedClassName}
        {...tapAnimation}
        {...(props as any)}
      >
        {content}
      </MotionLink>
    );
  }

  if (href) {
    return (
      <motion.a
        href={href}
        onClick={onClick}
        className={combinedClassName}
        {...tapAnimation}
        {...(props as any)}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={combinedClassName}
      {...tapAnimation}
      {...props}
    >
      {content}
    </motion.button>
  );
};
