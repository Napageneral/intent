'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls.js';
import { useMemo, useRef, useEffect } from 'react';
import { useScroll, useSpring } from 'framer-motion';

/* ================= Tunables ================= */
const SIZE = 250;                 // 62,500 particles
const DT = 0.015;
const START_A = 0.19;
const END_A = 0.21;
const START_DECAY = 0.962;
const END_DECAY = 0.982;
const POINT_SIZE_PX = 2.4;
const SCALE_BEGIN = 6.0;
const SCALE_END = 10.0;
const EXPLODE_SECS = 1.4;
const BRIGHTNESS = 2.4;           // trails gain
const DROPOUT = 0.18;             // fraction of particles discarded (0.0 – 0.3 good)

/* Bloom settings */
const BLOOM_STRENGTH = 0.7;       // how much blurred light adds back
const BLOOM_DOWNSCALE = 0.5;      // 0.5 => blur at half resolution
/* ============================================ */

function makeInitialPositionsTexture() {
  const data = new Float32Array(SIZE * SIZE * 4);
  const spread = 3.0;
  let i = 0;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++, i += 4) {
      data[i + 0] = (Math.random() - 0.5) * spread;
      data[i + 1] = (Math.random() - 0.5) * spread;
      data[i + 2] = (Math.random() - 0.5) * spread;
      data[i + 3] = 1.0;
    }
  }
  const tex = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat, THREE.FloatType);
  tex.needsUpdate = true;
  return tex;
}

/* ---------- Shared quad vertex ---------- */
const clipQuadVert = /* glsl */`
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/* ---------- Compute shader (Thomas attractor) ---------- */
const computeFrag = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPositions;
  uniform float uA;
  void main(){
    vec3 p = texture2D(uPositions, vUv).xyz;
    float dt = ${DT.toFixed(6)};
    float a = uA;
    vec3 d = vec3(
      -a * p.x + sin(p.y),
      -a * p.y + sin(p.z),
      -a * p.z + sin(p.x)
    ) * dt;
    p += d;
    float r = length(p);
    if (r > 120.0) p *= 0.96;
    gl_FragColor = vec4(p, 1.0);
  }
`;

/* ---------- Points shader ---------- */
const pointsVert = /* glsl */`
  uniform sampler2D uPositions;
  uniform float uPointSize;
  uniform float uScale;
  attribute vec2 aRef;
  varying vec3 vColor;
  varying float vSeed;

  vec3 radiusColor(vec3 p) {
    float r = clamp(length(p) / 100.0, 0.0, 1.0);
    vec3 near = vec3(0.20, 0.40, 1.00);
    vec3 mid  = vec3(0.30, 0.80, 1.00);
    vec3 far  = vec3(0.95, 0.98, 1.00);
    return r < 0.5 ? mix(near, mid, r * 2.0) : mix(mid, far, (r - 0.5) * 2.0);
  }

  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }

  void main(){
    vec3 pos = texture2D(uPositions, aRef).xyz * uScale;
    vColor = radiusColor(pos);
    vSeed = hash(aRef);
    gl_PointSize = uPointSize;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const pointsFrag = /* glsl */`
  precision highp float;
  varying vec3 vColor;
  varying float vSeed;
  uniform float uDropout;
  void main(){
    if (vSeed < uDropout) discard;
    vec2 pc = gl_PointCoord * 2.0 - 1.0;
    float d2 = dot(pc, pc);
    if (d2 > 1.0) discard;
    float gaussian = exp(-5.0 * d2);
    float alpha = gaussian * mix(0.06, 0.16, vSeed);
    gl_FragColor = vec4(vColor, alpha);
  }
`;

/* ---------- Trails accumulation ---------- */
const compositeFrag = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPrev;
  uniform sampler2D uCurrent;
  uniform float uDecay;
  uniform float uGain;
  void main(){
    vec3 prev = texture2D(uPrev, vUv).rgb;
    vec3 curr = texture2D(uCurrent, vUv).rgb;
    vec3 accum = uDecay * prev + uGain * curr;
    gl_FragColor = vec4(min(accum, vec3(1.0)), 1.0);
  }
`;

