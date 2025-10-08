'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { useMemo, useRef, useState, useEffect } from 'react';
import { useScroll, useSpring, motion } from 'framer-motion';

const SIZE = 256; // 256x256 = 65,536 particles
const DT = 0.015; // integration step
const START_A = 0.10; // more chaotic
const END_A = 0.21; // more stable

function makeInitialPositions() {
  // pack positions into RGBA32F texture
  const data = new Float32Array(SIZE * SIZE * 4);
  const strandId = new Float32Array(SIZE * SIZE); // 0,1,2 for color mapping
  let i = 0,
    j = 0;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++, i += 4, j++) {
      // three clusters: blue/gray/amber
      const cluster = j % 3;
      strandId[j] = cluster;

      const jitter = () => (Math.random() - 0.5) * 0.3;
      const baseX = cluster === 0 ? -2.5 : cluster === 1 ? -2.0 : -1.5;
      data[i + 0] = baseX + jitter();
      data[i + 1] = (Math.random() - 0.5) * 1.5; // y
      data[i + 2] = (Math.random() - 0.5) * 1.5; // z
      data[i + 3] = 1.0;
    }
  }
  const tex = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat, THREE.FloatType);
  tex.needsUpdate = true;
  return { tex, strandId };
}

// Fragment shader: update positions using Thomas attractor
const computeFragment = /* glsl */ `
precision highp float;
uniform sampler2D uPositions;
uniform float uDt;
uniform float uA;
varying vec2 vUv;

vec3 thomas(vec3 p, float a) {
  float x=p.x, y=p.y, z=p.z;
  float dx = (-a*x + sin(y));
  float dy = (-a*y + sin(z));
  float dz = (-a*z + sin(x));
  return vec3(dx,dy,dz) * uDt;
}

void main() {
  vec3 pos = texture2D(uPositions, vUv).xyz;
  vec3 dpos = thomas(pos, uA);
  pos += dpos;

  // Soft bounds: nudge back toward origin if far away
  float r = length(pos);
  if (r > 15.0) pos *= 0.92;

  gl_FragColor = vec4(pos, 1.0);
}
`;

const computeVertex = /* glsl */ `
precision highp float;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Render shader: each point samples its current position
const renderVertex = /* glsl */ `
precision highp float;
uniform sampler2D uPositions;
uniform float     uPointSize;
attribute vec2    aRef;
attribute float   aStrand;
varying vec3      vColor;

vec3 colorForStrand(float s) {
  // blue, gray, amber
  if (s < 0.5) return vec3(1.0, 0.843, 0.0);      // gold/yellow
  if (s < 1.5) return vec3(0.9, 0.9, 0.95);       // near white
  return vec3(1.0, 0.843, 0.0);                    // gold/yellow
}

