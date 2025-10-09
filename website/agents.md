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

## Layer 3: Attractor Background

### Current Implementation: CPU-Based (`components/AttractorSimpleCPU.tsx`)

**Purpose:** Full-viewport, fixed-position WebGL canvas rendering a Thomas attractor particle system with CPU integration and interactive camera controls.

**Status:** ✅ **Working** — Clean, performant, interactive

### Architecture

```
AttractorSimpleCPU (top-level component)
├── <Canvas> (react-three/fiber, fills fixed div at z-0)
│   ├── <OrbitControls> (auto-rotate + manual orbit)
│   └── <ThomasPoints> (particle system)
│       ├── Simulation buffer (CPU-integrated positions)
│       ├── Display buffer (scaled for rendering)
│       └── Points geometry (15,000 particles)
```

### Key Design Decisions

#### 1. **CPU Integration** (not GPU compute)
- Simpler to debug and reason about
- No FBO/ping-pong complexity
- Sufficient performance for 15k particles at 60fps
- Easy to extend with different attractors later

#### 2. **Z-Index Layering** (critical for interaction)
```tsx
// Canvas at base layer
<div className="fixed inset-0 z-0">  {/* AttractorSimpleCPU */}

// Content layers above, but transparent to clicks
<section className="z-10 pointer-events-none">
  <div className="pointer-events-auto">  {/* Interactive elements only */}
    <button>...</button>
  </div>
</section>
```

**Why this works:**
- Canvas is at `z-0` (base layer)
- All content sections are at `z-10` BUT with `pointer-events-none`
- Interactive elements (buttons, links, forms) wrapped in `pointer-events-auto` divs
- **Result:** Clicks "fall through" empty space to reach the canvas for orbit controls

#### 3. **OrbitControls Configuration**
```tsx
<OrbitControls
  autoRotate
  autoRotateSpeed={0.5}     // Subtle rotation when idle
  enableDamping              // Smooth camera movement
  dampingFactor={0.05}
  enableZoom={false}         // Disabled (conflicts with page scroll)
  enablePan={false}          // Disabled (not needed)
  target={[0, 0, 0]}
/>
```

**Interaction model:**
- Auto-rotates slowly when idle
- Click-and-drag anywhere on empty space to orbit manually
- Auto-rotation pauses during manual control
- Scrolling works normally (zoom disabled to prevent conflict)

#### 4. **Critical R3F Bug Fix**
**Problem:** Declarative `<bufferAttribute>` in R3F sometimes sets `count: 0`, making particles invisible.

**Solution:**
```tsx
useEffect(() => {
  if (geomRef.current) {
    const posAttr = geomRef.current.attributes.position;
    if (posAttr && posAttr.count === 0) {
      posAttr.count = N;  // Manually set count to actual particle count
    }
  }
}, []);
```

**Why this happens:** R3F's declarative attribute creation doesn't always infer count from array length. Manual fix ensures Three.js knows how many particles to render.

### Tunables

```ts
const N = 15000;      // particle count (15k is sweet spot for performance)
const DT = 0.015;     // time step (controls simulation speed)
const A  = 0.19;      // attractor parameter (0.19 = classic Thomas shape)
const SCALE = 9.0;    // world space scaling (how big it appears)
```

**Camera:**
```tsx
camera={{ position: [0, 0, 90], fov: 55 }}
```
- Camera at `z=90` shows full attractor without clipping
- FOV 55° is slightly wider than default (50°) for better framing

**Particle Material:**
```tsx
<pointsMaterial
  size={1.6 * dpr}              // Pixel size (scales with device pixel ratio)
  sizeAttenuation={false}       // Constant pixel size (doesn't get smaller with distance)
  depthWrite={false}            // Allows proper blending
  transparent
  opacity={0.75}
  blending={THREE.AdditiveBlending}  // Glowy additive effect
  color={new THREE.Color(0.80, 0.95, 1.00)}  // Light cyan/blue
/>
```

### Thomas Attractor Equations

```ts
// For each particle at (x, y, z):
const dx = (-A * x + Math.sin(y)) * DT;
const dy = (-A * y + Math.sin(z)) * DT;
const dz = (-A * z + Math.sin(x)) * DT;

// Update position
x += dx;
y += dy;
z += dz;

// Soft boundary (prevents particles from escaping to infinity)
const r2 = x*x + y*y + z*z;
if (r2 > 1600.0) {
  x *= 0.96;
  y *= 0.96;
  z *= 0.96;
}
```

