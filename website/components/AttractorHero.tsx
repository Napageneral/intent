'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { useMemo, useRef, useState, useEffect } from 'react';
import { useScroll, useSpring } from 'framer-motion';

/** ====== Tunables ====== */
const SIZE = 250;                 // 250×250 = 62,500 particles
const DT = 0.015;
const START_A = 0.19;             // Thomas a (chaotic-ish)
const END_A   = 0.21;             // More coherent
const START_DECAY = 0.960;        // short trails during chaos
const END_DECAY   = 0.985;        // long trails once ordered
const POINT_SIZE_PX = 1.0;        // tiny for hairlines
const SCALE_ON_SCREEN = 10.0;     // make shape big without thickening
const BRIGHTNESS = 1.35;          // overall gain when compositing
/** ======================== */

type ColorMode = 'radius' | 'solid';

/** Seed positions (cube) */
function makeInitialPositionsTexture() {
  const data = new Float32Array(SIZE * SIZE * 4);
  const initSpread = 2.0 * SCALE_ON_SCREEN; // spawn wider if we scale later
  let i = 0;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++, i += 4) {
      data[i + 0] = (Math.random() - 0.5) * initSpread;
      data[i + 1] = (Math.random() - 0.5) * initSpread;
      data[i + 2] = (Math.random() - 0.5) * initSpread;
      data[i + 3] = 1.0;
    }
  }
  const tex = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat, THREE.FloatType);
  tex.needsUpdate = true;
  return tex;
}

/** ---------- Compute shaders (Thomas) ---------- */
const computeVert = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const computeFrag = /* glsl */`
  precision highp float;
  uniform sampler2D uPositions;
  uniform float uA;
  varying vec2 vUv;

  void main() {
    vec3 pos = texture2D(uPositions, vUv).xyz;
    float dt = ${DT.toFixed(6)};
    float a = uA;

    float dx = (-a*pos.x + sin(pos.y)) * dt;
    float dy = (-a*pos.y + sin(pos.z)) * dt;
    float dz = (-a*pos.z + sin(pos.x)) * dt;

    pos += vec3(dx, dy, dz);

    // gentle soft bounds
    float r = length(pos);
    if (r > 120.0) pos *= 0.96;

    gl_FragColor = vec4(pos, 1.0);
  }
`;

/** ---------- Points render (to pointsRT, then composited) ---------- */
const pointsVert = /* glsl */`
  uniform sampler2D uPositions;
  uniform float uPointSize;
  uniform float uScale;
  attribute vec2 aRef;
  varying vec3 vColor;

  // Blue → Cyan → White by radius
  vec3 radiusColor(vec3 p) {
    float r = clamp(length(p) / 100.0, 0.0, 1.0);
    vec3 near = vec3(0.20, 0.40, 1.00);
    vec3 mid  = vec3(0.30, 0.80, 1.00);
    vec3 far  = vec3(0.95, 0.98, 1.00);
    return r < 0.5 ? mix(near, mid, r*2.0) : mix(mid, far, (r-0.5)*2.0);
  }

  void main() {
    vec3 pos = texture2D(uPositions, aRef).xyz * uScale;
    vColor = radiusColor(pos);
    // No distance attenuation → truly hairline at any scale
    gl_PointSize = uPointSize;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const pointsFrag = /* glsl */`
  precision highp float;
  varying vec3 vColor;
  void main() {
    // circular sprite with Gaussian falloff
    vec2 pc = gl_PointCoord * 2.0 - 1.0;
    float d2 = dot(pc, pc);                 // r^2
    if (d2 > 1.0) discard;
    float gaussian = exp(-5.0 * d2);        // sharper core, soft feather
    gl_FragColor = vec4(vColor, gaussian * 0.08); // very low alpha, additive
  }
`;

/** ---------- Composite shaders (prev trails * decay + current points) ---------- */
const compositeVert = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const compositeFrag = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPrev;     // previous trails
  uniform sampler2D uCurrent;  // points of this frame
  uniform float uDecay;
  uniform float uGain;

  void main() {
    vec3 prev = texture2D(uPrev, vUv).rgb;
    vec3 curr = texture2D(uCurrent, vUv).rgb;
    // simple persistence + additive
    vec3 accum = uDecay * prev + uGain * curr;
    // mild soft clip to avoid blowout
    accum = min(accum, vec3(1.0));
    gl_FragColor = vec4(accum, 1.0);
  }
`;

/** ---------- Present (just blit trails texture) ---------- */
const presentFrag = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  void main() {
    vec3 c = texture2D(uTex, vUv).rgb;
    gl_FragColor = vec4(c, 1.0);
  }
