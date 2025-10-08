'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useMemo, useRef, useState, useEffect } from 'react';
import { useScroll, useSpring } from 'framer-motion';

const SIZE = 250; // 250×250 = 62,500 particles (matches reference)
const DT = 0.015;
const START_A = 0.19; // Thomas attractor parameter
const END_A = 0.21;   // More stable when scrolled

type ColorMode = 'solid' | 'radius' | 'angular';

function makeInitialPositions() {
  const data = new Float32Array(SIZE * SIZE * 4);
  const scale = 10.0; // 10x larger attractor for ultra-fine particle appearance
  let i = 0;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++, i += 4) {
      // Random cube initialization, scaled up
      data[i + 0] = (Math.random() - 0.5) * 2 * scale;
      data[i + 1] = (Math.random() - 0.5) * 2 * scale;
      data[i + 2] = (Math.random() - 0.5) * 2 * scale;
      data[i + 3] = 1.0;
    }
  }
  const tex = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat, THREE.FloatType);
  tex.needsUpdate = true;
  return tex;
}

// Compute shader: Thomas attractor (exact reference equations)
const computeFrag = `
precision highp float;
uniform sampler2D uPositions;
uniform float uA;
varying vec2 vUv;

void main() {
  vec3 pos = texture2D(uPositions, vUv).xyz;
  float dt = 0.015;
  float a = uA;
  float x = pos.x, y = pos.y, z = pos.z;
  
  // Thomas attractor equations (exact from reference)
  float dx = (-a*x + sin(y)) * dt;
  float dy = (-a*y + sin(z)) * dt;
  float dz = (-a*z + sin(x)) * dt;
  
  pos += vec3(dx, dy, dz);
  
  // Soft boundary (scaled for 10x larger attractor)
  float r = length(pos);
  if (r > 120.0) pos *= 0.95;
  
  gl_FragColor = vec4(pos, 1.0);
}
`;

const computeVert = `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// Render shader with color modes
const renderVert = `
uniform sampler2D uPositions;
uniform float uPointSize;
attribute vec2 aRef;
varying vec3 vPos;
varying vec3 vColor;
uniform int uColorMode; // 0=solid, 1=radius, 2=angular

// Solid: gold/yellow
vec3 solidColor() {
  return vec3(1.0, 0.843, 0.0);
}

// Radius: color based on distance from origin
vec3 radiusColor(vec3 pos) {
  float r = length(pos);
  float t = clamp(r / 100.0, 0.0, 1.0); // Adjusted for 10x larger attractor
  // Blue to cyan to white gradient
  vec3 near = vec3(0.2, 0.4, 1.0);   // blue
  vec3 mid = vec3(0.3, 0.8, 1.0);    // cyan
  vec3 far = vec3(0.9, 0.95, 1.0);   // near white
  
  if (t < 0.5) {
    return mix(near, mid, t * 2.0);
  } else {
    return mix(mid, far, (t - 0.5) * 2.0);
  }
}

// Angular: color based on angle
vec3 angularColor(vec3 pos) {
  float angle = atan(pos.y, pos.x) / 3.14159265359; // -1 to 1
  float t = (angle + 1.0) * 0.5; // 0 to 1
  
  // HSV-like rainbow
  vec3 c1 = vec3(1.0, 0.2, 0.2); // red
  vec3 c2 = vec3(1.0, 1.0, 0.2); // yellow
  vec3 c3 = vec3(0.2, 1.0, 0.2); // green
  vec3 c4 = vec3(0.2, 0.2, 1.0); // blue
  
  if (t < 0.33) {
    return mix(c1, c2, t * 3.0);
  } else if (t < 0.66) {
    return mix(c2, c3, (t - 0.33) * 3.0);
  } else {
    return mix(c3, c4, (t - 0.66) * 3.0);
  }
}

