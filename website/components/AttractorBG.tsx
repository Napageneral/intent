'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls.js';
import { useMemo, useRef, useEffect } from 'react';
import { useScroll, useSpring } from 'framer-motion';

/* ---------- Tunables (reasonable visibility) ---------- */
const SIZE = 250; // 62,500 particles
const DT = 0.015;
const START_A = 0.19;
const END_A = 0.21;
const START_DECAY = 0.962;
const END_DECAY = 0.982;
const POINT_SIZE_PX = 3.0;
const INITIAL_SCALE = 6.0;
const FINAL_SCALE = 10.0;
const EXPLOSION_DURATION = 1.6;
const BRIGHTNESS = 2.5;
const DROPOUT = 0.18;
/* ------------------------------------------------------ */

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

/* ---------- Shaders ---------- */
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
    float r = length(pos);
    if (r > 120.0) pos *= 0.96;
    gl_FragColor = vec4(pos, 1.0);
  }
`;

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
    return r < 0.5 ? mix(near, mid, r*2.0) : mix(mid, far, (r-0.5)*2.0);
  }

  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }

  void main() {
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
  void main() {
    if (vSeed < uDropout) discard;
    vec2 pc = gl_PointCoord * 2.0 - 1.0;
    float d2 = dot(pc, pc);
    if (d2 > 1.0) discard;
    float gaussian = exp(-5.0 * d2);
    float alpha = gaussian * mix(0.06, 0.16, vSeed);
    gl_FragColor = vec4(vColor, alpha);
  }
`;

const compositeVert = /* glsl */`
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

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

const presentVert = /* glsl */`
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const presentFrag = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  void main(){
    vec3 base = vec3(0.0);
    float borderThickness = 0.02;
    float feather = 0.01;
    float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float dist = max(0.0, borderThickness - edge);
    float border = smoothstep(0.0, feather, dist);
    vec3 borderColor = vec3(1.0, 0.95, 0.1);
    vec3 color = mix(base, borderColor, border);
    vec3 particles = texture2D(uTex, vUv).rgb;
    gl_FragColor = vec4(max(color, particles), 1.0);
  }
