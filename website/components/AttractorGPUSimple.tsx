'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useMemo, useRef, useEffect, useState } from 'react';

const SIZE = 250;     // 250×250 = 62,500 particles
const DT = 0.06;      // time step (same as CPU version)
const A  = 0.19;      // attractor parameter
const SCALE = 9.0;    // world space scaling

function FPSCounter({ setFps }: { setFps: (fps: number) => void }) {
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useFrame(() => {
    frameCount.current++;
    const now = performance.now();
    const delta = now - lastTime.current;
    if (delta >= 500) {
      const currentFps = Math.round((frameCount.current / delta) * 1000);
      setFps(currentFps);
      frameCount.current = 0;
      lastTime.current = now;
    }
  });

  return null;
}

function AutoRotateCamera() {
  useFrame(({ camera, clock }) => {
    const time = clock.getElapsedTime();
    const radius = 90;
    camera.position.x = Math.sin(time * 0.1) * radius;
    camera.position.z = Math.cos(time * 0.1) * radius;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// GPU Compute shaders
const computeVert = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const computeFrag = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPositions;
  uniform float uA;
  uniform float uDT;
  
  void main() {
    vec3 p = texture2D(uPositions, vUv).xyz;
    
    // Thomas attractor equations
    vec3 d = vec3(
      -uA * p.x + sin(p.y),
      -uA * p.y + sin(p.z),
      -uA * p.z + sin(p.x)
    ) * uDT;
    
    p += d;
    
    // Soft boundary
    float r = length(p);
    if (r > 40.0) p *= 0.96;
    
    gl_FragColor = vec4(p, 1.0);
  }
`;

function ThomasPointsGPU() {
  const { gl } = useThree();
  
  // Create initial positions texture
  const initialPositions = useMemo(() => {
    const data = new Float32Array(SIZE * SIZE * 4);
    let i = 0;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++, i += 4) {
        data[i + 0] = (Math.random() - 0.5) * 2.0;
        data[i + 1] = (Math.random() - 0.5) * 2.0;
        data[i + 2] = (Math.random() - 0.5) * 2.0;
        data[i + 3] = 1.0;
      }
    }
    const tex = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat, THREE.FloatType);
    tex.needsUpdate = true;
    return tex;
  }, []);

  // Ping-pong FBOs for position compute
  const posPing = useMemo(() => {
    const rt = new THREE.WebGLRenderTarget(SIZE, SIZE, {
      type: THREE.FloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false,
      stencilBuffer: false
    });
    return rt;
  }, []);

  const posPong = useMemo(() => {
    const rt = new THREE.WebGLRenderTarget(SIZE, SIZE, {
      type: THREE.FloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false,
      stencilBuffer: false
    });
    return rt;
  }, []);

  // Compute scene and material
  const computeScene = useMemo(() => new THREE.Scene(), []);
  const computeCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  
  const computeMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uPositions: { value: initialPositions },
      uA: { value: A },
      uDT: { value: DT }
    },
    vertexShader: computeVert,
    fragmentShader: computeFrag,
    depthTest: false,
    depthWrite: false
  }), [initialPositions]);

  const computeQuad = useMemo(() => new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    computeMaterial
  ), [computeMaterial]);

  useEffect(() => {
    computeScene.add(computeQuad);
    return () => { computeScene.remove(computeQuad); };
  }, [computeScene, computeQuad]);

  // Display geometry - points that read from position texture
  const pointsGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(SIZE * SIZE * 3);
    const refs = new Float32Array(SIZE * SIZE * 2);
    
    let i = 0;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        // Dummy position (will be overridden by shader)
        positions[i * 3 + 0] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
        
        // UV reference to position texture
        refs[i * 2 + 0] = (x + 0.5) / SIZE;
        refs[i * 2 + 1] = (y + 0.5) / SIZE;
        
        i++;
      }
    }
    
    const posAttr = new THREE.BufferAttribute(positions, 3);
    const refAttr = new THREE.BufferAttribute(refs, 2);
    
    g.setAttribute('position', posAttr);
    g.setAttribute('aRef', refAttr);
    
    return g;
  }, []);

  const pointsMaterial = useMemo(() => {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    
    return new THREE.ShaderMaterial({
      uniforms: {
        uPositions: { value: initialPositions },
        uScale: { value: SCALE }
      },
      vertexShader: /* glsl */`
        uniform sampler2D uPositions;
        uniform float uScale;
        attribute vec2 aRef;
        
        void main() {
          vec3 pos = texture2D(uPositions, aRef).xyz * uScale;
          gl_PointSize = ${(1.6 * dpr).toFixed(1)};
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        precision highp float;
        
        void main() {
          vec2 pc = gl_PointCoord * 2.0 - 1.0;
          float d2 = dot(pc, pc);
          if (d2 > 1.0) discard;
          
          float gaussian = exp(-5.0 * d2);
          vec3 color = vec3(0.80, 0.95, 1.00);
          float alpha = gaussian * 0.75;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false
    });
  }, [initialPositions]);

  const posFlip = useRef(false);
  const initialized = useRef(false);
  const frameCount = useRef(0);

  useFrame(() => {
    // Wait for compute scene to be populated
    if (computeScene.children.length === 0) {
      frameCount.current++;
      return;
    }

    // Initialize first frame
    if (!initialized.current) {
      computeMaterial.uniforms.uPositions.value = initialPositions;
      gl.setRenderTarget(posPing);
      gl.clear();
      gl.render(computeScene, computeCamera);
      gl.setRenderTarget(null);
      posFlip.current = true;
      initialized.current = true;
    }

    // Compute next positions
    const posRead = posFlip.current ? posPing : posPong;
    const posWrite = posFlip.current ? posPong : posPing;

    computeMaterial.uniforms.uPositions.value = posRead.texture;
    gl.setRenderTarget(posWrite);
    gl.clear();
    gl.render(computeScene, computeCamera);
    gl.setRenderTarget(null);

    // Update points material to read from latest positions
    pointsMaterial.uniforms.uPositions.value = posWrite.texture;

    posFlip.current = !posFlip.current;
    frameCount.current++;
  });

  return (
    <points frustumCulled={false}>
      <primitive object={pointsGeom} />
      <primitive object={pointsMaterial} />
    </points>
  );
}

export default function AttractorGPUSimple() {
  const [fps, setFps] = useState(60);

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
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
        <AutoRotateCamera />
        <FPSCounter setFps={setFps} />
        <ThomasPointsGPU />
      </Canvas>
    </div>
  );
}

