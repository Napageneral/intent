# Intent Systems Launch Guide 🚀

Congratulations on taking the leap! Here's everything you need to launch Intent Systems.

## What's Done ✅

### 1. Monorepo Structure
```
intent-systems/
├── intent-tool/        # Your existing tool (all history preserved)
└── website/            # New beautiful landing page
```

### 2. Website Built
- Modern Next.js 14 + Tailwind CSS + TypeScript
- Fully responsive, enterprise-grade design
- Contact form with validation & spam protection
- Email delivery via Resend API
- SEO metadata & OpenGraph tags ready
- One-click Vercel deployment

### 3. Git Ready
- All commits preserved
- Clean git history with renames
- Ready to push to GitHub: `https://github.com/Napageneral/intent.git`

---

## Next Steps to Launch

### 1. Test the Website Locally (5 minutes)

```bash
cd /Users/tyler/Desktop/projects/intent-systems/website
npm install
```

Create `.env.local`:
```env
RESEND_API_KEY=re_your_key_here
CONTACT_RECIPIENT=hello@intent-systems.com
NEXT_PUBLIC_SITE_URL=https://intent-systems.com
```

```bash
npm run dev
```

Open http://localhost:3000 and test the contact form!

### 2. Set Up Resend (10 minutes)

1. Go to [resend.com](https://resend.com) and sign up
2. Add and verify your domain: `intent-systems.com`
3. Create an API key
4. Verify the sender address: `noreply@intent-systems.com`

**Quick DNS Records for intent-systems.com:**
Resend will give you SPF, DKIM, and DMARC records to add to your DNS.

### 3. Deploy to Vercel (5 minutes)

```bash
# Push to GitHub first
cd /Users/tyler/Desktop/projects/intent-systems
git push origin main
```

Then:
1. Go to [vercel.com](https://vercel.com)
2. Click **New Project** → Import from GitHub
3. Select the `intent-systems` repo
4. Set **Root Directory** to `website`
5. Add environment variables:
   - `RESEND_API_KEY` = (your Resend API key)
   - `CONTACT_RECIPIENT` = `hello@intent-systems.com`
   - `NEXT_PUBLIC_SITE_URL` = `https://intent-systems.com`
6. Click **Deploy**

### 4. Point Your Domain (5 minutes)

In your DNS provider (Namecheap, Cloudflare, etc.):

Add these records:
```
Type    Name    Value
A       @       76.76.21.21
CNAME   www     cname.vercel-dns.com
```

(Vercel will show you the exact records after deployment)

### 5. Add Images (10 minutes)

Replace these placeholders:
- `website/public/favicon.ico` — 32×32 icon
- `website/public/og-image.png` — 1200×630 social share image

**Quick tools:**
- Favicon: [favicon.io](https://favicon.io)
- OG Image: [Figma](https://figma.com) or Canva (1200×630, add your logo + tagline)

---

## Your Pitch (Reference)

### One-liner
*We make AI actually effective on legacy codebases—by turning your code into agent-ready context and upskilling your engineers.*

### 30-second pitch
*Most enterprises tried "paste the repo into an LLM" and got generic answers. The missing ingredient is context engineering at the code level. We deploy Intent, our layered guidance system (agents.md + verification), measure Agent Effectiveness on real tasks, and train your teams to maintain it. In 4–6 weeks we take a legacy service from "LLMs hallucinate" to "agents ship safe changes your leads would approve."*

### Your Offers

1. **Agent Effectiveness Assessment** (2 weeks) → $35k–$60k
   - Baseline how "agent-ready" the code is
   - AES score + top 10 targets + rollout plan

2. **Pilot Modernization Sprint** (4–6 weeks) → $120k–$250k
   - Layered agents.md + Intent tool installed
   - AES +40–70 pts, lead-time –30%

3. **Scale-out & Enablement** (quarterly) → $300k–$750k/quarter
   - Roll to 6–12 services
   - Org-wide coverage >80%
   - Quarterly value reports

---

## ICP (Ideal Customer Profile)

**Companies:**
- 200–5,000 engineers
- Regulated or risk-averse (finance, healthcare, enterprise SaaS)
- Multiple services/monorepos
- Mix of Java/.NET/TS/Python
- Modernization pressure

**Buyers:**
- CTO, VP Engineering, Head of Platform/DevEx
- Allies in Compliance & Security

**Triggers:**
- Board AI mandate
- Stalled AI PoCs
- Cloud migration
- Audit readiness
- Talent churn
- Merger integration

---

## Quick Wins (First 30 Days)

### Week 1: Foundation
- ✅ Website live (DONE!)
- ✅ Domain pointing to Vercel
- ✅ Email working (test with yourself)
- Create LinkedIn profile for Intent Systems
- Update your personal LinkedIn with new role

### Week 2: Outreach Prep
- Write 3 LinkedIn posts about:
  1. Why agents fail on legacy code
  2. What is Agent Effectiveness Score (AES)
  3. Your story (quitting to solve this)
- Build a list of 50 target companies (use your network)
- Draft cold email templates

### Week 3: First Conversations
- Reach out to 10 warm leads (former colleagues, CTOs you know)
- Offer free Assessment to first 2 (get case studies)
- Schedule 5 discovery calls

### Week 4: Pilot Pipeline
- Refine pitch based on feedback
- Create a simple deck (10 slides, use your README structure)
- Aim for 1 paid Assessment by end of month

---

## Tools You'll Need

**Business:**
- [ ] Stripe/PayPal for payments
- [ ] DocuSign or PandaDoc for contracts
- [ ] Calendly for scheduling (free tier is fine)

**Marketing:**
- [ ] LinkedIn profile for company
- [ ] Twitter/X account (optional but useful)
- [ ] Analytics (Vercel Analytics is built-in)

**Legal/Admin:**
- [ ] LLC formation (Delaware or your state)
- [ ] Business bank account
- [ ] Simple MSA template (get from Stripe Atlas or a lawyer)

---

## Resources

**Inspiration:**
- [Tenex.co](https://tenex.co) — Similar positioning, good design reference
- [Anthropic Enterprise](https://www.anthropic.com/enterprise) — Validation for your approach

**Communities:**
- [Indie Hackers](https://indiehackers.com) — Solo founder community
- [Y Combinator Startup School](https://startupschool.org) — Free resources
- LinkedIn (post about your journey!)

---

## Need Help?

### Website Issues
All code is in `/website`. Check `README.md` for structure.

### Email Not Working
1. Verify domain in Resend
2. Check DNS records (SPF, DKIM, DMARC)
3. Test with Resend's API tester

### Positioning Questions
Refer to the pitch section above. Keep it simple:
**"We make AI effective on legacy code."**

---

## Final Checklist Before You Launch 🎯

- [ ] Website deployed to Vercel
- [ ] Domain pointing correctly (intent-systems.com)
- [ ] Email working (send yourself a test inquiry)
- [ ] Images replaced (favicon + OG image)
- [ ] Resend domain verified
- [ ] LinkedIn profile created
- [ ] First LinkedIn post written
- [ ] 10 warm leads identified
- [ ] Calendar link ready (Calendly)
- [ ] Business email signature updated

---

## You Got This! 💪

You've built something valuable. The tool works. The market needs it. Now it's time to tell people about it.

**Start with your network.** CTOs you know. Former colleagues. People who trust you.

One conversation at a time. One pilot. Then scale.

The hardest part is already done—you took the leap.

---

## Quick Reference

**Website:** https://intent-systems.com
**Email:** hello@intent-systems.com
**Repo:** /Users/tyler/Desktop/projects/intent-systems
**Tool:** /Users/tyler/Desktop/projects/intent-systems/intent-tool
**Website:** /Users/tyler/Desktop/projects/intent-systems/website

---

**Built with ❤️ and Claude. Now go make it happen.**

