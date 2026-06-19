import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { gsap, ScrollTrigger } from '../../lib/gsap-setup';

/**
 * Three.js particle heart canvas — renders ~1500 floating particles
 * in a breathing heart/pulse formation with amber-crimson glow.
 * Scroll-reactive: particles disperse as user scrolls down the hero.
 */
export const HeroScene: React.FC<{ className?: string }> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    particles: THREE.Points;
    originalPositions: Float32Array;
    animationId: number;
    scrollProgress: { value: number };
    breathe: { value: number };
  } | null>(null);

  const initScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 4;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    // Generate heart-shaped particle positions
    const PARTICLE_COUNT = 1500;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const originalPositions = new Float32Array(PARTICLE_COUNT * 3);

    const crimson = new THREE.Color('#DC2626');
    const amber = new THREE.Color('#F59E0B');
    const warmWhite = new THREE.Color('#FEF3C7');

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // Parametric heart shape with randomization
      const t = Math.random() * Math.PI * 2;
      const heartX = 16 * Math.pow(Math.sin(t), 3);
      const heartY = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);

      // Scale down and add noise
      const scale = 0.08;
      const noise = 0.4 + Math.random() * 0.6;
      positions[i3] = heartX * scale * noise + (Math.random() - 0.5) * 0.8;
      positions[i3 + 1] = heartY * scale * noise + (Math.random() - 0.5) * 0.8 + 0.3;
      positions[i3 + 2] = (Math.random() - 0.5) * 1.5;

      // Store original positions for scroll-based dispersion
      originalPositions[i3] = positions[i3];
      originalPositions[i3 + 1] = positions[i3 + 1];
      originalPositions[i3 + 2] = positions[i3 + 2];

      // Color: mix between crimson, amber, and warm white
      const colorChoice = Math.random();
      let color: THREE.Color;
      if (colorChoice < 0.4) {
        color = crimson.clone().lerp(amber, Math.random());
      } else if (colorChoice < 0.75) {
        color = amber.clone().lerp(warmWhite, Math.random() * 0.5);
      } else {
        color = warmWhite.clone();
      }
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = Math.random() * 4 + 1.5;
    }

    // Geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Shader material for soft glowing particles
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float uTime;
        uniform float uPixelRatio;

        void main() {
          vColor = color;
          vec3 pos = position;

          // Subtle floating motion
          pos.y += sin(uTime * 0.5 + position.x * 2.0) * 0.03;
          pos.x += cos(uTime * 0.3 + position.y * 1.5) * 0.02;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * uPixelRatio * (1.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          // Soft circular particle with glow falloff
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          alpha *= 0.7;

          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    const scrollProgress = { value: 0 };
    const breathe = { value: 0 };

    sceneRef.current = {
      scene,
      camera,
      renderer,
      particles,
      originalPositions,
      animationId: 0,
      scrollProgress,
      breathe,
    };

    // Breathing animation
    gsap.to(breathe, {
      value: 1,
      duration: 2.5,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    });

    // Scroll-based dispersion
    ScrollTrigger.create({
      trigger: canvas.parentElement,
      start: 'top top',
      end: 'bottom top',
      scrub: 1,
      onUpdate: (self) => {
        scrollProgress.value = self.progress;
      },
    });

    // Animation loop
    const clock = new THREE.Clock();
    const animate = () => {
      const ref = sceneRef.current;
      if (!ref) return;

      const elapsed = clock.getElapsedTime();
      (ref.particles.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;

      // Apply breathing + scroll dispersion
      const posAttr = ref.particles.geometry.attributes.position;
      const pos = posAttr.array as Float32Array;
      const orig = ref.originalPositions;
      const breathScale = 1 + ref.breathe.value * 0.06;
      const dispersal = ref.scrollProgress.value;

      for (let i = 0; i < pos.length; i += 3) {
        const dx = (Math.random() - 0.5) * dispersal * 8;
        const dy = (Math.random() - 0.5) * dispersal * 8;
        const dz = (Math.random() - 0.5) * dispersal * 4;

        pos[i] = orig[i] * breathScale + dx * dispersal;
        pos[i + 1] = orig[i + 1] * breathScale + dy * dispersal;
        pos[i + 2] = orig[i + 2] + dz * dispersal;
      }
      posAttr.needsUpdate = true;

      // Subtle rotation
      ref.particles.rotation.y = elapsed * 0.05;
      ref.particles.rotation.z = Math.sin(elapsed * 0.2) * 0.02;

      // Fade out on scroll
      (ref.particles.material as THREE.ShaderMaterial).opacity = 1 - dispersal * 0.8;

      ref.renderer.render(ref.scene, ref.camera);
      ref.animationId = requestAnimationFrame(animate);
    };

    animate();
  }, []);

  // Handle resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    initScene();

    const handleResize = () => {
      const ref = sceneRef.current;
      if (!ref || !canvas) return;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      ref.camera.aspect = width / height;
      ref.camera.updateProjectionMatrix();
      ref.renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      const ref = sceneRef.current;
      if (ref) {
        cancelAnimationFrame(ref.animationId);
        ref.renderer.dispose();
        ref.particles.geometry.dispose();
        (ref.particles.material as THREE.ShaderMaterial).dispose();
      }
    };
  }, [initScene]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
    />
  );
};