**Flow:**
1. Particles initialized in random cube `[-1, 1]³`
2. Each frame, apply Thomas equations to update positions
3. Scale positions by `SCALE` for display
4. Render as additive-blended points

### Performance

- **60 FPS** on M1+ Macs, modern desktops
- **45-60 FPS** on integrated GPUs (Intel Iris, older MacBooks)
- **CPU load:** ~5-10% single core (JavaScript integration loop)
- **GPU load:** Minimal (just rendering 15k points, no compute shaders)

### Future: GPU Pipeline (AttractorBG.tsx)

**Status:** 🚧 **Exists but not currently in use** — needs fixes

The previous `AttractorBG.tsx` implementation used:
- GPU compute shaders (ping-pong FBOs)
- Trail accumulation
- More complex visual effects

**Why we switched to CPU version:**
- Easier to debug (no shader compilation issues)
- Simpler architecture (no FBO management)
- Sufficient performance for current needs
- Faster iteration during development

**When to revisit GPU version:**
- Want 50k+ particles
- Want persistent trails (motion blur effect)
- Want more complex visual effects (bloom, color shifts)
- Performance headroom needed for other effects

---

### Legacy GPU Attractor Documentation (`components/AttractorBG.tsx`)

**Note:** The following documents the GPU-based implementation that's currently not in use. Kept for reference.

### Architecture

```
AttractorBG (top-level component)
├── <Canvas> (react-three-fiber, fills fixed div)
│   ├── GlobalOrbit (OrbitControls on document.body for drag-to-rotate)
│   └── Layer (main render logic)
│       ├── Compute ping-pong (position updates via Thomas equations)
│       ├── Points render (to offscreen pointsRT)
│       ├── Trails composite (accumulation with decay)
│       └── Present plane (camera-pinned quad showing trails texture)
```

### Tunables (at top of file)

```ts
const SIZE = 250;              // 250×250 = 62,500 particles
const DT = 0.015;              // time step for Thomas equations
const START_A = 0.19;          // Thomas parameter (chaotic)
const END_A = 0.21;            // Thomas parameter (coherent)
const START_DECAY = 0.962;     // trail persistence (chaos)
const END_DECAY = 0.982;       // trail persistence (order)
const POINT_SIZE_PX = 2.5;     // pixel size of each particle
const SCALE_ON_SCREEN = 6.0;   // world-space scale of attractor
const BRIGHTNESS = 2.2;        // composite gain (brightness)
const DROPOUT = 0.20;          // fraction of particles discarded (0 = solid, 1 = empty)
```

**Current settings prioritize visibility** (larger points, brighter, less dropout, smaller attractor).

### Pipeline Stages

#### 1. **Position Compute** (Thomas attractor equations)
- **FBOs**: `posPing` ↔ `posPong` (SIZE×SIZE, RGBA32F)
- **Shader**: `computeFrag` applies Thomas equations:
  ```glsl
  dx = (-a*x + sin(y)) * dt
  dy = (-a*y + sin(z)) * dt
  dz = (-a*z + sin(x)) * dt
  ```
- **Soft boundary**: if `r > 120`, scale down by `0.96` to keep particles in bounds
- **Runs every frame** in `useFrame` via ping-pong swap

#### 2. **Points Render** (to offscreen RT)
- **Geometry**: `Points` with 62,500 vertices; each vertex fetches its position from the positions texture via `aRef` attribute
- **Shader**: `pointsVert` + `pointsFrag`
  - Fetches position from `uPositions` texture
  - Colors by radius (blue→cyan→white gradient)
  - Per-particle dropout: `if (vSeed < uDropout) discard;`
  - Gaussian falloff for soft sprite: `exp(-5.0 * d²)`
  - Additive blending with very low alpha (`0.06–0.16` range)
- **Target**: `pointsRT` (screen resolution × DPR, RGBA16F)

#### 3. **Trails Composite** (accumulation)
- **FBOs**: `trailsA` ↔ `trailsB` (screen resolution × DPR, RGBA16F)
- **Shader**: `compositeFrag`
  ```glsl
  vec3 accum = uDecay * prevTrails + uGain * currentPoints;
  ```
