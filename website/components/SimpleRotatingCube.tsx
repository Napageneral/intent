'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMemo, useRef, useEffect } from 'react';

function DebugBorder() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          precision highp float;
          varying vec2 vUv;
          void main() {
            // Calculate edge distance
            float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
            float w = fwidth(edge) + 1e-6;
            float border = smoothstep(0.006 + w, 0.006, edge);
            
            // Yellow border, but TRANSPARENT in the center!
            vec3 color = vec3(1.0, 0.95, 0.15);
            float alpha = border;  // Only show border, rest is transparent
            
            gl_FragColor = vec4(color, alpha);
          }
        `,
        depthTest: false,
        depthWrite: false,
        transparent: true
      }),
    []
  );

  return (
    <mesh renderOrder={1000}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} />
    </mesh>
  );
}

function RotatingCube() {
  const meshRef = useRef<THREE.Mesh>(null!);

  useEffect(() => {
    console.log('🧊 RotatingCube mounted');
  }, []);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.7;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <boxGeometry args={[10, 10, 10]} />
      <meshBasicMaterial color={0xff0000} wireframe />
    </mesh>
  );
}

export default function SimpleRotatingCube() {
  useEffect(() => {
    console.log('🚀 SimpleRotatingCube component mounted');
  }, []);

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <Canvas
        dpr={[1, 2]}
        gl={{ alpha: false, antialias: false, powerPreference: 'high-performance' }}
        onCreated={({ gl, camera }) => {
          console.log('🎨 Canvas created!');
          console.log('📹 Camera:', camera);
          console.log('📹 Camera position:', camera.position);
          console.log('📹 Camera quaternion:', camera.quaternion);
          gl.setClearColor(0x000000, 1);
        }}
        camera={{ position: [0, 0, 30], fov: 75 }}
      >
        {/* Debug border to verify viewport */}
        <DebugBorder />
        
        {/* Simple rotating cube */}
        <RotatingCube />
      </Canvas>
    </div>
  );
}

