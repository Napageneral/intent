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
1. **Hero** - Thomas attractor particle system (GPU ping-pong) that stabilizes as user scrolls
   - 65k particles rendered with WebGL shaders
   - Chaos → order visual metaphor for Intent system
   - Scroll controls "coherence" parameter (0.10 → 0.21)
2. **Our Approach** - Context & Transformation cards
3. **The Choice** - Emotional stark section
4. **AI isn't scary** - Visual + social proof
5. **Contact** - Dark form

## Technical Implementation: GPU Particle System

### Thomas Attractor with Ping-Pong FBOs

The hero uses a GPU-compute approach to simulate 65,536 particles (256×256 texture):

**Architecture:**
- Two Frame Buffer Objects (ping/pong) alternate roles each frame
- Compute shader updates particle positions based on Thomas attractor equations
- Render shader displays particles as Points with size attenuation
- Scroll position controls "coherence" parameter `a` (0.10 → 0.21)

**Thomas Attractor Equations:**
```glsl
dx = (-a*x + sin(y)) * dt
dy = (-a*y + sin(z)) * dt  
dz = (-a*z + sin(x)) * dt
```

**Key Files:**
- `components/AttractorHero.tsx` - Main component with GPU compute logic
- Uses `@react-three/fiber` + `@react-three/drei` for Three.js/React integration
- `framer-motion` for smooth scroll-driven parameter animation

**Performance:**
- ~60 FPS on most devices
- Additive blending for glowing particle trails
- Dynamic import with SSR disabled to avoid server-side Three.js issues

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

**CRITICAL:** Always run production build test before pushing to ensure Vercel deployment will succeed:
```bash
npm run build  # Must pass with no errors
```

**Dev Server Test:**
Always verify the dev server runs successfully (`npm run dev`) before handing back to user. Test that http://localhost:3000 returns 200 and renders correctly.

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

