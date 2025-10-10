# Website Frontend — Engineering Guide

## Overview

This is the **Intent Systems marketing website** — a Next.js 15 App Router application with a GPU-accelerated Thomas attractor particle system background.

**Stack:**
- **Next.js 15.5.4** (App Router, React 19.2.0)
- **Three.js + @react-three/fiber** — 3D canvas and GPU particle system
- **Framer Motion** — scroll-driven animations
- **Tailwind CSS** — utility-first styling
- **TypeScript** — type safety
- **Vercel** — deployment platform

---

## File Structure

```
website/
├── app/
│   ├── layout.tsx          # Root layout: HTML shell, Analytics, global metadata
│   ├── page.tsx            # Landing page: all sections + AttractorBG
│   ├── globals.css         # Tailwind base + custom utilities
│   └── favicon.ico
├── components/
│   ├── AttractorBG.tsx     # GPU Thomas attractor (fixed full-viewport background)
│   └── ContactForm.tsx     # Contact form component
├── tailwind.config.ts      # Tailwind theme extensions
├── tsconfig.json           # TypeScript config
├── package.json            # Dependencies
└── next.config.mjs         # Next.js config
```

---

## Layer 1: Root Layout (`app/layout.tsx`)

**Purpose:** Provides the HTML shell, global metadata, and Vercel Analytics.

**Key exports:**
- `metadata`: OpenGraph, Twitter card, title, description
- `RootLayout`: Minimal wrapper around `{children}` with `<Analytics />`

**Does NOT:**
- Apply global styles (done in `globals.css` via Tailwind)
- Render navigation (done in `page.tsx`)

---

## Layer 2: Landing Page (`app/page.tsx`)

**Purpose:** Single-page marketing site with all sections and the fixed background attractor.

### Component Hierarchy

```tsx
<main>
  <AttractorBG />                  {/* Fixed full-viewport GPU canvas (z: -10) */}
  <header className="fixed z-50">  {/* Fixed header: logo + hamburger */}
  <section className="min-h-screen" /> {/* Hero spacer (no content, attractor shows through) */}
  <section id="approach" className="bg-black"> {/* Our Approach: 2-col cards */}
  <section className="min-h-screen bg-black">  {/* The Choice: stark CTA */}
  <section className="min-h-screen bg-black">  {/* AI isn't scary + logos */}
  <section id="contact" className="bg-black">   {/* Contact form */}
  <footer>
</main>
```

### Z-Index Stack (front to back)

1. **z-50**: Fixed header (logo + hamburger)
2. **z-10**: CTA overlays (if any)
3. **z-0**: Default flow (all sections)
4. **z--10**: `AttractorBG` (fixed behind everything)

### Styling Philosophy

- **Tailwind utility classes** for 95% of styling
- **Inline `style` props** for high-contrast white (`#FFFFFF`) where Tailwind's `text-white` isn't pure enough
- **`container-px`** utility (defined in `globals.css`): responsive horizontal padding (`px-6 md:px-8`)
- **`bg-black`** on all sections below the hero to create a dark canvas for the attractor

### Sections Breakdown

#### 1. **AttractorBG** (fixed background)
- Dynamically imported with `next/dynamic` (`ssr: false`) to avoid SSR/hydration issues with Three.js
- Renders once at root, spans entire viewport
- See "Layer 3: GPU Attractor" below for details

#### 2. **Header** (fixed, z-50)
- **Logo**: Yellow square + "Intent Systems" text
- **Hamburger**: 3 white bars (currently non-functional)
- **Fixed positioning** so it stays on top during scroll

#### 3. **Hero Section** (spacer)
- `className="relative min-h-screen"`
- **No content** — just creates vertical space so the attractor shows through
- Original plan had hero text here; now removed to focus on particles

#### 4. **Our Approach** (2-column cards)
- **Context** card: explains context engineering
- **Transformation** card: explains AI transformation services
- Both cards have:
  - Icon (yellow bg circle)
  - Heading
  - Body text
  - "Learn more" link with arrow
  - Hover effect (`hover:border-yellow-400/30`)