void main() {
  vec3 pos = texture2D(uPositions, aRef).xyz;
  vColor = colorForStrand(aStrand);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uPointSize * (120.0 / -mv.z);
}
`;

const renderFragment = /* glsl */ `
precision highp float;
varying vec3 vColor;
void main() {
  // circular point sprite
  vec2 pc = gl_PointCoord * 2.0 - 1.0;
  float d = dot(pc, pc);
  if (d > 1.0) discard;
  float alpha = smoothstep(1.0, 0.3, d) * 0.6;
  gl_FragColor = vec4(vColor, alpha);
}
`;

function AttractorPoints({ coherence }: { coherence: number }) {
  const { gl, size } = useThree();
  const initial = useMemo(makeInitialPositions, []);
  const ping = useFBO(SIZE, SIZE, {
    type: THREE.FloatType,
    format: THREE.RGBAFormat,
    depthBuffer: false,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter
  });
  const pong = useFBO(SIZE, SIZE, {
    type: THREE.FloatType,
    format: THREE.RGBAFormat,
    depthBuffer: false,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter
  });

  const computeMat = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uPositions: { value: initial.tex },
        uDt: { value: DT },
        uA: { value: 0.16 }
      },
      vertexShader: computeVertex,
      fragmentShader: computeFragment
    });
    mat.depthTest = false;
    mat.depthWrite = false;
    return mat;
  }, [initial.tex]);

  // fullscreen compute scene
  const compScene = useMemo(() => {
    const s = new THREE.Scene();
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), computeMat);
    s.add(mesh);
    return s;
  }, [computeMat]);
  const compCam = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);

  // points geometry referencing tex coords
  const points = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const refs = new Float32Array(SIZE * SIZE * 2);
    const strands = new Float32Array(SIZE * SIZE);
    let i = 0,
      j = 0;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++, i += 2, j++) {
        refs[i + 0] = (x + 0.5) / SIZE;
        refs[i + 1] = (y + 0.5) / SIZE;
        strands[j] = j % 3;
      }
    }
    geo.setAttribute('aRef', new THREE.BufferAttribute(refs, 2));
    geo.setAttribute('aStrand', new THREE.BufferAttribute(strands, 1));
    return geo;
  }, []);

  const renderMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uPositions: { value: initial.tex },
          uPointSize: { value: 2.5 * Math.min(size.width, size.height) / 900 }
        },
        vertexShader: renderVertex,
        fragmentShader: renderFragment,
        transparent: true,
        depthTest: false,
        blending: THREE.AdditiveBlending
      }),
    [initial.tex, size]
  );

  // ping-pong targets
  const stateRef = useRef<{ read: THREE.WebGLRenderTarget; write: THREE.WebGLRenderTarget }>({
    read: ping,
    write: pong
  });

  useFrame(() => {
    // Map scroll coherence 0..1 to parameter 'a'
    const a = THREE.MathUtils.lerp(START_A, END_A, coherence);
    computeMat.uniforms.uA.value = a;

    // 1) compute next positions into write
    computeMat.uniforms.uPositions.value = stateRef.current.read.texture;
    gl.setRenderTarget(stateRef.current.write);
    gl.render(compScene, compCam);
    gl.setRenderTarget(null);

    // 2) swap
    const tmp = stateRef.current.read;
    stateRef.current.read = stateRef.current.write;
    stateRef.current.write = tmp;

    // 3) render points sampling latest positions
    renderMat.uniforms.uPositions.value = stateRef.current.read.texture;
  });

  return <points geometry={points} material={renderMat} />;
}

function CameraDrift() {
  const { camera } = useThree();
  useFrame(({ pointer }) => {
    const ease = 0.05;
    const tx = THREE.MathUtils.lerp(camera.position.x, pointer.x * 0.4, ease);
    const ty = THREE.MathUtils.lerp(camera.position.y, -pointer.y * 0.3, ease);
    camera.position.set(tx, ty, camera.position.z);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function AttractorHero() {
  // scroll → coherence control
  const { scrollYProgress } = useScroll();
  const [coherence, setCoherence] = useState(0);
  const spring = useSpring(0, { stiffness: 60, damping: 20, mass: 0.6 });

  useEffect(() => {
    const unsub = scrollYProgress.on('change', (v) => spring.set(Math.min(1, v * 2)));
    const unsub2 = spring.on('change', (v) => setCoherence(v));
    return () => {
      unsub();
      unsub2();
    };
  }, [scrollYProgress, spring]);

  return (
    <section className="relative isolate min-h-screen flex items-center overflow-hidden bg-black">
      {/* Canvas background */}
      <div className="absolute inset-0">
        <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 12], fov: 45 }}>
          <CameraDrift />
          <AttractorPoints coherence={coherence} />
        </Canvas>
      </div>

      {/* Hero content overlay */}
      <div className="relative z-10 container-px max-w-7xl mx-auto -mt-32">
        <h1
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white leading-[0.85] whitespace-nowrap text-center"
          style={{
            fontFamily: 'monospace',
            letterSpacing: '-0.02em',
            textShadow: '0 0 40px rgba(255,215,0,0.3)',
            color: '#FFFFFF',
            fontWeight: 900
          }}
        >
          Win the <span className="text-yellow-400" style={{ textShadow: '0 0 50px rgba(255,215,0,0.6)' }}>next decade</span>.
        </h1>
      </div>

      {/* Bottom CTA row */}
      <div className="absolute bottom-16 left-0 right-0 z-10">
        <div className="container-px max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-12">
            {/* Left: Tagline */}
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-bold mb-1" style={{ color: '#FFFFFF' }}>
                Your <span className="text-yellow-400">AI transformation</span> partner.
              </h2>
              <p className="text-base md:text-lg" style={{ color: '#E5E5E5' }}>
                We set & execute your enterprise AI strategy at startup speed.
              </p>
            </div>

            {/* Center: Divider */}
            <div className="hidden md:block h-px flex-1 bg-white/20 max-w-xs"></div>

            {/* Right: CTA */}
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