void main() {
  vec3 pos = texture2D(uPositions, aRef).xyz;
  vPos = pos;
  
  // Select color mode
  if (uColorMode == 1) {
    vColor = radiusColor(pos);
  } else if (uColorMode == 2) {
    vColor = angularColor(pos);
  } else {
    vColor = solidColor();
  }
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  
  // Particle size with distance attenuation
  gl_PointSize = uPointSize * (200.0 / -mvPosition.z);
}
`;

const renderFrag = `
varying vec3 vColor;
void main() {
  vec2 pc = gl_PointCoord * 2.0 - 1.0;
  float d = dot(pc, pc);
  if (d > 1.0) discard;
  
  float alpha = smoothstep(1.0, 0.2, d);
  gl_FragColor = vec4(vColor, alpha * 0.7);
}
`;

function AttractorPoints({ coherence, colorMode }: { coherence: number; colorMode: ColorMode }) {
  const { gl } = useThree();
  const initialTex = useMemo(makeInitialPositions, []);
  
  // Create FBOs
  const pingPong = useMemo(() => {
    const rtOptions = {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      stencilBuffer: false,
      depthBuffer: false
    };
    return {
      ping: new THREE.WebGLRenderTarget(SIZE, SIZE, rtOptions),
      pong: new THREE.WebGLRenderTarget(SIZE, SIZE, rtOptions),
      flip: false
    };
  }, []);
  
  // Compute scene
  const computeScene = useMemo(() => {
    const scene = new THREE.Scene();
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPositions: { value: initialTex },
        uA: { value: START_A }
      },
      vertexShader: computeVert,
      fragmentShader: computeFrag
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);
    return { scene, material };
  }, [initialTex]);
  
  const orthoCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  
  // Points geometry
  const pointsGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const refs = new Float32Array(SIZE * SIZE * 2);
    const positions = new Float32Array(SIZE * SIZE * 3);
    
    let i = 0;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++, i += 2) {
        refs[i + 0] = (x + 0.5) / SIZE;
        refs[i + 1] = (y + 0.5) / SIZE;
      }
    }
    
    geo.setAttribute('aRef', new THREE.BufferAttribute(refs, 2));
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);
  
  const pointsMaterial = useMemo(() => {
    const colorModeInt = colorMode === 'solid' ? 0 : colorMode === 'radius' ? 1 : 2;
    return new THREE.ShaderMaterial({
      uniforms: {
        uPositions: { value: initialTex },
        uPointSize: { value: 1.5 }, // Slightly larger since camera is farther back
        uColorMode: { value: colorModeInt }
      },
      vertexShader: renderVert,
      fragmentShader: renderFrag,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
  }, [initialTex, colorMode]);
  
  const initialized = useRef(false);
  
  useFrame(() => {
    const a = THREE.MathUtils.lerp(START_A, END_A, coherence);
    computeScene.material.uniforms.uA.value = a;
    
    // Initialize on first frame
    if (!initialized.current) {
      computeScene.material.uniforms.uPositions.value = initialTex;
      gl.setRenderTarget(pingPong.ping);
      gl.render(computeScene.scene, orthoCamera);
      gl.setRenderTarget(null);
      initialized.current = true;
    }
    
    // Ping-pong update
    const current = pingPong.flip ? pingPong.pong : pingPong.ping;
    const next = pingPong.flip ? pingPong.ping : pingPong.pong;
    
    computeScene.material.uniforms.uPositions.value = current.texture;
    gl.setRenderTarget(next);
    gl.clear();
    gl.render(computeScene.scene, orthoCamera);
    gl.setRenderTarget(null);
    
    pingPong.flip = !pingPong.flip;
    
    // Update points material
    pointsMaterial.uniforms.uPositions.value = next.texture;
  });
  
  return <points geometry={pointsGeometry} material={pointsMaterial} frustumCulled={false} />;
}

function CameraController() {
  const { camera } = useThree();
  const time = useRef(0);
  
  useFrame(({ pointer }, delta) => {
    time.current += delta;
    
    // Subtle auto-rotation (like reference)
    const autoRotateSpeed = 0.05;
    const angle = time.current * autoRotateSpeed;
    
    // Mix auto-rotation with mouse parallax (scaled for 10x larger scene)
    const ease = 0.05;
    const radius = 50; // Much larger orbit for 10x attractor
    const baseZ = 60; // Camera very far back for 10x scale
    const x = Math.sin(angle) * radius * 0.3 + pointer.x * 1.5;
    const y = -pointer.y * 1.2;
    const z = Math.cos(angle) * radius * 0.3 + baseZ;
    
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, x, ease);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, y, ease);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, z, ease);
    camera.lookAt(0, 0, 0);
  });
  
  return null;
}

export default function AttractorHero() {
  const { scrollYProgress } = useScroll();
  const [coherence, setCoherence] = useState(0);
  const [colorMode] = useState<ColorMode>('radius'); // Use radius mode like reference
  const spring = useSpring(0, { stiffness: 60, damping: 20, mass: 0.6 });
  
  useEffect(() => {
    const unsub = scrollYProgress.on('change', (v) => spring.set(Math.min(1, v * 1.5)));
    const unsub2 = spring.on('change', (v) => setCoherence(v));
    return () => {
      unsub();
      unsub2();
    };
  }, [scrollYProgress, spring]);
  
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-black">
      {/* Canvas background */}
      <div className="absolute inset-0 z-0">
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, 60], fov: 50 }}
          gl={{ 
            powerPreference: 'high-performance',
            antialias: false,
            alpha: false
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <CameraController />
          <AttractorPoints coherence={coherence} colorMode={colorMode} />
        </Canvas>
      </div>
      
      {/* Bottom CTA row */}
      <div className="absolute bottom-16 left-0 right-0 z-10">
        <div className="container-px max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-12">
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-bold mb-1" style={{ color: '#FFFFFF' }}>
                Your <span className="text-yellow-400">AI transformation</span> partner.
              </h2>
              <p className="text-base md:text-lg" style={{ color: '#E5E5E5' }}>
                We set & execute your enterprise AI strategy at startup speed.
              </p>
            </div>
            
            <div className="hidden md:block h-px flex-1 bg-white/20 max-w-xs"></div>
            
            <div className="flex-shrink-0">
              <a
                href="#approach"
                className="inline-flex items-center gap-2 bg-yellow-400 text-black px-8 py-4 font-semibold hover:bg-yellow-300 transition-all duration-300 group"
              >
                Learn more
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}