import React, { useRef, useEffect, useState } from 'react';
import { useInView, animate, useMotionValue, useReducedMotion } from 'framer-motion';

interface CountUpProps {
  end: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
  decimals?: number;
}

/**
 * Animated number counter that counts from 0 to target value
 * when scrolled into view via Framer Motion's useInView.
 */
export const CountUp: React.FC<CountUpProps> = ({
  end,
  prefix = '',
  suffix = '',
  duration = 0.5,
  className = '',
  decimals = 0,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });
  const count = useMotionValue(0);
  const [display, setDisplay] = useState(0);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (!isInView) return;

    if (prefersReduced) {
      setDisplay(end);
      return;
    }

    const controls = animate(count, end, {
      duration,
      ease: 'easeOut',
      onUpdate: (latest) => {
        setDisplay(latest);
      }
    });

    return () => controls.stop();
  }, [isInView, end, duration, prefersReduced]);

  return (
    <span ref={ref} className={className}>
      {prefix}{display.toFixed(decimals)}{suffix}
    </span>
  );
};
