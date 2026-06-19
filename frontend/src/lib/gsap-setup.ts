import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins once at app startup
gsap.registerPlugin(ScrollTrigger);

// Default GSAP configuration for premium feel
gsap.defaults({
  ease: 'power3.out',
  duration: 1,
});

export { gsap, ScrollTrigger };
