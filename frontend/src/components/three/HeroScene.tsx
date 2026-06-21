import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { gsap, ScrollTrigger } from '../../lib/gsap-setup';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Custom shader for chromatic aberration, film grain, and soft volumetric glow
const CustomPostShader = {
  uniforms: {
    tDiffuse: { value: null },
    uChromaticAberration: { value: 0.02 },
    uTime: { value: 0 },
    uGrainIntensity: { value: 0.03 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uChromaticAberration;
    uniform float uTime;
    uniform float uGrainIntensity;
    varying vec2 vUv;

    // Pseudo-random noise for grain
    float random(vec2 coords) {
      return fract(sin(dot(coords.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      
      // 1. Radial Chromatic Aberration
      vec2 distVec = uv - 0.5;
      float dist = length(distVec);
      float shift = uChromaticAberration * dist * dist;
      
      vec4 rCol = texture2D(tDiffuse, uv - distVec * shift);
      vec4 gCol = texture2D(tDiffuse, uv);
      vec4 bCol = texture2D(tDiffuse, uv + distVec * shift);
      
      vec4 color = vec4(rCol.r, gCol.g, bCol.b, gCol.a);
      
      // 2. Soft Atmospheric Glow (lightweight blurred blend)
      vec4 blur = vec4(0.0);
      float blurScale = 0.003;
      blur += texture2D(tDiffuse, uv + vec2(-1.0, -1.0) * blurScale);
      blur += texture2D(tDiffuse, uv + vec2(1.0, -1.0) * blurScale);
      blur += texture2D(tDiffuse, uv + vec2(-1.0, 1.0) * blurScale);
      blur += texture2D(tDiffuse, uv + vec2(1.0, 1.0) * blurScale);
      blur /= 4.0;
      
      color += max(blur - 0.1, 0.0) * 1.2;
      
      // Overall brightness boost
      color.rgb *= 1.4;
      
      // 3. Film Grain
      float noise = random(uv + vec2(sin(uTime * 0.1), cos(uTime * 0.1)));
      color.rgb += (noise - 0.5) * uGrainIntensity;
      
      gl_FragColor = color;
    }
  `
};

export const HeroScene: React.FC<{ className?: string; onLoaded?: () => void }> = ({ className = '', onLoaded }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Track parameters across rendering loop
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    composer: EffectComposer | null;
    particles: THREE.Points;
    originalPositions: Float32Array;
    scrollProgress: { value: number };
    breathe: { value: number };
    mouse: { x: number; y: number; targetX: number; targetY: number };
    tickHandler: (time: number) => void;
    clock: THREE.Clock;
    isMobile: boolean;
    reducedMotion: boolean;
  } | null>(null);

  const initScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 4.2;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    // Adaptive constraints based on device and user settings
    const isMobile = window.innerWidth < 768;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const PARTICLE_COUNT = isMobile ? 500 : 1500;

    // Heart coordinate generation logic
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const originalPositions = new Float32Array(PARTICLE_COUNT * 3);

    const crimson = new THREE.Color('#DC2626');
    const amber = new THREE.Color('#F59E0B');
    const warmWhite = new THREE.Color('#FEF3C7');

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const t = Math.random() * Math.PI * 2;
      const heartX = 16 * Math.pow(Math.sin(t), 3);
      const heartY = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);

      const scale = 0.08;
      const noise = 0.45 + Math.random() * 0.55;
      positions[i3] = heartX * scale * noise + (Math.random() - 0.5) * 0.7;
      positions[i3 + 1] = heartY * scale * noise + (Math.random() - 0.5) * 0.7 + 0.35;
      positions[i3 + 2] = (Math.random() - 0.5) * 1.5;

      originalPositions[i3] = positions[i3];
      originalPositions[i3 + 1] = positions[i3 + 1];
      originalPositions[i3 + 2] = positions[i3 + 2];

      const colorChoice = Math.random();
      let color: THREE.Color;
      if (colorChoice < 0.45) {
        color = crimson.clone().lerp(amber, Math.random());
      } else if (colorChoice < 0.8) {
        color = amber.clone().lerp(warmWhite, Math.random() * 0.4);
      } else {
        color = warmWhite.clone();
      }
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = Math.random() * (isMobile ? 3 : 5.5) + 1.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

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

          // Subtle spatial ambient sway
          pos.y += sin(uTime * 0.4 + position.x * 2.0) * 0.035;
          pos.x += cos(uTime * 0.25 + position.y * 1.5) * 0.025;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * uPixelRatio * (1.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          // Soft volumetric alpha falloff
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          alpha *= 1.3;

          gl_FragColor = vec4(vColor * 1.5, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Dynamic animation parameters
    const scrollProgress = { value: 0 };
    const breathe = { value: 0 };
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    // Post-processing setup (Disable on mobile or reduced motion for low overhead)
    let composer: EffectComposer | null = null;
    let customPass: ShaderPass | null = null;

    if (!isMobile && !reducedMotion) {
      composer = new EffectComposer(renderer);
      
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);

      customPass = new ShaderPass(CustomPostShader);
      customPass.uniforms.uChromaticAberration.value = 0.016;
      customPass.uniforms.uGrainIntensity.value = 0.035;
      composer.addPass(customPass);
    }

    // Pre-compile shaders in background for stutter-free scrolling
    renderer.compile(scene, camera);
    if (onLoaded) {
      setTimeout(onLoaded, 100);
    }

    // Scroll trigger setup
    const trigger = ScrollTrigger.create({
      trigger: canvas.parentElement,
      start: 'top top',
      end: 'bottom top',
      scrub: 0.8,
      onUpdate: (self) => {
        scrollProgress.value = self.progress;
      },
    });

    // Breathing loop using GSAP
    let breatheTween: gsap.core.Tween | null = null;
    if (!reducedMotion) {
      breatheTween = gsap.to(breathe, {
        value: 1,
        duration: 3,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });
    }

    const clock = new THREE.Clock();

    // Centralized single render tick handler registered directly to GSAP ticker
    const tickHandler = (time: number) => {
      const ref = sceneRef.current;
      if (!ref) return;

      const elapsed = clock.getElapsedTime();
      (ref.particles.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;

      // Apply dynamic parameters
      const posAttr = ref.particles.geometry.attributes.position;
      const pos = posAttr.array as Float32Array;
      const orig = ref.originalPositions;
      const breathScale = ref.reducedMotion ? 1 : (1 + ref.breathe.value * 0.05);
      const dispersal = ref.scrollProgress.value;

      // Elastic mouse hover coordinates interpolation
      if (!ref.reducedMotion && !ref.isMobile) {
        ref.mouse.x += (ref.mouse.targetX - ref.mouse.x) * 0.06;
        ref.mouse.y += (ref.mouse.targetY - ref.mouse.y) * 0.06;

        // Apply visual drift based on mouse coordinate & scroll offset
        ref.particles.rotation.y = elapsed * 0.04 + ref.mouse.x * 0.12;
        ref.particles.rotation.x = ref.mouse.y * 0.08;
      } else {
        ref.particles.rotation.y = elapsed * 0.02;
      }

      // Re-position particles relative to scroll dispersal progress
      for (let i = 0; i < pos.length; i += 3) {
        // High frequency particle dispersion factor
        const randX = (Math.sin(i + elapsed) * 0.5) * dispersal * 7.5;
        const randY = (Math.cos(i + elapsed) * 0.5) * dispersal * 7.5;
        const randZ = (Math.sin(i * 0.5 + elapsed) * 0.5) * dispersal * 4.5;

        pos[i] = orig[i] * breathScale + randX;
        pos[i + 1] = orig[i + 1] * breathScale + randY;
        pos[i + 2] = orig[i + 2] + randZ;
      }
      posAttr.needsUpdate = true;

      // Fade particles out gradually on scroll down
      (ref.particles.material as THREE.ShaderMaterial).opacity = 1 - dispersal * 0.85;

      // Render via Composer post-processing or direct WebGL renderer
      if (ref.composer) {
        if (customPass) {
          customPass.uniforms.uTime.value = elapsed;
        }
        ref.composer.render();
      } else {
        ref.renderer.render(ref.scene, ref.camera);
      }
    };

    // Add to unified GSAP requestAnimationFrame loop
    gsap.ticker.add(tickHandler);

    sceneRef.current = {
      scene,
      camera,
      renderer,
      composer,
      particles,
      originalPositions,
      scrollProgress,
      breathe,
      mouse,
      tickHandler,
      clock,
      isMobile,
      reducedMotion
    };

    // Track mouse inputs
    const handleMouseMove = (e: MouseEvent) => {
      const ref = sceneRef.current;
      if (!ref || ref.reducedMotion || ref.isMobile) return;
      ref.mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      ref.mouse.targetY = -(e.clientY / window.innerHeight - 0.5) * 2;
    };

    if (!isMobile && !reducedMotion) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    // Save triggers and tweens for clean disposal
    return () => {
      gsap.ticker.remove(tickHandler);
      window.removeEventListener('mousemove', handleMouseMove);
      trigger.kill();
      if (breatheTween) breatheTween.kill();
    };
  }, []);

  // Window resize and tab visibility management (Pause when hidden)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cleanupScene = initScene();

    const handleResize = () => {
      const ref = sceneRef.current;
      if (!ref || !canvas) return;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      ref.camera.aspect = width / height;
      ref.camera.updateProjectionMatrix();
      ref.renderer.setSize(width, height);
      if (ref.composer) {
        ref.composer.setSize(width, height);
      }
    };

    const handleVisibility = () => {
      const ref = sceneRef.current;
      if (!ref) return;
      
      // Pause ticker subscription if browser tab goes off-screen to prevent battery drain
      if (document.hidden) {
        gsap.ticker.remove(ref.tickHandler);
      } else {
        gsap.ticker.add(ref.tickHandler);
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (cleanupScene) cleanupScene();
      
      const ref = sceneRef.current;
      if (ref) {
        ref.renderer.dispose();
        ref.particles.geometry.dispose();
        (ref.particles.material as THREE.ShaderMaterial).dispose();
        if (ref.composer) {
          // Dispose postprocessing passes
          ref.composer.dispose();
        }
      }
      sceneRef.current = null;
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