- **Effect**: creates "persistence buffer" — trails fade over time based on `uDecay`
- **Scroll-driven**: `uDecay` lerps from `START_DECAY` → `END_DECAY` as user scrolls (more coherence = longer trails)

#### 4. **Present Plane** (camera-pinned quad)
- **Material**: `presentMat` (just blits `trailsTexture` to a full-screen quad)
- **Positioning**: plane placed 1 unit in front of camera, scaled to match frustum width/height with 1.5× overscan to prevent edge clipping
- **Updates every frame** to follow camera rotation
- **Why camera-pinned?**: R3F's render loop expects a scene graph; direct-to-framebuffer breaks this, so we use a plane instead

### OrbitControls (drag-to-rotate)

**Implementation**: `GlobalOrbit` component
- **Attaches to `document.body`** so drag events register even when canvas is behind content
- **Smart interaction detection**: only enables rotation if drag starts on non-interactive elements (not links/buttons/inputs)
- **Cursor feedback**: `grabbing` cursor during drag
- **Auto-rotate**: subtle rotation when idle (`autoRotateSpeed: 0.2`)
- **Disabled by default**, enabled only during drag to avoid stealing page interactions

### Scroll Integration

- **`useScroll()` from Framer Motion**: tracks scroll progress
- **Spring animation**: `useSpring()` smooths scroll → coherence mapping
- **`coherence` parameter** (0→1):
  - Lerps Thomas `a` parameter from `START_A` → `END_A`
  - Lerps trail `decay` from `START_DECAY` → `END_DECAY`
  - **Effect**: attractor becomes more ordered as user scrolls through page

### Known Issues & TODOs

#### ✅ Fixed
- Particles too small/faint → increased `POINT_SIZE_PX` and `BRIGHTNESS`
- Camera rotation not working → removed `CameraParallax` (was fighting `OrbitControls`)
- Top/bottom clipping → increased overscan to 1.5×

#### 🚧 Outstanding
- **OrbitControls might still conflict with page scroll** on touch devices — may need pointer capture
- **Auto-rotate is subtle** — could be increased or disabled if user prefers
- **Constellation vs. wire balance**: over long periods (60s+), attractor can coalesce to a wire; tune `END_DECAY` lower (e.g., `0.978`) if this is undesirable

#### 💡 Future Enhancements
- **Bloom post-processing** for softer glow
- **Pause on tab hidden** to save GPU
- **Hover hint overlay** ("Drag to explore") that fades after first interaction
- **Responsive tunables**: different settings for mobile vs. desktop
- **Color mode toggle**: current is blue→cyan→white; could add other palettes

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
   - Open `http://localhost:3000` (or `3001` if port conflict)
   - Verify particles visible and rotating
3. ✅ **No console errors** (especially from Three.js or R3F)
4. ✅ **Drag-to-rotate works** (cursor changes to `grabbing`, attractor rotates)
5. ✅ **Links and buttons clickable** (drag should not interfere)
6. ✅ **Scroll-driven coherence** (attractor becomes more ordered as you scroll)
7. ✅ **No top/bottom clipping** (check at various zoom levels and DPRs)
8. ✅ **Mobile responsive** (test on actual device or Chrome DevTools)

**CRITICAL RULE:** ⚠️ **NEVER DEPLOY TO VERCEL WITHOUT TESTING LOCALLY FIRST.** ⚠️

If the build fails locally, it will fail on Vercel. If you see errors in local dev, fix them before pushing.

---

## Common Tasks

### Adjust Particle Visibility

Edit `components/AttractorBG.tsx` tunables:
- **Brighter**: increase `BRIGHTNESS` (e.g., `2.5`)
- **Larger points**: increase `POINT_SIZE_PX` (e.g., `3.0`)
- **More particles visible**: lower `DROPOUT` (e.g., `0.15`)

### Adjust Attractor Size

- **Smaller on screen**: lower `SCALE_ON_SCREEN` (e.g., `5.0`)
- **Larger on screen**: raise `SCALE_ON_SCREEN` (e.g., `8.0`)

### Change Scroll Coherence Behavior

- **Slower coherence**: increase scroll multiplier in `AttractorBG`:
  ```ts
  coherenceSpring.set(Math.min(1, v * 1.0)); // was 1.4
  ```
