'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMemo, useRef, useEffect, useState } from 'react';

const N = 15000;      // particle count
const DT = 0.06;      // time step (doubled for faster movement)
const A  = 0.19;      // attractor parameter
const SCALE = 9.0;    // world space scaling

function AutoRotateCamera() {
  useFrame(({ camera, clock }) => {
    // Slow auto-rotation around Y axis
    const time = clock.getElapsedTime();
    const radius = 90;
    camera.position.x = Math.sin(time * 0.1) * radius;
    camera.position.z = Math.cos(time * 0.1) * radius;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function FPSCounter({ setFps }: { setFps: (fps: number) => void }) {
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useFrame(() => {
    frameCount.current++;
    
    const now = performance.now();
    const delta = now - lastTime.current;
    
    // Update FPS every 500ms
    if (delta >= 500) {
      const currentFps = Math.round((frameCount.current / delta) * 1000);
      setFps(currentFps);
      frameCount.current = 0;
      lastTime.current = now;
    }
  });

  return null; // This component doesn't render anything in 3D
}

function ThomasPoints() {
  // Simulation state (unscaled) we integrate in-place
  const sim = useMemo(() => {
    const p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      p[3*i+0] = (Math.random() - 0.5) * 2.0;
      p[3*i+1] = (Math.random() - 0.5) * 2.0;
      p[3*i+2] = (Math.random() - 0.5) * 2.0;
    }
    return p;
  }, []);

  // Display buffer (scaled to world units) bound to the geometry
  const display = useMemo(() => {
    const d = new Float32Array(sim.length);
    // Initialize display with scaled sim positions so geometry has data from the start
    for (let i = 0; i < N; i++) {
      d[3*i+0] = sim[3*i+0] * SCALE;
      d[3*i+1] = sim[3*i+1] * SCALE;
      d[3*i+2] = sim[3*i+2] * SCALE;
    }
    return d;
  }, [sim]);
  const geomRef = useRef<THREE.BufferGeometry>(null!);

  useEffect(() => {
    if (geomRef.current && !geomRef.current.attributes.position) {
      // CRITICAL: Create BufferAttribute imperatively to ensure count is set correctly
      // R3F's declarative approach sometimes fails to infer count from array length
      const posAttr = new THREE.BufferAttribute(display, 3);
      posAttr.usage = THREE.DynamicDrawUsage;
      geomRef.current.setAttribute('position', posAttr);
    }
  }, [display]);

  // Render-time integration
  useFrame(() => {
    for (let i = 0; i < N; i++) {
      const ix = 3*i, iy = ix+1, iz = ix+2;
      const x = sim[ix], y = sim[iy], z = sim[iz];

      const dx = (-A * x + Math.sin(y)) * DT;
      const dy = (-A * y + Math.sin(z)) * DT;
      const dz = (-A * z + Math.sin(x)) * DT;

      let nx = x + dx, ny = y + dy, nz = z + dz;

      // very gentle bounding
      const r2 = nx*nx + ny*ny + nz*nz;
      if (r2 > 1600.0) { nx *= 0.96; ny *= 0.96; nz *= 0.96; }

      sim[ix] = nx; sim[iy] = ny; sim[iz] = nz;

      display[ix] = nx * SCALE;
      display[iy] = ny * SCALE;
      display[iz] = nz * SCALE;
    }
    
    if (geomRef.current?.attributes?.position) {
      geomRef.current.attributes.position.needsUpdate = true;
    }
  });

  const dpr = (typeof window !== 'undefined' ? window.devicePixelRatio : 1);

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geomRef} />
      <pointsMaterial
        size={1.6 * dpr}         // Nice small particles
        sizeAttenuation={false}
        depthWrite={false}
        transparent
        opacity={0.75}
        blending={THREE.AdditiveBlending}  // Glowy!
        color={new THREE.Color(0.80, 0.95, 1.00)}  // Light cyan/blue
      />
    </points>
  );
}

export default function AttractorSimpleCPU() {
  const [fps, setFps] = useState(60);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      {/* FPS Counter */}
      <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
        <div className="bg-black/50 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/10">
          <div className="flex items-center gap-2">
            <div className="text-xs font-mono text-white/70">FPS</div>
            <div className={`text-lg font-mono font-bold ${
              fps >= 55 ? 'text-green-400' :
              fps >= 30 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {fps}
            </div>
          </div>
        </div>
      </div>
      
      <Canvas
        dpr={[1, 2]}
        gl={{ alpha: false, antialias: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 1)}
        camera={{ position: [0, 0, 90], fov: 55 }}
      >
        {/* Auto-rotating camera - no manual controls */}
        <AutoRotateCamera />
        
        <FPSCounter setFps={setFps} />
        <ThomasPoints />
      </Canvas>
    </div>
  );
}

