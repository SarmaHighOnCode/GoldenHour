import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';

// Register GSAP plugins once at app startup
gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

// Default GSAP configuration for premium feel
gsap.defaults({
  ease: 'power3.out',
  duration: 1,
});

export { gsap, ScrollTrigger, MotionPathPlugin };
