# Intent Systems — Monorepo

## What Lives Here

Intent Systems monorepo: the Intent documentation tool + the public-facing website + business documentation. All colocated for rapid iteration.

**Mission:** Make AI effective on legacy codebases—by turning code into agent-ready context and upskilling engineering teams.

## Architecture

```
intent-systems/
├── intent-tool/          # The Intent documentation automation tool
│   ├── core/            # Detection, prompts, workflows
│   ├── server/          # API server with SSE streaming
│   ├── web/             # React GUI (dashboard, review, runs)
│   ├── store/           # SQLite persistence
│   └── .intent/         # Self-documenting (dogfooding)
│
├── website/             # Public landing page (Next.js)
│   ├── app/            # Next.js App Router (pages + API)
│   ├── components/     # React components (Logo, ContactForm, etc.)
│   ├── lib/            # Business logic (email, validation)
│   └── .intent/        # Website-specific Intent config
│
└── biz-docs/           # Business documentation
    └── LAUNCH_GUIDE.md # Go-to-market strategy, ICP, offers
```

## Golden Paths

### Work on the Tool
```bash
cd intent-tool
npm install
npm run dev  # GUI at http://localhost:5173, API at :3002
```

See `intent-tool/agents.md` for tool architecture.

### Work on the Website
```bash
cd website
npm install
cp .env.local.example .env.local  # Add RESEND_API_KEY
npm run dev  # http://localhost:3000
```

See `website/agents.md` for website architecture.

### Deploy Everything
```bash
# Tool: Self-hosted or cloud (see intent-tool/README.md)
# Website: Vercel (one-click deploy from GitHub)
git push origin main
```

### Business Strategy
See `biz-docs/LAUNCH_GUIDE.md` for:
- ICP (Ideal Customer Profile)
- Offer tiers (Assessment → Pilot → Enablement)
- Launch plan (first 30 days)
- Positioning vs. competitors

## Invariants

- **Tool and website** are versioned together (monorepo)
- **Intent tool** is the product we install at client sites
- **Website** is the marketing funnel (prospects → Assessments)
- **Biz-docs** stay in Cursor for rapid iteration (no separate wiki)
- **Domain**: `intent-systems.com`
- **Contact**: `hello@intent-systems.com`

## Key Signals

### Repository Structure
- `intent-tool/` → self-contained Node.js/TypeScript project
- `website/` → self-contained Next.js project (deployed separately)
- `biz-docs/` → Markdown files (not deployed, internal use)

### Git Remotes
```bash
origin  https://github.com/Napageneral/intent.git
```

### Positioning
**One-liner:** Make AI effective on your legacy code.

**Market:** Enterprise engineering orgs (200–5,000 engineers) with legacy modernization pressure.

**Wedge:** Agent Effectiveness Score (AES) — measurable ROI on AI tooling.

**Competitors:**
- Tenex.co (broad AI transformation) → we're a narrow technical wedge
- Anthropic/Claude Code (LLM seats) → we operationalize their tools inside messy codebases

## Pitfalls

- **Don't deploy biz-docs** (internal only, keep in repo for Cursor access)
- **Don't mix tool and website dependencies** (separate package.json in each)
- **Keep Intent tool dogfooded** (use it to document itself)
- **Keep positioning tight** ("legacy code + AI effectiveness" not "general consulting")

## Dependencies

Each subproject manages its own:
- `intent-tool/package.json` → Bun, TypeScript, SQLite
- `website/package.json` → Next.js, Tailwind, Resend

No shared dependencies at root (keeps deploys clean).

## Related

- **Tool docs**: `intent-tool/agents.md`
- **Website docs**: `website/agents.md`
- **Business strategy**: `biz-docs/LAUNCH_GUIDE.md`
- **ADRs**: `intent-tool/.intent/decisions/` (architectural decisions)

## Philosophy

**Intent is meta:** We use the tool to document the tool. We apply our own methodology (agents.md, verification, AES) to ourselves before we sell it.

**Colocated context:** Keep code, docs, and business strategy in one repo. Cursor is the IDE; no separate wiki/Notion needed.

**Measurable wedge:** We don't sell "AI transformation." We sell measurable Agent Effectiveness improvement on legacy systems.

---

**Status:** Active development.

### Current Focus (Oct 2025)
- Website hero visual: GPU Thomas attractor (Three.js + R3F) with scroll‑driven coherence
- Challenges: matching reference’s ultra‑fine hairline trails and large on‑screen scale without visual “solid” ends
- Next step: implement accumulation/trail rendering pass and screen‑space scaling without changing camera

