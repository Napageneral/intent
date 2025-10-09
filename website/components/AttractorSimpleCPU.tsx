'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useMemo, useRef, useEffect } from 'react';

const N = 15000;      // particle count
const DT = 0.015;     // time step
const A  = 0.19;      // attractor parameter
const SCALE = 9.0;    // world space scaling

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
    if (geomRef.current) {
      // CRITICAL: R3F sometimes doesn't set count properly on declarative BufferAttribute
      // We must set it manually to the actual particle count
      const posAttr = geomRef.current.attributes.position;
      if (posAttr && posAttr.count === 0) {
        posAttr.count = N;
      }
    }
  }, []);

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
      <bufferGeometry ref={geomRef}>
        <bufferAttribute
          attach="attributes-position"
          array={display}
          itemSize={3}
          usage={THREE.DynamicDrawUsage}
        />
      </bufferGeometry>
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

  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        dpr={[1, 2]}
        gl={{ alpha: false, antialias: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 1)}
        camera={{ position: [0, 0, 90], fov: 55 }}
      >
        {/* Camera controls - auto-rotate + manual orbit */}
        <OrbitControls
          autoRotate
          autoRotateSpeed={0.5}
          enableDamping
          dampingFactor={0.05}
          enableZoom={false}        // Disable zoom - user needs to scroll page
          enablePan={false}         // Disable panning
          target={[0, 0, 0]}
        />
        
        <ThomasPoints />
      </Canvas>
    </div>
  );
}