#### 5. **The Choice** (stark statement)
- Large heading: "You have a choice. Disrupt yourself. Or be disrupted by others."
- Body copy: 3 paragraphs explaining AI-native transformation urgency
- "Get started" CTA button
- **Corner brackets** (Tenex-inspired): `absolute` positioned divs with `border-l-2 border-t-2` etc.

#### 6. **AI isn't scary** (visual + social proof)
- **Left**: Placeholder box with emoji (🧠) — intended for actual visual/GIF
- **Right**: Heading + "Trusted by the best:" with 4 logo placeholders

#### 7. **Contact** (2-column: copy + form)
- **Left**: Heading, body, 3 checkmark bullets
- **Right**: `<ContactForm />` component
- Email link at bottom

#### 8. **Footer**
- Logo + copyright notice
- Border-top divider

---

## Layer 3: GPU-Accelerated Thomas Attractor (`components/AttractorBG.tsx`)

**Purpose:** Full-viewport, fixed-position WebGL canvas rendering a Thomas attractor with GPU compute shaders for position updates.

**Status:** ✅ **Production Ready** — 62,500 particles at 60-120 FPS

### Architecture: Hybrid GPU/R3F Approach

```
AttractorBG (top-level component)
├── <Canvas> (react-three/fiber, fixed at z-index: -10)
│   ├── <AutoRotateCamera> (slow orbit around origin)
│   ├── <FPSCounter> (performance monitor)
│   └── <ThomasPointsGPU> (main particle system)
│       ├── GPU Compute Pass (ping-pong FBOs for positions)
│       │   ├── posPing/posPong (250×250 RGBA32F textures)
│       │   ├── computeShader (Thomas attractor equations)
│       │   └── Runs every frame, updates all positions on GPU
│       └── R3F Points Rendering (normal 3D rendering)
│           ├── Points geometry (62,500 vertices)
│           ├── Vertex shader reads from position texture
│           └── Fragment shader with additive blending
```

### Why This Hybrid Approach Works

**The Problem with Pure GPU Pipelines:**
- Manual viewport/scissor management is error-prone
- `autoClear: false` fights with R3F's render loop
- Clip-space quad presentation requires careful timing
- Easy to get "bottom-left quarter" or black screen bugs

**The Hybrid Solution:**
- **GPU compute** for position updates (fast, handles 62.5k particles)
- **Normal R3F rendering** for display (proven to work, no viewport issues)
- **No manual FBO→canvas presentation** (R3F handles it)
- **No scissor/viewport foot-guns** (R3F manages state)

**Result:** Best of both worlds—GPU speed, R3F simplicity.

### Key Implementation Details

#### 1. **GPU Compute Shader (Thomas Attractor)**

```glsl
// computeFrag.glsl
precision highp float;
varying vec2 vUv;
uniform sampler2D uPositions;  // Previous positions
uniform float uA;              // Attractor parameter
uniform float uDT;             // Time step

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
```

**Ping-pong pattern:**
```ts
// Read from one FBO, write to the other
const posRead  = flip ? posPing : posPong;
const posWrite = flip ? posPong : posPing;

computeMaterial.uniforms.uPositions.value = posRead.texture;
gl.setRenderTarget(posWrite);
gl.render(computeScene, computeCamera);
gl.setRenderTarget(null);

flip = !flip;
```

#### 2. **Points Rendering (Vertex Shader Reads Texture)**

```glsl
// pointsVert.glsl
uniform sampler2D uPositions;  // GPU-computed positions
uniform float uScale;          // World-space scaling
attribute vec2 aRef;           // UV coordinate into position texture

void main() {
  vec3 pos = texture2D(uPositions, aRef).xyz * uScale;
  gl_PointSize = 3.2;  // Constant pixel size
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

**Each vertex:**
- Has an `aRef` attribute (UV into the 250×250 position texture)
- Fetches its position from the GPU-computed texture
- Renders as a point with additive blending

#### 3. **Critical Timing Fix**

**Problem:** R3F's `useMemo` for scenes creates them empty initially; `useEffect` adds children later. If `useFrame` runs before `useEffect`, scenes are empty and renders fail silently.

**Solution:**
```tsx
const computeScene = useMemo(() => new THREE.Scene(), []);

