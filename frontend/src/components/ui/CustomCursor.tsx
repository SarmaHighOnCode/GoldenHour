import React, { useEffect, useRef, useState } from 'react';
import { gsap } from '../../lib/gsap-setup';

export const CustomCursor: React.FC = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isInput, setIsInput] = useState(false);
  const [isMagnetic, setIsMagnetic] = useState(false);
  
  useEffect(() => {
    // 1. Accessibility & Device Fallbacks
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Disable custom cursor on touchscreens or when reduced motion is preferred
    if (reducedMotion || isTouchDevice) {
      return;
    }

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    // Set initial offscreen positions
    gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });

    // GSAP quickTo for 60fps tracking without triggering React renders
    const xToDot = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power3.out' });
    const yToDot = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power3.out' });
    
    const xToRing = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power2.out' });
    const yToRing = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power2.out' });

    let currentMagneticElement: HTMLElement | null = null;

    const onMouseMove = (e: MouseEvent) => {
      if (!isVisible) setIsVisible(true);

      const target = e.target as HTMLElement;
      
      // Handle Magnetic Attraction
      if (currentMagneticElement) {
        const rect = currentMagneticElement.getBoundingClientRect();
        // Calculate center of target element
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Pull cursor ring toward target center (strength increases near center)
        const pullFactor = 0.45; 
        const targetX = centerX + (e.clientX - centerX) * pullFactor;
        const targetY = centerY + (e.clientY - centerY) * pullFactor;

        xToDot(e.clientX);
        yToDot(e.clientY);
        xToRing(targetX);
        yToRing(targetY);
        
        // Magnetically shift the element slightly too for tactile feedback!
        const shiftX = (e.clientX - centerX) * 0.2;
        const shiftY = (e.clientY - centerY) * 0.2;
        gsap.to(currentMagneticElement, {
          x: shiftX,
          y: shiftY,
          duration: 0.3,
          ease: 'power2.out',
        });
      } else {
        // Normal tracking
        xToDot(e.clientX);
        yToDot(e.clientY);
        xToRing(e.clientX);
        yToRing(e.clientY);
      }
    };

    const onMouseEnterInteractive = (e: Event) => {
      const el = e.currentTarget as HTMLElement;
      setIsHovered(true);

      const isMag = el.tagName === 'BUTTON' || el.classList.contains('magnetic-btn') || el.hasAttribute('data-magnetic');
      const isField = el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA';

      setIsInput(isField);
      setIsMagnetic(isMag);

      if (isMag) {
        currentMagneticElement = el;
        // Ring expands and snaps outline
        gsap.to(ring, {
          width: el.offsetWidth + 16,
          height: el.offsetHeight + 16,
          borderRadius: gsap.getProperty(el, 'borderRadius') as string || '12px',
          borderColor: 'rgba(245, 158, 11, 0.65)',
          backgroundColor: 'rgba(245, 158, 11, 0.04)',
          duration: 0.3,
          ease: 'power2.out'
        });
        gsap.to(dot, {
          scale: 0,
          duration: 0.2
        });
      } else if (isField) {
        // Stretch ring to vertically thin focus indicator
        gsap.to(ring, {
          scale: 1.4,
          borderWidth: '1.5px',
          borderColor: 'rgba(220, 38, 38, 0.4)',
          duration: 0.25
        });
      } else {
        // Generic hover zoom
        gsap.to(ring, {
          scale: 1.6,
          borderColor: 'rgba(245, 158, 11, 0.6)',
          duration: 0.25
        });
      }
    };

    const onMouseLeaveInteractive = () => {
      setIsHovered(false);
      setIsInput(false);
      setIsMagnetic(false);

      if (currentMagneticElement) {
        // Reset the shifted magnetic button back to its origin
        gsap.to(currentMagneticElement, {
          x: 0,
          y: 0,
          duration: 0.4,
          ease: 'elastic.out(1, 0.4)',
        });
        currentMagneticElement = null;
      }

      // Restore default cursor dimensions
      gsap.to(ring, {
        width: 32,
        height: 32,
        scale: 1,
        borderRadius: '50%',
        borderColor: 'rgba(245, 158, 11, 0.3)',
        backgroundColor: 'transparent',
        borderWidth: '2px',
        duration: 0.3,
        ease: 'power2.out'
      });
      gsap.to(dot, {
        scale: 1,
        duration: 0.2
      });
    };

    // Attach listeners globally via event delegation or direct selection
    const updateInteractiveListeners = () => {
      // Find all interactive elements
      const elements = document.querySelectorAll('a, button, input, select, [data-magnetic], .cursor-pointer-target');
      elements.forEach((el) => {
        el.addEventListener('mouseenter', onMouseEnterInteractive);
        el.addEventListener('mouseleave', onMouseLeaveInteractive);
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    updateInteractiveListeners();

    // Re-bind listeners when page DOM changes (e.g. intake form states)
    const observer = new MutationObserver(() => {
      updateInteractiveListeners();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      observer.disconnect();
      const elements = document.querySelectorAll('a, button, input, select, [data-magnetic]');
      elements.forEach((el) => {
        el.removeEventListener('mouseenter', onMouseEnterInteractive);
        el.removeEventListener('mouseleave', onMouseLeaveInteractive);
      });
    };
  }, []);

  return (
    <div style={{ opacity: isVisible ? 1 : 0, transition: 'opacity 0.2s ease-in-out' }}>
      {/* Outer Follower Ring */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 w-8 h-8 rounded-full border-2 border-goldenhour/30 pointer-events-none z-[9999]"
        style={{
          transform: 'translate(-50%, -50%)',
          willChange: 'transform, width, height, border-radius, background-color',
        }}
      />
      {/* Inner Pin Dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-2.5 h-2.5 bg-emergency rounded-full pointer-events-none z-[10000] mix-blend-difference"
        style={{
          transform: 'translate(-50%, -50%)',
          willChange: 'transform',
        }}
      />
    </div>
  );
};