`;

function AttractorLayer({ coherence }: { coherence: number }) {
  const { gl, size, camera, viewport } = useThree();

  /** 1) Compute ping‑pong for positions */
  const initialTex = useMemo(makeInitialPositionsTexture, []);
  const computeCam = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  const computeScene = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uPositions: { value: initialTex }, uA: { value: START_A } },
      vertexShader: computeVert, fragmentShader: computeFrag, depthTest: false, depthWrite: false
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    const scene = new THREE.Scene(); scene.add(mesh);
    return { scene, mat };
  }, [initialTex]);

  const posPing = useFBO(SIZE, SIZE, { type: THREE.FloatType, format: THREE.RGBAFormat, depthBuffer: false });
  const posPong = useFBO(SIZE, SIZE, { type: THREE.FloatType, format: THREE.RGBAFormat, depthBuffer: false });
  const posFlip = useRef(false);
  const posInitialized = useRef(false);

  /** 2) Points scene (offscreen) */
  const pointsScene = useMemo(() => new THREE.Scene(), []);
  const pointsRT = useFBO(size.width, size.height, {
    type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false
  });

  // geometry: references into positions tex
  const pointsGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const refs = new Float32Array(SIZE * SIZE * 2);
    let i = 0;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++, i += 2) {
        refs[i] = (x + 0.5) / SIZE;
        refs[i + 1] = (y + 0.5) / SIZE;
      }
    }
    g.setAttribute('aRef', new THREE.BufferAttribute(refs, 2));
    // dummy position (required by three)
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SIZE * SIZE * 3), 3));
    return g;
  }, []);

  const pointsMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uPositions: { value: initialTex },
      uPointSize: { value: POINT_SIZE_PX * (typeof (gl as any).getPixelRatio === 'function' ? (gl as any).getPixelRatio() : 1) },
      uScale: { value: SCALE_ON_SCREEN }
    },
    vertexShader: pointsVert,
    fragmentShader: pointsFrag,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    depthTest: false
  }), [initialTex, gl]);

  // add points mesh to its own scene once
  useEffect(() => {
    const mesh = new THREE.Points(pointsGeom, pointsMat);
    pointsScene.add(mesh);
    return () => {
      pointsScene.remove(mesh);
      pointsGeom.dispose();
      pointsMat.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 3) Trails ping‑pong (accumulation) + present quad */
  const trailsA = useFBO(size.width, size.height, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false });
  const trailsB = useFBO(size.width, size.height, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false });
  const trailsFlip = useRef(false);

  const compositeMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uPrev: { value: trailsA.texture }, uCurrent: { value: pointsRT.texture }, uDecay: { value: START_DECAY }, uGain: { value: BRIGHTNESS } },
    vertexShader: compositeVert, fragmentShader: compositeFrag, depthTest: false, depthWrite: false
  }), [pointsRT, trailsA]);

  const presentMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTex: { value: trailsA.texture } },
    vertexShader: compositeVert, fragmentShader: presentFrag, depthTest: false, depthWrite: false
  }), [trailsA]);

  // full‑screen plane in the *main* scene so R3F draws it for us
  const screenPlaneRef = useRef<THREE.Mesh>(null!);

  // ---------- Viewport helpers to fix clipping ----------
  const setForTarget = (rt: THREE.WebGLRenderTarget, clear = false) => {
    gl.setRenderTarget(rt);
    gl.setViewport(0, 0, rt.width, rt.height);
    gl.setScissor(0, 0, rt.width, rt.height);
    gl.setScissorTest(true);
    if (clear) gl.clear(true, true, true);
  };
  const resetToCanvas = () => {
    const dpr = typeof (gl as any).getPixelRatio === 'function' ? (gl as any).getPixelRatio() : (window.devicePixelRatio || 1);
    const W = Math.floor(size.width * dpr);
    const H = Math.floor(size.height * dpr);
    gl.setRenderTarget(null);
    gl.setViewport(0, 0, W, H);
    gl.setScissor(0, 0, W, H);
    gl.setScissorTest(false);
  };
  // ------------------------------------------------------

  useFrame(() => {
    // map scroll → coherence
    const a = THREE.MathUtils.lerp(START_A, END_A, coherence);
    const decay = THREE.MathUtils.lerp(START_DECAY, END_DECAY, coherence);
    computeScene.mat.uniforms.uA.value = a;
    compositeMat.uniforms.uDecay.value = decay;

    // initialization: seed one of the position buffers from initialTex
    if (!posInitialized.current) {
      computeScene.mat.uniforms.uPositions.value = initialTex;
      setForTarget(posPing, false);
      gl.render(computeScene.scene, computeCam);
      resetToCanvas();
      posFlip.current = true; // next read from posPing
      posInitialized.current = true;
    }

    // 1) advance positions into posNext
    const posRead = posFlip.current ? posPing : posPong;
    const posWrite = posFlip.current ? posPong : posPing;
    computeScene.mat.uniforms.uPositions.value = posRead.texture;
    setForTarget(posWrite, false);
    gl.render(computeScene.scene, computeCam);
    resetToCanvas();
    posFlip.current = !posFlip.current;

    // 2) render points (sampling latest positions) into pointsRT
    pointsMat.uniforms.uPositions.value = posWrite.texture;
    setForTarget(pointsRT, true);
    gl.render(pointsScene, camera); // reuse main camera (we're screen-space)
    resetToCanvas();

    // 3) composite: trailsNext = decay * trailsRead + pointsRT
    const trailsRead = trailsFlip.current ? trailsB : trailsA;
    const trailsWrite = trailsFlip.current ? trailsA : trailsB;
    compositeMat.uniforms.uPrev.value = trailsRead.texture;
    compositeMat.uniforms.uCurrent.value = pointsRT.texture;

    // small full-screen quad for composite
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compositeMat);
    const compScene = new THREE.Scene(); compScene.add(quad);
    const compCam = computeCam; // same ortho cam
    setForTarget(trailsWrite, false);
    gl.render(compScene, compCam);
    resetToCanvas();
    trailsFlip.current = !trailsFlip.current;

    // 4) update present material to newest trails
    presentMat.uniforms.uTex.value = trailsWrite.texture;

    // 5) resize FBOs if canvas resized
    const dpr = typeof (gl as any).getPixelRatio === 'function' ? (gl as any).getPixelRatio() : (window.devicePixelRatio || 1);
    const pxW = Math.floor(size.width * dpr);
    const pxH = Math.floor(size.height * dpr);
    if (trailsWrite.width !== pxW || trailsWrite.height !== pxH) {
      trailsA.setSize(pxW, pxH);
      trailsB.setSize(pxW, pxH);
      pointsRT.setSize(pxW, pxH);
    }
  });

  // Keep the screen plane always visible (no frustum culling)
  useEffect(() => { 
    if (screenPlaneRef.current) screenPlaneRef.current.frustumCulled = false; 
  }, []);

  // build the screen‑aligned plane sized to viewport
  const { width, height } = viewport;
  useEffect(() => {
    if (!screenPlaneRef.current) return;
    screenPlaneRef.current.scale.set(width, height, 1);
  }, [width, height]);

  return (
    <mesh ref={screenPlaneRef} position={[0,0,0]} material={presentMat}>
      {/* unit plane scaled to viewport each resize */}
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

function CameraMotion() {
  const { camera } = useThree();
  const t = useRef(0);
  useFrame(({ pointer }, dt) => {
    t.current += dt;
    const r = 0.3, baseZ = 60;
    const target = new THREE.Vector3(0,0,0);
    const px = Math.sin(t.current * 0.05) * r + pointer.x * 0.8;
    const py = -pointer.y * 0.6;
    const pz = Math.cos(t.current * 0.05) * r + baseZ;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, px, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, py, 0.05);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, pz, 0.05);
    camera.lookAt(target);
  });
  return null;
}

export default function AttractorHero() {
  const { scrollYProgress } = useScroll();
  const [coherence, setCoherence] = useState(0);
  const spring = useSpring(0, { stiffness: 60, damping: 20, mass: 0.6 });

  useEffect(() => {
    const unsubA = scrollYProgress.on('change', (v) => spring.set(Math.min(1, v * 1.4)));
    const unsubB = spring.on('change', (v) => setCoherence(v));
    return () => { unsubA(); unsubB(); };
  }, [scrollYProgress, spring]);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, 60], fov: 50 }}
          gl={{
            powerPreference: 'high-performance',
            antialias: false,
            alpha: false
          }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 1);
            // dev-time context loss guard
            const canvas: HTMLCanvasElement = (gl.domElement as HTMLCanvasElement);
            const onLost = (e: Event) => e.preventDefault();
            canvas.addEventListener('webglcontextlost', onLost, false);
          }}
        >
          <CameraMotion />
          <AttractorLayer coherence={coherence} />
        </Canvas>
      </div>

      {/* CTA row (unchanged) */}
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
            <div className="hidden md:block h-px flex-1 bg-white/20 max-w-xs" />
            <div className="flex-shrink-0">
              <a
                href="#approach"
                className="inline-flex items-center gap-2 bg-yellow-400 text-black px-8 py-4 font-semibold hover:bg-yellow-300 transition-all duration-300 group"
              >
                Learn more
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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