/* ---------- Bloom blur (separable) ---------- */
const blurFrag = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform vec2 uDirection;

  void main(){
    vec3 c = vec3(0.0);
    float w0 = 0.2270270270;
    float w1 = 0.3162162162;
    float w2 = 0.0702702703;

    c += w0 * texture2D(uTex, vUv).rgb;
    c += w1 * texture2D(uTex, vUv + 1.3846153846 * uDirection).rgb;
    c += w1 * texture2D(uTex, vUv - 1.3846153846 * uDirection).rgb;
    c += w2 * texture2D(uTex, vUv + 3.2307692308 * uDirection).rgb;
    c += w2 * texture2D(uTex, vUv - 3.2307692308 * uDirection).rgb;

    gl_FragColor = vec4(c, 1.0);
  }
`;

/* ---------- Present to canvas ---------- */
const presentFrag = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uBase;
  uniform sampler2D uBloom;
  uniform float uBloomStrength;
  void main(){
    vec3 base = texture2D(uBase, vUv).rgb;
    vec3 bloom = texture2D(uBloom, vUv).rgb;
    vec3 color = base + uBloomStrength * bloom;

    float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float w = fwidth(edge) + 1e-6;
    float border = smoothstep(0.006 + w, 0.006, edge);
    vec3 borderColor = vec3(1.0, 0.95, 0.15);
    color = max(color, border * borderColor);

    gl_FragColor = vec4(color, 1.0);
  }
`;

