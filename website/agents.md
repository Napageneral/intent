# Website — Intent Systems Landing Page

## What Lives Here

One-page marketing site for Intent Systems. Modern Next.js 14 (App Router) with Tailwind CSS and TypeScript. Email inquiries flow to `hello@intent-systems.com` via Resend.

**Purpose:** Convert enterprise prospects → Agent Effectiveness Assessment ($35k–$60k entry offer).

## Architecture

```
website/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout, SEO metadata, Analytics
│   ├── page.tsx           # Tenex-style landing page (stark, emotional)
│   ├── globals.css        # Tailwind + custom styles
│   └── api/contact/       # Form submission endpoint
├── components/            # Reusable UI components
├── lib/                   # Business logic (email, validation)
├── public/               # Static assets (favicon, OG image)
└── .intent/              # Intent system config
```

## Design Philosophy (Tenex-Inspired)

**Stark, Emotional, Minimal** - The landing page is designed to make visitors *feel* something, not explain everything.

**Key Principles:**
- **All-black backgrounds** with yellow accent (#FFD700 / text-yellow-400)
- **Massive, bold typography** - Hero up to text-8xl, body text-3xl
- **Monospace fonts** for hero text (technical/pixelated feel with glow)
- **Pure white text** (#FFFFFF) for maximum contrast and readability
- **Minimal chrome** - Transparent header with logo + hamburger, no sticky nav
- **Prominent corner brackets** - w-16 h-16 border-2 border-white/30 on key sections
- **Sharp edges everywhere** - No rounded corners on any CTAs or buttons
- **Wide layouts** - max-w-7xl containers with minimal padding (px-2 md:px-4)
- **Tight line spacing** - lineHeight: 1.4 for compact, impactful text blocks
- **Horizontal CTA rows** - Text | divider | button layout (Tenex style)
- **Full-screen sections** - min-h-screen for dramatic scroll moments
- **Single-line headlines** - whitespace-nowrap prevents awkward wrapping

**Page Structure:**
1. **Hero** - "Win the next decade" with bottom CTA row
2. **Our Approach** - Context & Transformation cards
3. **The Choice** - Emotional stark section
4. **AI isn't scary** - Visual + social proof
5. **Contact** - Dark form

## Hero Visual — GPU Attractor (current state)

We are building a Thomas attractor background that becomes more coherent as the user scrolls.

Implementation (current):
- React Three Fiber `Canvas` with manual ping‑pong FBOs (`THREE.WebGLRenderTarget`) storing particle positions
- 62,500 particles (250×250) updated in a compute fragment shader using Thomas equations
- Render as `Points` in a custom shader, color modes: `solid`, `radius` (default), `angular`
- Scroll (`framer-motion` spring) controls parameter `a` to move from chaotic → coherent
- Dynamic import with `ssr: false`; the hero is a client component to avoid SSR/Three issues
- Current scene scaling: attractor positions scaled 10×, camera ~z=60 for a wider view

What matches the reference:
- Chaotic → coherent motion (Thomas attractor), scroll‑driven
- Fine, high‑density particle field with blue→cyan→white gradient

What does NOT yet match the reference (open issues):
- The reference shows extremely fine, continuous “hairline” trails; our points create visibly solid ends (“sausages”).
- The attractor feels small relative to the viewport unless the camera is moved; increasing point size makes ends look solid.
- We occasionally see `THREE.WebGLRenderer: Context Lost` during HMR; this is a dev‑only artifact but noisy.

Planned improvements (next steps):
- Trails via accumulation buffer: render into an accumulation FBO each frame with decay (e.g., `accum = accum * 0.96 + currentPoints` using additive blending), then present to screen. This produces hairline trails without increasing point size.
- Alternative trails: keep a “previous positions” texture and draw line segments from prev→curr (requires a second positions FBO and a line rendering pass).
- Scale without zoom: add a uniform `uScale` and multiply positions in the vertex shader, or apply a parent transform scale to the `points` node. This enlarges the attractor on screen without changing camera or point size.
- Tunables to expose for art direction: `SIZE` (density), `uPointSize`, `uScale`, `coherence mapping`, color palette.

Testing notes:
- When changing shader code, perform a hard reload to avoid HMR context loss.
- Keep dpr `[1,2]`; avoid antialias to preserve crisp trails with accumulation.

## Golden Paths

### Deploy to Production
```bash
# 1. Set up environment
cp .env.local.example .env.local
# Add RESEND_API_KEY and CONTACT_RECIPIENT

# 2. Test locally
npm install
npm run dev  # http://localhost:3000

# 3. Deploy to Vercel
# Push to GitHub, import in Vercel, set env vars, deploy
# Set Root Directory: website
```

### Add/Edit Content
1. Hero, sections: `app/page.tsx`
2. Brand colors: `tailwind.config.ts`
3. Email logic: `lib/email.ts`
4. Form fields: `components/ContactForm.tsx`

### Test Contact Form
```bash
# Ensure .env.local has valid RESEND_API_KEY
npm run dev
# Fill form at /#contact
# Check inbox at CONTACT_RECIPIENT
```

## Invariants

- **All copy** positioned around "Make AI effective on legacy code"
- **Entry offer** is Agent Effectiveness Assessment (2 weeks, $35k–$60k)
- **Email recipient** must be `hello@intent-systems.com` (configurable via env)
- **Security messaging** emphasizes VPC/on-prem, data boundaries
- **Metrics** anchor on AES (Agent Effectiveness Score)
- **Design** clean, enterprise, fast (Tenex.co vibe)

## Key Signals

### Environment Variables
```env
RESEND_API_KEY              # Required for email delivery
CONTACT_RECIPIENT           # Defaults to hello@intent-systems.com
CONTACT_CC                  # Optional CC list
NEXT_PUBLIC_SITE_URL        # For OpenGraph metadata
```

### API Routes
- `POST /api/contact` → Zod validation → Resend → 200 OK

### Components
- `ContactForm` → client component with state
- `Logo`, `PrimaryButton`, `FeatureCard`, `MetricCard` → server components
- All use Tailwind utility classes (no CSS modules)

### Email Format
Subject: `New inquiry (${interest}) — ${company} / ${name}`

## Pitfalls

- **Email not working?** Check Resend domain verification (SPF, DKIM, DMARC records)
- **Form submission fails?** Verify `RESEND_API_KEY` is set in Vercel env vars
- **Styling broken?** Run `npm install` (Tailwind needs PostCSS config)
- **Honeypot triggering?** The `website` field must stay hidden (CSS `hidden` class)
- **Build fails on Vercel?** Ensure Root Directory is set to `website` in project settings

## Dependencies

```json
{
  "next": "14.2.5",           // App Router, React Server Components
  "react": "18.3.1",
  "tailwindcss": "3.4.10",    // Utility-first CSS
  "zod": "3.23.8",            // Form validation
  "resend": "3.4.0",          // Email delivery
  "typescript": "5.5.4"
}
```

## Related

- **Tool integration**: `../intent-tool/` (same monorepo)
- **Business strategy**: `../biz-docs/LAUNCH_GUIDE.md`
- **Monorepo overview**: `../agents.md`

## Testing Checklist

**🚨 CRITICAL - NEVER DEPLOY WITHOUT TESTING 🚨**

**Required testing steps BEFORE any git push:**

1. **Dev server test:**
```bash
npm run dev
# Visit http://localhost:3000
# Verify page loads without errors
# Check browser console for errors
# Test scroll behavior, CTAs, forms
```

2. **Production build test:**
```bash
npm run build  # Must pass with no errors
npm start      # Test production build locally
```

3. **Browser verification:**
- Use browser tools to visually inspect
- Check for console errors
- Test on both desktop and mobile viewport
- Verify all sections render correctly

**If ANY test fails, DO NOT push to git.**

**Design Verification:**
- [ ] Hero text fits on one line (responsive sizing)
- [ ] All CTAs have sharp corners (no `rounded-md`)
- [ ] Bottom CTA row is horizontal (text | divider | button)
- [ ] Header has increased padding (ml-4, mr-4, pt-4)
- [ ] White text uses high contrast (#FFFFFF, #E5E5E5)
- [ ] No corner brackets on hero section

**Common Build Issues:**
- ❌ `@vercel/analytics/next` → ✅ Use `@vercel/analytics/react` for Next.js App Router
- ❌ Missing env vars in `.env.local` (won't break build but will break email)
- ❌ Unescaped quotes in JSX strings

Before deploying:
- [ ] Dev server starts without errors (`npm run dev`)
- [ ] Homepage loads at http://localhost:3000 (200 OK)
- [ ] Form submits successfully (check email received)
- [ ] All links work (nav, anchor links)
- [ ] Mobile responsive (test on small screen)
- [ ] Favicon and OG image present
- [ ] Env vars set in Vercel
- [ ] Domain DNS pointing to Vercel
- [ ] Resend sender verified

