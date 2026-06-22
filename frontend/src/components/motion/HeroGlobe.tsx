import React, { useEffect, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';

interface GlobePoint {
  name: string;
  lat: number;
  lng: number;
  type: 'hospital' | 'donor' | 'patient';
  color: string;
  size: number;
}

interface GlobeArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string | string[];
}

const CITIES: GlobePoint[] = [
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873, type: 'patient', color: '#DC2626', size: 0.15 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777, type: 'hospital', color: '#00F0FF', size: 0.08 },
  { name: 'Delhi', lat: 28.6139, lng: 77.2090, type: 'donor', color: '#F59E0B', size: 0.06 },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946, type: 'hospital', color: '#00F0FF', size: 0.08 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707, type: 'donor', color: '#F59E0B', size: 0.06 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639, type: 'hospital', color: '#00F0FF', size: 0.08 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867, type: 'donor', color: '#F59E0B', size: 0.06 },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714, type: 'hospital', color: '#00F0FF', size: 0.08 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567, type: 'donor', color: '#F59E0B', size: 0.06 },
  { name: 'Surat', lat: 21.1702, lng: 72.8311, type: 'donor', color: '#F59E0B', size: 0.06 },
  { name: 'Lucknow', lat: 26.8467, lng: 80.9462, type: 'hospital', color: '#00F0FF', size: 0.08 },
  { name: 'Patna', lat: 25.5941, lng: 85.1376, type: 'donor', color: '#F59E0B', size: 0.06 },
  { name: 'Bhopal', lat: 23.2599, lng: 77.4126, type: 'hospital', color: '#00F0FF', size: 0.08 },
  { name: 'Guwahati', lat: 26.1158, lng: 91.7086, type: 'donor', color: '#F59E0B', size: 0.06 },
  { name: 'Kochi', lat: 9.9312, lng: 76.2673, type: 'donor', color: '#F59E0B', size: 0.06 }
];

const RINGS_DATA = [
  {
    lat: 26.9124,
    lng: 75.7873, // Jaipur
    maxRadius: 12,
    propagationSpeed: 2.8,
    repeatNum: 3
  }
];

export default function HeroGlobe() {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [inView, setInView] = useState(true);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const targetTilt = useRef({ x: 0, y: 0 });
  const [activeArcs, setActiveArcs] = useState<GlobeArc[]>([]);

  // 1. Measure and update container dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 2. Track element visibility in viewport
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
    }, { threshold: 0.05 });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 3. Mouse Parallax Tilt Lerping
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX - innerWidth / 2) / (innerWidth / 2); // -1 to 1
      const y = (e.clientY - innerHeight / 2) / (innerHeight / 2); // -1 to 1
      targetTilt.current = { x: x * 8, y: -y * 8 }; // Max 8 degrees tilt
    };

    window.addEventListener('mousemove', handleMouseMove);

    let animId: number;
    const update = () => {
      setTilt(prev => ({
        x: prev.x + (targetTilt.current.x - prev.x) * 0.06, // Smooth lerp
        y: prev.y + (targetTilt.current.y - prev.y) * 0.06
      }));
      animId = requestAnimationFrame(update);
    };
    update();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  // 4. Real-time spawner for dispatch arcs
  useEffect(() => {
    // Generate initial set of arcs converging on Jaipur
    const nonPatients = CITIES.filter(c => c.type !== 'patient');
    const initialArcs = nonPatients.slice(0, 5).map(c => ({
      startLat: c.lat,
      startLng: c.lng,
      endLat: 26.9124,
      endLng: 75.7873,
      color: ['#DC2626', '#F59E0B']
    }));
    setActiveArcs(initialArcs);

    const interval = setInterval(() => {
      const randomCity = nonPatients[Math.floor(Math.random() * nonPatients.length)];
      const newArc = {
        startLat: randomCity.lat,
        startLng: randomCity.lng,
        endLat: 26.9124,
        endLng: 75.7873,
        color: ['#DC2626', '#F59E0B']
      };

      setActiveArcs(prev => {
        const next = [...prev, newArc];
        // Cap active arcs to keep visual tidy and performant
        if (next.length > 7) {
          next.shift();
        }
        return next;
      });
    }, 2200);

    return () => clearInterval(interval);
  }, []);

  // 5. Setup OrbitControls and focus India
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 20.5937, lng: 78.9629, altitude: 2.2 }, 0);

      const controls = globeRef.current.controls();
      if (controls) {
        controls.enableZoom = false;
        controls.enableRotate = false;
        controls.enablePan = false;
        controls.autoRotate = inView;
        controls.autoRotateSpeed = 0.5; // Auto rotate slowly
      }

      const renderer = globeRef.current.renderer();
      if (renderer) {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap DPR
      }
    }
  }, [dimensions, inView]);

  // Dark near-black / deep-crimson Phong material for moody feel
  const customMaterial = new THREE.MeshPhongMaterial({
    color: 0x070404,
    emissive: 0x030101,
    specular: 0x110303,
    shininess: 6
  });

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full z-0 overflow-hidden flex items-center justify-center pointer-events-none"
      style={{ perspective: '1000px' }}
    >
      <div
        style={{
          transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
          width: '100%',
          height: '100%'
        }}
      >
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={customMaterial}
          showAtmosphere={true}
          atmosphereColor="#DC2626"
          atmosphereAltitude={0.16}
          showGraticules={true}
          enablePointerInteraction={false} // pass through mouse events

          // Points
          pointsData={CITIES}
          pointLat="lat"
          pointLng="lng"
          pointColor="color"
          pointRadius="size"
          pointAltitude={0.015}
          pointsMerge={false}

          // Arcs
          arcsData={activeArcs}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor="color"
          arcDashLength={0.4}
          arcDashGap={0.9}
          arcDashAnimateTime={1400}
          arcAltitude={0.15}
          arcStroke={1.6}

          // Rings
          ringsData={RINGS_DATA}
          ringLat="lat"
          ringLng="lng"
          ringColor={() => (t: number) => `rgba(220, 38, 38, ${1 - t})`}
          ringMaxRadius="maxRadius"
          ringPropagationSpeed="propagationSpeed"
          ringRepeatNum="repeatNum"
        />
      </div>
    </div>
  );
}
