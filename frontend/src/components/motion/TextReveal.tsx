import React, { useRef, useEffect } from 'react';
import { gsap, ScrollTrigger } from '../../lib/gsap-setup';

interface TextRevealProps {
  children: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  className?: string;
  splitBy?: 'words' | 'chars' | 'lines';
  stagger?: number;
  scrub?: boolean | number;
  start?: string;
  end?: string;
}

/**
 * Scroll-driven text reveal component.
 * Splits text into words/chars and reveals them with clip-path + opacity
 * as the user scrolls — inspired by Shopify Editions editorial style.
 */
export const TextReveal: React.FC<TextRevealProps> = ({
  children,
  as: Tag = 'p',
  className = '',
  splitBy = 'words',
  stagger = 0.04,
  scrub = true,
  start = 'top 85%',
  end = 'top 25%',
}) => {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Split text into individual span elements
    const text = el.textContent || '';
    const units = splitBy === 'chars'
      ? text.split('')
      : text.split(/\s+/).filter(Boolean);

    el.innerHTML = '';
    const spans: HTMLSpanElement[] = [];

    units.forEach((unit, i) => {
      const span = document.createElement('span');
      span.style.display = 'inline-block';
      span.style.overflow = 'hidden';

      const inner = document.createElement('span');
      inner.textContent = unit;
      inner.style.display = 'inline-block';
      inner.style.opacity = '0.15';
      inner.style.transform = 'translateY(20%)';
      inner.style.transition = 'none';

      span.appendChild(inner);
      el.appendChild(span);
      spans.push(inner);

      // Add space between words
      if (splitBy === 'words' && i < units.length - 1) {
        const space = document.createTextNode('\u00A0');
        el.appendChild(space);
      }
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start,
        end,
        scrub: scrub === true ? 1 : scrub,
      },
    });

    tl.to(spans, {
      opacity: 1,
      y: '0%',
      duration: 0.8,
      stagger,
      ease: 'power2.out',
    });

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach(st => {
        if (st.trigger === el) st.kill();
      });
    };
  }, [children, splitBy, stagger, scrub, start, end]);

  return (
    <Tag ref={containerRef as any} className={`${className}`}>
      {children}
    </Tag>
  );
};