useEffect(() => {
  computeScene.add(computeQuad);  // Happens after initial render
  return () => { computeScene.remove(computeQuad); };
}, [computeScene, computeQuad]);

useFrame(() => {
  // CRITICAL: Wait for scene to be populated
  if (computeScene.children.length === 0) return;
  
  // Now safe to render
  gl.render(computeScene, computeCamera);
});
```

### Tunables

```ts
const SIZE = 250;     // 250×250 = 62,500 particles
const DT = 0.06;      // time step (controls movement speed)
const A  = 0.19;      // attractor parameter (0.19 = classic Thomas shape)
const SCALE = 9.0;    // world space scaling
```

**Camera:**
```tsx
camera={{ position: [0, 0, 90], fov: 55 }}
```
- Camera at `z=90` shows full attractor without clipping
- Auto-rotates in a circle (radius 90, speed 0.1)

**Particle Rendering:**
```glsl
gl_PointSize = 1.6 * dpr;  // Scales with device pixel ratio
// Additive blending, Gaussian falloff, 75% opacity
// Light cyan/blue color (0.80, 0.95, 1.00)
```

### Performance

- **120 FPS** on M1+ Macs (low battery might cap at 30-60)
- **60-90 FPS** on modern desktops with dedicated GPUs
- **GPU memory:** ~500KB for position FBOs (250×250×4 floats × 2)
- **CPU load:** Minimal (GPU handles all computation)

### Interaction Model

**Completely inert background:**
- Canvas has `pointer-events: none`
- No manual controls (previously tried, broke scrolling on mobile)
- Auto-rotation only for ambient motion
- Scrolling always works (never captured by canvas)

---

## Layer 4: Global Styles (`app/globals.css`)

**Purpose:** Tailwind base + custom utilities + resets.

### Key Styles

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --radius: 10px;  /* default border radius */
}

html {
  scroll-behavior: smooth;  /* smooth anchor scrolling */
}

html, body {
  height: 100%;  /* allow fixed positioning to work */
}

body {
  @apply antialiased text-gray-800 bg-white;
  font-size: 16px;
  line-height: 1.6;
}

@media (min-width: 768px) {
  body {
    font-size: 17px;  /* larger base font on desktop */
  }
}

.bg-grid {
  /* Subtle dot grid (not currently used) */
  background-image: radial-gradient(rgba(16,24,40,0.08) 1px, transparent 1px);
  background-size: 16px 16px;
}

.container-px {
  /* Responsive horizontal padding */
  @apply px-6 md:px-8;
}

a, button {
  /* Smooth color transitions */
  @apply transition-colors duration-200;
}
```

### Why inline `style` props?

Tailwind's `text-white` is `rgb(255 255 255 / var(--tw-text-opacity))`, which can render slightly off-white due to opacity vars or browser rounding. When **pure `#FFFFFF` is critical** (e.g., hero headings), we use inline styles:
```tsx
<h2 style={{ color: '#FFFFFF' }}>...</h2>
```

---

## Layer 5: Tailwind Config (`tailwind.config.ts`)

**Purpose:** Theme extensions and content paths.

```ts
export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef6ff',
          // ... blue scale (not actively used yet)
          900: '#0e326f'
        }
      },
      boxShadow: {
        card: '0 2px 20px rgba(16,24,40,0.06)'
      }
    }
  },
  plugins: []
}
```

**Note:** The `brand` color scale is defined but not currently used; the site uses `yellow-400` (`#FACC15`) for accents and `white` for text.

---

## Critical Testing Checklist

Before deploying to Vercel:

1. ✅ **Local build succeeds**
   ```bash
   cd website && npm run build
   ```
2. ✅ **Local dev server works**
   ```bash
   npm run dev
   ```
   - Open `http://localhost:3000`
   - Verify 62,500 particles visible and flowing
   - Check FPS counter shows 60+ FPS
