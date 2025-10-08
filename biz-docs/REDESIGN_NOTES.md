# Website Redesign Notes

**Date:** October 8, 2025  
**Inspiration:** Tenex.co + Claude's code modernization page

## What Changed

### 🎯 Overall Philosophy

**Before:** Template-y, card-heavy, centered layout  
**After:** Premium, confident, enterprise-grade with clear visual hierarchy

### 🎨 Hero Section

**Visual Improvements:**
- **Typography**: Bumped to 4xl → 5xl → 6xl responsive scale
- **Layout**: Left-aligned for authority and scannability (Tenex style)
- **Spacing**: Increased padding py-24 → py-32 for breathing room
- **Background**: Subtle radial gradient instead of linear
- **Max-width**: 6xl → 7xl for more horizontal space

**New Elements:**
- ✅ **Layered context diagram** (replaces generic code block)
  - Shows System → Service → Feature hierarchy
  - Visual representation of agents.md at each layer
  - Verification layer with tags (routes, queues, envs, logs)
  - Gradient backgrounds per layer for depth
- ✅ **Logo wall placeholders** for social proof
- ✅ **Dual CTAs**: Primary + "Book a 20-min fit call" secondary
- ✅ Removed metric cards from hero (moved to Outcomes)

**Copy:** Same strong positioning, better hierarchy

---

### 📊 Outcomes Section

**Visual Changes:**
- **Removed cards**: Clean metric display, no borders
- **Typography**: Large 4xl/5xl numbers for impact
- **Layout**: Simple 3-column grid
- **Background**: Subtle gradient (brand-50/30)

**Content:**
- **Metric 1**: +40–70 AES improvement (with explainer)
- **Metric 2**: –30% lead time
- **Metric 3**: –50% reverts
- Each has clear title + explanation + micro-footnote

---

### 🔄 How It Works Section

**Visual Changes:**
- **From 3 cards → 4 steps** in a row
- **Numbered badges**: Circle with brand background
- **No borders**: Cleaner, less "cardy"
- **Timeline**: "Typical pilot: 4–6 weeks" at bottom

**Steps:**
1. **Map** - Baseline AES on real tasks
2. **Guide** - Generate agents.md at right scopes
3. **Verify** - Wire doc-tests and PR nudges
4. **Train** - Upskill champions, add IDE/CI commands

---

### 🎯 Mid-Page CTA (NEW!)

**Purpose:** Reinforce conversion after they see outcomes

**Design:**
- Centered, gradient background (gray-50 → brand-50/50)
- Clean rounded border
- Dual CTAs (same as hero)
- Concise copy: "Two-week assessment. Clear plan to pilot."

**Placement:** Between Outcomes and What We Install

---

### 🛠️ What We Install

**Changes:**
- **Removed cards**: Simple 3-column layout
- **Cleaner copy**: Shorter, punchier bullets
- **No boxes**: Just title + description

**Content:**
1. agents.md hierarchy
2. Verification (drift checks)
3. Integrations (IDE/CI)

---

### 🔒 Security Section

**Changes:**
- Same simplified treatment (no cards)
- Subtle gradient background (white → gray-50)
- 3-column clean layout

**Content:**
1. Private by default
2. Role-based access
3. Audit trails

---

### 📧 Contact Section

**Visual:**
- Larger heading scale (3xl → 4xl)
- Better form container (rounded-2xl, shadow-lg)
- More padding (p-6 → p-8)

**Copy:** Same strong CTA, "typical engagements begin within 1-2 weeks"

---

### 🎨 Header & Footer

**Header:**
- Taller (h-14 → h-16)
- More translucent (bg-white/70 → bg-white/80)
- Wider nav spacing
- Smoother transitions

**Footer:**
- Gray background (bg-gray-50)
- Better vertical spacing
- Added tagline under logo
- Email link prominent

---

### 📐 Typography & Spacing

**Global Changes:**
- Base font: **17px on desktop** (16px mobile) - premium feel
- Line-height: 1.6 for readability
- Smooth scroll behavior
- Transition animations on all links/buttons

**Section Padding:**
- Standard: `py-20 md:py-28` (was `py-16 md:py-24`)
- More air, more confidence

**Max Width:**
- Most sections: `max-w-7xl` (was `max-w-6xl`)
- Wider, more spacious feel

---

## 🎯 Key Wins