function Layer({ coherence }: { coherence: number }) {
  const { gl, size, camera } = useThree();
  const dpr = gl.getPixelRatio?.() ?? (typeof window !== 'undefined' ? window.devicePixelRatio : 1);

  const baseWidth = Math.max(2, Math.floor(size.width * dpr));
  const baseHeight = Math.max(2, Math.floor(size.height * dpr));
  const bloomWidth = Math.max(2, Math.floor(baseWidth * BLOOM_DOWNSCALE));
  const bloomHeight = Math.max(2, Math.floor(baseHeight * BLOOM_DOWNSCALE));

  /* Compute setup */
  const initialTex = useMemo(makeInitialPositionsTexture, []);
  const orthoCam = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  const computeMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uPositions: { value: initialTex }, uA: { value: START_A } },
    vertexShader: clipQuadVert,
    fragmentShader: computeFrag,
    depthTest: false,
    depthWrite: false
  }), [initialTex]);
  const computeQuad = useMemo(() => new THREE.Mesh(new THREE.PlaneGeometry(2, 2), computeMat), [computeMat]);
  const computeScene = useMemo(() => { const s = new THREE.Scene(); s.add(computeQuad); return s; }, [computeQuad]);
  const posPing = useFBO(SIZE, SIZE, { type: THREE.FloatType, format: THREE.RGBAFormat, depthBuffer: false });
  const posPong = useFBO(SIZE, SIZE, { type: THREE.FloatType, format: THREE.RGBAFormat, depthBuffer: false });
  const posFlip = useRef(false);
  const posInit = useRef(false);

  /* Points pass */
  const pointsScene = useMemo(() => new THREE.Scene(), []);
  const pointsRT = useFBO(baseWidth, baseHeight, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false });
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
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SIZE * SIZE * 3), 3));
    return g;
  }, []);
  const pointsMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uPositions: { value: initialTex },
      uPointSize: { value: POINT_SIZE_PX * dpr },
      uScale: { value: SCALE_BEGIN },
      uDropout: { value: DROPOUT }
    },
    vertexShader: pointsVert,
    fragmentShader: pointsFrag,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    depthTest: false
  }), [initialTex, dpr]);

  useEffect(() => {
    const mesh = new THREE.Points(pointsGeom, pointsMat);
    pointsScene.add(mesh);
    return () => {
      pointsScene.remove(mesh);
      pointsGeom.dispose();
      pointsMat.dispose();
    };
  }, [pointsGeom, pointsMat, pointsScene]);

  /* Trails accumulation */
  const trailsA = useFBO(baseWidth, baseHeight, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false });
  const trailsB = useFBO(baseWidth, baseHeight, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false });
  const trailsFlip = useRef(false);
  const compositeMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uPrev: { value: trailsA.texture },
      uCurrent: { value: pointsRT.texture },
      uDecay: { value: START_DECAY },
      uGain: { value: BRIGHTNESS }
    },
    vertexShader: clipQuadVert,
    fragmentShader: compositeFrag,
    depthTest: false,
    depthWrite: false
  }), [pointsRT, trailsA]);
  const compositeQuad = useMemo(() => new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compositeMat), [compositeMat]);
  const compositeScene = useMemo(() => { const s = new THREE.Scene(); s.add(compositeQuad); return s; }, [compositeQuad]);

  /* Bloom blur */
  const blurX = useFBO(bloomWidth, bloomHeight, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false });
  const blurY = useFBO(bloomWidth, bloomHeight, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false });
  const blurMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTex: { value: trailsA.texture },
      uDirection: { value: new THREE.Vector2(1 / Math.max(2, bloomWidth), 0) }
    },
    vertexShader: clipQuadVert,
    fragmentShader: blurFrag,
    depthTest: false,
    depthWrite: false
  }), [trailsA, bloomWidth]);
  const blurQuad = useMemo(() => new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMat), [blurMat]);
  const blurScene = useMemo(() => { const s = new THREE.Scene(); s.add(blurQuad); return s; }, [blurQuad]);

  /* Present */
  const presentMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uBase: { value: trailsA.texture },
      uBloom: { value: blurY.texture },
      uBloomStrength: { value: BLOOM_STRENGTH }
    },
    vertexShader: clipQuadVert,
    fragmentShader: presentFrag,
    depthTest: false,
    depthWrite: false
  }), [trailsA, blurY]);
  const presentQuad = useMemo(() => new THREE.Mesh(new THREE.PlaneGeometry(2, 2), presentMat), [presentMat]);
  const presentScene = useMemo(() => { const s = new THREE.Scene(); s.add(presentQuad); return s; }, [presentQuad]);

  const setForTarget = (rt: THREE.WebGLRenderTarget, clear = false) => {
    gl.setRenderTarget(rt);
    gl.setViewport(0, 0, rt.width, rt.height);
    gl.setScissor(0, 0, rt.width, rt.height);
    gl.setScissorTest(true);
    if (clear) {
      const prevColor = gl.getClearColor(new THREE.Color()).clone();
      const prevAlpha = gl.getClearAlpha();
      gl.setClearColor(0x000000, 1);
      gl.clear(true, true, true);
      gl.setClearColor(prevColor, prevAlpha);
    }
  };

  const resetToCanvas = () => {
    gl.setRenderTarget(null);
    const db = new THREE.Vector2();
    gl.getDrawingBufferSize(db);
    gl.setViewport(0, 0, db.x, db.y);
    gl.setScissor(0, 0, db.x, db.y);
    gl.setScissorTest(false);
  };

  const explodeT = useRef(0);

  useFrame((_, delta) => {
    const a = THREE.MathUtils.lerp(START_A, END_A, coherence);
    const decay = THREE.MathUtils.lerp(START_DECAY, END_DECAY, coherence);
    computeMat.uniforms.uPositions.value = computeMat.uniforms.uPositions.value;
    computeMat.uniforms.uA.value = a;
    compositeMat.uniforms.uDecay.value = decay;

    explodeT.current += delta;
    const t = Math.min(explodeT.current / EXPLODE_SECS, 1.0);
    pointsMat.uniforms.uScale.value = THREE.MathUtils.lerp(SCALE_BEGIN, SCALE_END, t);

    if (!posInit.current) {
      computeMat.uniforms.uPositions.value = initialTex;
      setForTarget(posPing, false);
      gl.render(computeScene, orthoCam);
      resetToCanvas();
      posFlip.current = true;
      posInit.current = true;
    }

    const posRead = posFlip.current ? posPing : posPong;
    const posWrite = posFlip.current ? posPong : posPing;
    computeMat.uniforms.uPositions.value = posRead.texture;
    setForTarget(posWrite, false);
    gl.render(computeScene, orthoCam);
    resetToCanvas();
    posFlip.current = !posFlip.current;

    pointsMat.uniforms.uPositions.value = posWrite.texture;
    setForTarget(pointsRT, true);
    gl.render(pointsScene, camera as any);
    resetToCanvas();

    const trailsRead = trailsFlip.current ? trailsB : trailsA;
    const trailsWrite = trailsFlip.current ? trailsA : trailsB;
    compositeMat.uniforms.uPrev.value = trailsRead.texture;
    compositeMat.uniforms.uCurrent.value = pointsRT.texture;
    setForTarget(trailsWrite, false);
    gl.render(compositeScene, orthoCam);
    resetToCanvas();
    trailsFlip.current = !trailsFlip.current;

    blurMat.uniforms.uTex.value = trailsWrite.texture;
    blurMat.uniforms.uDirection.value.set(1 / blurX.width, 0);
    setForTarget(blurX, false);
    gl.render(blurScene, orthoCam);
    resetToCanvas();

    blurMat.uniforms.uTex.value = blurX.texture;
    blurMat.uniforms.uDirection.value.set(0, 1 / blurY.height);
    setForTarget(blurY, false);
    gl.render(blurScene, orthoCam);
    resetToCanvas();

    presentMat.uniforms.uBase.value = trailsWrite.texture;
    presentMat.uniforms.uBloom.value = blurY.texture;
    resetToCanvas();
    gl.render(presentScene, orthoCam);

    const currentWidth = Math.floor(size.width * dpr);
    const currentHeight = Math.floor(size.height * dpr);
    if (trailsWrite.width !== currentWidth || trailsWrite.height !== currentHeight) {
      trailsA.setSize(currentWidth, currentHeight);
      trailsB.setSize(currentWidth, currentHeight);
      pointsRT.setSize(currentWidth, currentHeight);
    }
    const bloomW = Math.max(2, Math.floor(currentWidth * BLOOM_DOWNSCALE));
    const bloomH = Math.max(2, Math.floor(currentHeight * BLOOM_DOWNSCALE));
    if (blurX.width !== bloomW || blurX.height !== bloomH) {
      blurX.setSize(bloomW, bloomH);
      blurY.setSize(bloomW, bloomH);
    }
  });

  useEffect(() => {
    return () => {
      computeQuad.geometry.dispose();
      compositeQuad.geometry.dispose();
      blurQuad.geometry.dispose();
      presentQuad.geometry.dispose();
      computeMat.dispose();
      compositeMat.dispose();
      blurMat.dispose();
      presentMat.dispose();
    };
  }, [computeQuad, compositeQuad, blurQuad, presentQuad, computeMat, compositeMat, blurMat, presentMat]);

  return null;
}