`;

function Layer({ coherence }: { coherence: number }) {
  const { gl, size, camera } = useThree();
  const dpr = gl.getPixelRatio?.() ?? window.devicePixelRatio ?? 1;

  /* Compute pass */
  const initialTex = useMemo(makeInitialPositionsTexture, []);
  const computeCam = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  const computeScene = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uPositions: { value: initialTex }, uA: { value: START_A } },
      vertexShader: computeVert,
      fragmentShader: computeFrag,
      depthTest: false,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    const scene = new THREE.Scene();
    scene.add(mesh);
    return { scene, mat };
  }, [initialTex]);

  const posPing = useFBO(SIZE, SIZE, { type: THREE.FloatType, format: THREE.RGBAFormat, depthBuffer: false });
  const posPong = useFBO(SIZE, SIZE, { type: THREE.FloatType, format: THREE.RGBAFormat, depthBuffer: false });
  const posFlip = useRef(false);
  const posInit = useRef(false);

  /* Points pass */
  const pointsScene = useMemo(() => new THREE.Scene(), []);
  const pointsRT = useFBO(Math.floor(size.width * dpr), Math.floor(size.height * dpr), {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    depthBuffer: false
  });

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
      uPointSize: { value: POINT_SIZE_PX * (gl.getPixelRatio?.() ?? 1) },
      uScale: { value: INITIAL_SCALE },
      uDropout: { value: DROPOUT }
    },
    vertexShader: pointsVert,
    fragmentShader: pointsFrag,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    depthTest: false
  }), [initialTex, gl]);

  useEffect(() => {
    const mesh = new THREE.Points(pointsGeom, pointsMat);
    pointsScene.add(mesh);
    return () => {
      pointsScene.remove(mesh);
      pointsGeom.dispose();
      pointsMat.dispose();
    };
  }, [pointsGeom, pointsMat, pointsScene]);

  /* Trails + present */
  const trailsA = useFBO(Math.floor(size.width * dpr), Math.floor(size.height * dpr), {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    depthBuffer: false
  });
  const trailsB = useFBO(Math.floor(size.width * dpr), Math.floor(size.height * dpr), {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    depthBuffer: false
  });
  const trailsFlip = useRef(false);

  const compositeMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uPrev: { value: trailsA.texture },
          uCurrent: { value: pointsRT.texture },
          uDecay: { value: START_DECAY },
          uGain: { value: BRIGHTNESS }
        },
        vertexShader: compositeVert,
        fragmentShader: compositeFrag,
        depthTest: false,
        depthWrite: false
      }),
    [pointsRT, trailsA]
  );

  // Present material using clip-space vertex shader (no 3D transforms)
  const presentMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTex: { value: trailsA.texture } },
        vertexShader: compositeVert,   // ⬅️ clip-space vertex (NOT the MVP one)
        fragmentShader: presentFrag,
        depthTest: false,
        depthWrite: false
      }),
    [trailsA]
  );

  // Full-screen quad scene for presenting to the canvas
  const presentScene = useMemo(() => {
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), presentMat);
    const scene = new THREE.Scene();
    scene.add(quad);
    return scene;
  }, [presentMat]);

  /* Viewport helpers */
  const setForTarget = (rt: THREE.WebGLRenderTarget, clear = false) => {
    gl.setRenderTarget(rt);
    gl.setViewport(0, 0, rt.width, rt.height);
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
    gl.setScissor(0, 0, db.x, db.y);  // match scissor to viewport
    gl.setScissorTest(false);
  };

  const explosionTime = useRef(0);

  useFrame((_, delta) => {
    const a = THREE.MathUtils.lerp(START_A, END_A, coherence);
    const decay = THREE.MathUtils.lerp(START_DECAY, END_DECAY, coherence);
    compositeMat.uniforms.uDecay.value = decay;
    computeScene.mat.uniforms.uA.value = a;

    explosionTime.current += delta;
    const t = Math.min(explosionTime.current / EXPLOSION_DURATION, 1.0);
    pointsMat.uniforms.uScale.value = THREE.MathUtils.lerp(INITIAL_SCALE, FINAL_SCALE, t);

    if (!posInit.current) {
      computeScene.mat.uniforms.uPositions.value = initialTex;
      setForTarget(posPing, false);
      gl.render(computeScene.scene, computeCam);
      resetToCanvas();
      posFlip.current = true;
      posInit.current = true;
    }

    const posRead = posFlip.current ? posPing : posPong;
    const posWrite = posFlip.current ? posPong : posPing;
    computeScene.mat.uniforms.uPositions.value = posRead.texture;
    setForTarget(posWrite, false);
    gl.render(computeScene.scene, computeCam);
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

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compositeMat);
    const compScene = new THREE.Scene();
    compScene.add(quad);
    setForTarget(trailsWrite, false);
    gl.render(compScene, computeCam);
    resetToCanvas();
    trailsFlip.current = !trailsFlip.current;

    // Present to screen: render full-screen quad directly to canvas (pixel-perfect)
    presentMat.uniforms.uTex.value = trailsWrite.texture;
    resetToCanvas();                  // sets viewport to drawing buffer, disables scissor
    gl.render(presentScene, computeCam);

    const newW = Math.floor(size.width * (gl.getPixelRatio?.() ?? dpr));
    const newH = Math.floor(size.height * (gl.getPixelRatio?.() ?? dpr));
    if (trailsWrite.width !== newW || trailsWrite.height !== newH) {
      trailsA.setSize(newW, newH);
      trailsB.setSize(newW, newH);
      pointsRT.setSize(newW, newH);
    }
  });

  return null;
}

function GlobalOrbit({ autoRotate = false, autoRotateSpeed = 0.2 }: { autoRotate?: boolean; autoRotateSpeed?: number }) {
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
    const unsubSpring = coherenceSpring.on('change', (v) => (coherenceRef.current = v));
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
        gl={{ 
          powerPreference: 'high-performance', 
          antialias: false, 
          alpha: false,
          autoClear: false  // We manually clear and render, prevents R3F from clearing our render
        }}
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