- **Longer trails at end**: raise `END_DECAY` (e.g., `0.985`)
- **Shorter trails at end**: lower `END_DECAY` (e.g., `0.978`)

### Add New Section to Landing Page

1. Add `<section>` in `app/page.tsx` (after Contact, before Footer, for example)
2. Use `className="relative bg-black py-32"` for consistency
3. Wrap content in `<div className="container-px max-w-7xl mx-auto">`
4. Test scroll behavior and z-index layering

### Debug Three.js Issues

1. Check browser console for WebGL errors
2. Verify FBO creation (should see no errors about unsupported formats)
3. If particles disappear: check `uPointSize`, `uScale`, or `SCALE_ON_SCREEN`
4. If camera doesn't move: ensure `OrbitControls` isn't disabled and `CameraParallax` isn't fighting it
5. Use React DevTools to inspect `AttractorBG` props and refs

---

## Performance Notes

### Current Performance

- **60 FPS on modern GPUs** (M1+ Mac, RTX 2060+)
- **~30–45 FPS on integrated GPUs** (Intel Iris, older MacBooks)
- **Particle count**: 62,500 (reasonable for most devices)

### If Performance Issues

1. **Lower particle count**: set `SIZE = 200` (40,000 particles)
2. **Lower DPR**: change `dpr={[1, 2]}` to `dpr={[1, 1.5]}` in Canvas
3. **Disable auto-rotate**: set `autoRotate={false}` in `GlobalOrbit`
4. **Reduce trail accumulation quality**: use lower resolution for `trailsRT` (multiply by 0.5)

### GPU Memory

- **Positions FBOs**: 250×250×4 floats × 2 = ~500 KB
- **Trails FBOs**: 1920×1080×4 halffloats × 2 × DPR = ~8–16 MB (typical)
- **Total VRAM**: < 20 MB for entire system

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

**Cause:** Shader syntax error (often variable name collision).

**Fix:** Check console for specific error line. Common issues:
- Using reserved words (`position`, `normal` in vertex shaders)
- Missing semicolons
- Type mismatches (vec3 vs. float)

### Particles not visible

1. Check `POINT_SIZE_PX` (should be > 1.0)
2. Check `SCALE_ON_SCREEN` (attractor might be off-camera if too large or small)
3. Check `BRIGHTNESS` (should be > 1.0)
4. Inspect console for WebGL context loss errors
5. Hard reload (Cmd+Shift+R) to clear shader cache

### Camera not rotating on drag

1. Verify `GlobalOrbit` is rendered in Canvas
2. Check that `CameraParallax` is NOT present (it fights OrbitControls)
3. Inspect DevTools: `console.log` inside `onDown` handler to verify pointer events fire
4. Check if an overlay is blocking pointer events (use `pointer-events: none` if needed)

### Top/bottom clipping

1. Increase overscan in present plane scale:
   ```ts
   screenPlaneRef.current.scale.set(w * 1.6, h * 1.6, 1); // was 1.5
   ```
2. Verify Canvas `className="fixed inset-0"` is correct
3. Check for parent containers with `overflow: hidden`

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
2. **No performance impact on interaction** — 60 FPS or degrade gracefully
3. **Drag-to-rotate is discoverable but not required** — auto-rotate shows 3D nature
4. **Scroll-driven coherence is symbolic** — matches "chaos → order" value prop

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

- **ADR-XXX: GPU Thomas Attractor Hero** (TODO: create ADR documenting attractor choice, ping-pong FBO approach, OrbitControls on body, and camera-pinned plane vs. direct-to-framebuffer trade-off)

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
2. **Document tunables** if adding new constants
3. **Preserve GPU ping-pong pattern** — don't break FBO swaps
4. **Test on integrated GPU** (Intel Iris) to ensure performance

### When Refactoring Styles

1. **Prefer Tailwind utilities** over inline styles (except for `#FFFFFF` cases)
2. **Keep `container-px` for horizontal padding** (don't hardcode `px-6`)
3. **Use `bg-black` for dark sections** (consistent theme)
4. **Test responsive breakpoints** (`md:`, `lg:`) across viewports

---

**Last Updated:** 2025-10-09  
**Maintained By:** Intent Systems Engineering  
**Status:** Living document — update as architecture evolves
