'use client';

import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { useMemo } from 'react';

export default function FullScreenBG() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            // We feed a 2x2 plane, so this covers the whole screen in clip-space.
            gl_Position = vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          precision highp float;
          varying vec2 vUv;
          void main() {
            // black background
            vec3 bg = vec3(0.0);

            // ~1px border using UV edge distance
            float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
            // fwidth gives a pixel-ish width independent of resolution
            float w = fwidth(edge) + 1e-6;
            float border = smoothstep(0.006 + w, 0.006, edge);

            vec3 color = mix(bg, vec3(1.0, 0.95, 0.15), border);
            gl_FragColor = vec4(color, 1.0);
          }
        `,
        depthTest: false,
        depthWrite: false
      }),
    []
  );

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <Canvas
        dpr={[1, 2]}
        gl={{ alpha: false, antialias: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 1)}
        frameloop="demand" // one and done
      >
        {/* IMPORTANT: 2x2 plane + clip-space vertex shader above */}
        <mesh>
          <planeGeometry args={[2, 2]} />
          <primitive object={material} />
        </mesh>
      </Canvas>
    </div>
  );
}