### 1. **Visual Hierarchy**
Before: Everything looked the same (cards, cards, cards)  
After: Clear sections with varied backgrounds, no borders

### 2. **Social Proof**
Before: Nothing  
After: Logo wall placeholders (ready for real logos)

### 3. **Conversion Paths**
Before: CTA only at top/bottom  
After: Hero CTA + Mid-page CTA + Contact CTA (3 opportunities)

### 4. **Differentiation**
Before: Generic code snippet  
After: Visual diagram showing layered context system (your unique approach)

### 5. **Enterprise Feel**
Before: Startup template vibe  
After: Confident, spacious, premium (like Tenex)

---

## 🚀 What's Left (Optional Next Iterations)

### Phase 2 Improvements
- [ ] Replace logo placeholders with real client marks (anonymized if needed)
- [ ] Add Calendly integration for "Book a call" CTA
- [ ] Micro-animations on scroll (fade-in, etc.)
- [ ] Case study tile/testimonial (even anonymized)
- [ ] Dark mode toggle? (probably not needed for B2B)

### Content
- [ ] Link to Anthropic's code modernization playbook (credibility)
- [ ] Add "Why agents fail on legacy" explainer (optional blog section)
- [ ] Video demo or Loom walkthrough embedded

### Assets
- [ ] Real favicon (replace placeholder)
- [ ] OG image (1200×630) with logo + tagline
- [ ] Optional: hero illustration or abstract diagram

---

## 📊 A/B Test Ideas (Future)

1. **Hero CTA copy:**
   - "Request the Assessment" vs "Get the Assessment" vs "Start the Assessment"

2. **Secondary CTA:**
   - "Book a 20-min fit call" vs "Schedule a demo" vs "Talk to us"

3. **Logo wall:**
   - Show vs hide (measure conversion impact)

4. **Mid-page CTA placement:**
   - After Outcomes vs after How It Works

---

## 🎨 Design System Notes

**Colors:**
- Primary: `brand-600` (#165fe6)
- Backgrounds: `brand-50`, `gray-50`, gradients
- Text: `gray-900` (headings), `gray-600` (body), `gray-500` (muted)

**Typography Scale:**
- Hero H1: `text-4xl md:text-5xl lg:text-6xl`
- Section H2: `text-3xl md:text-4xl`
- Body: `text-lg` (large paragraphs), `text-base` (default)
- Micro: `text-sm`, `text-xs`

**Spacing:**
- Sections: `py-20 md:py-28`
- Content padding: `px-6 md:px-8`
- Max-width: `max-w-7xl`
- Gaps: `gap-8` (large), `gap-3` (small)

---

## 🔍 Comparison to Inspirations

### Tenex.co
**What we borrowed:**
- Bold, large typography with high contrast
- Minimal chrome, lots of whitespace
- Left-aligned content for authority
- Clean, confident aesthetic

**What we kept different:**
- Lighter background (Tenex uses more dark sections)
- More explicit CTAs (Tenex is more subtle)
- Product-focused (we show the tool, Tenex is more abstract)

### Claude Code Modernization
**What we borrowed:**
- Clear benefit-driven headline
- Scannable blocks explaining how/why
- Multiple CTAs throughout the page
- Enterprise positioning

**What we kept different:**
- We're more specific about our method (agents.md, AES)
- Visual diagram showing our unique approach
- Less corporate, more technical credibility

---

## 💡 Philosophy Summary

**Intent Systems = Tenex's confidence + Claude's credibility + our unique method**

1. **Confident:** Large type, bold claims, clear positioning
2. **Credible:** Metrics, process, security, enterprise-ready
3. **Different:** Visual layered context diagram, AES metric, dogfooding our own tool

---

## 📱 Mobile Considerations

All changes are fully responsive:
- Hero stacks on mobile (text → diagram)
- 4-column grid becomes 2-column, then stacks
- Typography scales down gracefully
- Logo wall wraps
- Mid-page CTA stays centered

---

## ⚡ Performance

No performance regressions:
- No images added (just CSS gradients)
- No heavy animations
- Vercel Analytics remains lightweight
- Form still client-side only where needed

---

## 🎉 Result

**Before:** "This looks like a template"  
**After:** "This looks like a real company"

The redesign removes the generic SaaS template feel and gives Intent Systems a premium, enterprise-worthy presence that matches the sophistication of the product.

---

**Ready to share with your cofounder!** 💜