3. ✅ **No console errors** (especially WebGL/shader errors)
4. ✅ **Scrolling works** on both desktop and mobile
5. ✅ **Links and buttons clickable**
6. ✅ **Camera auto-rotates** smoothly
7. ✅ **Full viewport coverage** (no clipping on any edge)

**CRITICAL RULE:** ⚠️ **NEVER DEPLOY TO VERCEL WITHOUT TESTING LOCALLY FIRST.** ⚠️

If the build fails locally, it will fail on Vercel. Test the production build (`npm run build && npm start`) before pushing.

---

## Common Tasks

### Adjust Particle Visibility

Edit `components/AttractorBG.tsx` tunables:
- **Larger points**: change `gl_PointSize` in vertex shader (currently `1.6 * dpr`)
- **Different color**: modify `vec3 color` in fragment shader (currently cyan/blue)
- **More/fewer particles**: change `SIZE` constant (e.g., `200` = 40k, `300` = 90k)

### Adjust Attractor Size

- **Smaller on screen**: lower `SCALE` constant (e.g., `7.0`)
- **Larger on screen**: raise `SCALE` constant (e.g., `12.0`)

### Adjust Movement Speed

- **Faster**: increase `DT` (e.g., `0.08` or `0.10`)
- **Slower**: decrease `DT` (e.g., `0.04` or `0.03`)

### Adjust Camera

- **Faster rotation**: increase multiplier in `AutoRotateCamera` (currently `0.1`)
- **Wider view**: decrease camera `z` position (currently `90`)
- **Closer view**: increase camera `z` position (e.g., `60`)

### Debug GPU Compute Issues

1. **Check browser console** for WebGL errors or shader compilation failures
2. **Check FPS counter** - if <30, GPU might not support Float32 textures
3. **If particles stuck at origin**: Verify compute scene has children before running
4. **If particles disappear**: Check `SCALE` value and camera position
5. **If only one dot**: BufferAttribute count issue - ensure geometry setup is correct

---

## Performance Notes

### Current Performance

- **120 FPS** on M1+ Macs (when plugged in)
- **60-90 FPS** on modern desktops with dedicated GPUs
- **30-60 FPS** on battery power (browser throttling)
- **Particle count**: 62,500 (tested and performant)

### If Performance Issues

1. **Lower particle count**: `SIZE = 200` (40,000 particles) or `SIZE = 150` (22,500)
2. **Lower DPR**: `dpr={[1, 1]}` for low-end devices
3. **Reduce time step**: `DT = 0.03` (slower movement, less GPU work per frame)

### GPU Memory

- **Positions FBOs**: 250×250×4 floats × 2 = ~500 KB
- **Total VRAM**: <1 MB for entire system (very lightweight)

---

## Deployment (Vercel)

### Environment Variables

None currently required. If you add backend calls later, define:
- `NEXT_PUBLIC_API_URL` (public, for frontend fetch calls)

### Build Command

```bash
npm run build
```

### Output

- `.next/` folder (gitignored)
- Static assets in `.next/static/`
- Standalone build for serverless functions

### Deployment Checklist

1. ✅ Run `npm run build` locally (must succeed)
2. ✅ Run `npm run start` and verify production build works
3. ✅ Commit and push to `main` branch
4. ✅ Vercel auto-deploys on push
5. ✅ Check Vercel dashboard for build logs
6. ✅ Test live URL after deployment

---

## Troubleshooting

### "Module not found: Package path ./next is not exported"

**Cause:** Using `@vercel/analytics/next` in App Router (should be `/react`).

**Fix:** Change import in `app/layout.tsx`:
```ts
import { Analytics } from '@vercel/analytics/react';
```

### "Cannot read properties of undefined (reading 'S')"

**Cause:** React version mismatch (R3F v9+ requires React 19).

**Fix:** Ensure `package.json` has:
```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "next": "^15.5.4"
}
```

### "Shader Error 0 — VALIDATE_STATUS false"

**Cause:** Shader syntax error in GPU compute or vertex/fragment shaders.

**Fix:** Check console for specific line number. Common issues:
- Missing semicolons in GLSL
- Type mismatches (vec3 vs. float)
- Uniform/attribute name typos

