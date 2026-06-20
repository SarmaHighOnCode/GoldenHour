import React, { useRef, useEffect } from 'react';
import { gsap, ScrollTrigger } from '../../lib/gsap-setup';

interface CardRevealProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'left' | 'right' | 'bottom';
  delay?: number;
}

/**
 * WebGL-inspired card entrance using diagonal clip-path wipe + scale + opacity.
 * Triggered on scroll intersection.
 */
export const CardReveal: React.FC<CardRevealProps> = ({
  children,
  className = '',
  direction = 'bottom',
  delay = 0,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Set initial state
    gsap.set(el, {
      opacity: 0,
      y: direction === 'bottom' ? 60 : 0,
      x: direction === 'left' ? -60 : direction === 'right' ? 60 : 0,
      scale: 0.95,
      clipPath: direction === 'left'
        ? 'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)'
        : direction === 'right'
        ? 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)'
        : 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)',
    });

    const tween = gsap.to(el, {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
      duration: 1.2,
      delay,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
        toggleActions: 'play none none none',
      },
    });

    return () => {
      tween.kill();
    };
  }, [direction, delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};