function GlobalOrbit({ autoRotate = false, autoRotateSpeed = 0.25 }: { autoRotate?: boolean; autoRotateSpeed?: number }) {
  const { camera } = useThree();
  const controls = useRef<OrbitControlsImpl | null>(null);

  useEffect(() => {
    camera.position.set(0, 0, 50);
    camera.lookAt(0, 0, 0);

    const c = new OrbitControlsImpl(camera, document.body);
    c.target.set(0, 0, 0);
    c.enableZoom = false;
    c.enablePan = false;
    c.rotateSpeed = 0.7;
    c.autoRotate = autoRotate;
    c.autoRotateSpeed = autoRotateSpeed;
    c.enabled = false;

    const isInteractive = (el: EventTarget | null) =>
      !!(el as HTMLElement | null)?.closest?.('a,button,input,textarea,select,label,[data-no-orbit]');

    const onDown = (e: PointerEvent) => {
      if (!isInteractive(e.target)) {
        c.enabled = true;
        document.body.style.cursor = 'grabbing';
      }
    };
    const onUp = () => {
      c.enabled = false;
      document.body.style.cursor = '';
    };

    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    controls.current = c;

    return () => {
      c.dispose();
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [camera, autoRotate, autoRotateSpeed]);

  useFrame(() => controls.current?.update());
  return null;
}

export default function AttractorBG() {
  const { scrollYProgress } = useScroll();
  const coherenceSpring = useSpring(0, { stiffness: 60, damping: 20, mass: 0.6 });
  const coherenceRef = useRef(0);

  useEffect(() => {
    const unsubScroll = scrollYProgress.on('change', (v) => coherenceSpring.set(Math.min(1, v * 1.4)));
    const unsubSpring = coherenceSpring.on('change', (v) => { coherenceRef.current = v; });
    return () => {
      unsubScroll();
      unsubSpring();
    };
  }, [scrollYProgress, coherenceSpring]);

  return (
    <div className="fixed inset-0 -z-10">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 50], fov: 60 }}
        gl={{ powerPreference: 'high-performance', antialias: false, alpha: false, autoClear: false }}
        style={{ display: 'block', position: 'absolute', inset: 0 }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 1);
          const canvas = gl.domElement as HTMLCanvasElement;
          const onLost = (e: Event) => e.preventDefault();
          canvas.addEventListener('webglcontextlost', onLost, false);
        }}
      >
        <GlobalOrbit autoRotate={false} />
        <Layer coherence={coherenceRef.current} />
      </Canvas>
    </div>
  );
}
