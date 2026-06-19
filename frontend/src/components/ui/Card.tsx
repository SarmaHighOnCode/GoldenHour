import React from 'react';
import { motion } from 'framer-motion';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  animateEntrance?: boolean;
  delayIndex?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  animateEntrance = true,
  delayIndex = 0,
  className = '',
  ...props
}) => {
  const cardStyle = `bg-white rounded-2xl p-5 shadow-layered border border-slate-100/30 overflow-hidden relative ${className}`;

  if (!animateEntrance) {
    return (
      <div className={cardStyle} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 25,
        delay: delayIndex * 0.08
      }}
      className={cardStyle}
      {...props}
    >
      {children}
    </motion.div>
  );
};