### Particles not visible

1. **Check FPS counter** - if it's rendering (>0 FPS), the pipeline is running
2. **Check `SIZE` and `SCALE`** - particles might be off-camera
3. **Check `gl_PointSize`** in vertex shader - should be > 1.0
4. **Hard reload** (Cmd+Shift+R) to clear shader cache
5. **Check console** for WebGL context loss or shader compilation errors

### Only seeing one dot or particles stuck at origin

**Cause:** Compute scene not populated before `useFrame` runs, or BufferAttribute setup issue.

**Fix (already implemented):**
```tsx
useFrame(() => {
  // Wait for compute scene to be ready
  if (computeScene.children.length === 0) return;
  
  // Now safe to render
  gl.render(computeScene, computeCamera);
});
```

### Scrolling doesn't work

**Cause:** Canvas capturing pointer events.

**Fix:** Ensure canvas wrapper has `pointer-events: none`:
```tsx
<div className="fixed inset-0 -z-10 pointer-events-none">
  <Canvas>...</Canvas>
</div>
```

---

## Philosophy & Design Intent

### Visual Language

- **Dark canvas** (`bg-black`) to let attractor glow stand out
- **Yellow accents** (`yellow-400`) for brand energy and CTAs
- **Pure white** (`#FFFFFF`) for high-contrast headings
- **Minimal borders** — sharp corners, no radius (Tenex-inspired)
- **Corner brackets** — subtle visual anchors, not overwhelming

### UX Principles

1. **Background visual is secondary** — content must always be readable and interactive
2. **No performance impact on interaction** — 60+ FPS or degrade gracefully
3. **Auto-rotate is subtle** — ambient motion, not distracting
4. **Never interfere with scrolling** — canvas is completely inert (`pointer-events: none`)

### Accessibility Notes

- **No critical information in attractor** — purely decorative
- **High contrast text** — pure white on black
- **Keyboard navigation** — all links/buttons accessible via Tab
- **Screen readers** — attractor is `aria-hidden` (via z-index layering; no explicit ARIA yet)

**TODO**: Add `aria-label` to hamburger, `aria-hidden` to decorative elements, and test with VoiceOver/NVDA.

---

## Related Documentation

- **Root agents.md**: Top-level architecture
- **ChatStats app/agents.md**: Similar patterns for Three.js integration (if referencing)
- **Three.js docs**: https://threejs.org/docs
- **React Three Fiber**: https://docs.pmnd.rs/react-three-fiber
- **Framer Motion**: https://www.framer.com/motion/
- **Tailwind CSS**: https://tailwindcss.com/docs

---

## Decision Records

- **Hybrid GPU/R3F approach** - GPU compute for positions, normal R3F rendering (avoids viewport/scissor issues)
- **Inert background** - No manual controls to avoid scroll conflicts on mobile
- **Auto-rotate only** - Subtle camera orbit for ambient 3D effect

---

## Maintenance Notes

### When Adding New Components

1. Place in `components/` directory
2. Use TypeScript (`.tsx`)
3. Export as default or named export
4. Import in `page.tsx` or other components
5. **If using Three.js:** wrap in `next/dynamic` with `ssr: false`

### When Modifying Attractor

1. **Always test locally first** (run dev server, verify visual changes)
2. **Preserve GPU compute pattern** — don't break ping-pong FBO swaps
3. **Wait for scenes to populate** — ensure `useFrame` checks `scene.children.length > 0`
4. **Test shader changes incrementally** — verify compilation in browser console
5. **Check FPS counter** — ensure changes don't tank performance

### When Refactoring Styles

1. **Prefer Tailwind utilities** over inline styles (except for `#FFFFFF` cases)
2. **Keep `container-px` for horizontal padding** (don't hardcode `px-6`)
3. **Use `bg-black` for dark sections** (consistent theme)
4. **Test responsive breakpoints** (`md:`, `lg:`) across viewports

---

**Last Updated:** 2025-10-09  
**Maintained By:** Intent Systems Engineering  
**Status:** Living document — update as architecture evolves
