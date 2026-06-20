import React, { useRef, useEffect } from 'react';
import { gsap, ScrollTrigger } from '../../lib/gsap-setup';

interface ParallaxSectionProps {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}

/**
 * Parallax wrapper — translates children on the Y axis
 * based on scroll position for a layered depth effect.
 */
export const ParallaxSection: React.FC<ParallaxSectionProps> = ({
  children,
  speed = 0.3,
  className = '',
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const tween = gsap.to(el, {
      y: () => speed * 100,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });

    return () => {
      tween.kill();
    };
  }, [speed]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};
