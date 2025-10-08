# Intent Systems — One-page Site

Modern one-page marketing site for Intent Systems. Built with **Next.js (App Router)**, **Tailwind**, and **TypeScript**. Email inquiries via **Resend**.

## Quick start

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local and set RESEND_API_KEY and CONTACT_RECIPIENT
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Create a `.env.local` file with:

```env
# Required for email delivery
RESEND_API_KEY=your_resend_api_key

# Who receives inbound inquiries (defaults to hello@intent-systems.com)
CONTACT_RECIPIENT=hello@intent-systems.com

# Optional CC list
CONTACT_CC=

# Public site URL for absolute links in OpenGraph
NEXT_PUBLIC_SITE_URL=https://intent-systems.com
```

## Deploy to Vercel

1. Push this repo to GitHub
2. Click **New Project** in Vercel and import the repo
3. Add environment variables in Vercel:
   - `RESEND_API_KEY`
   - `CONTACT_RECIPIENT` = `hello@intent-systems.com`
   - (optional) `CONTACT_CC`
   - `NEXT_PUBLIC_SITE_URL` = `https://intent-systems.com`
4. Deploy

**Note:** You'll need to verify `noreply@intent-systems.com` (or your chosen sender) in Resend to pass DMARC.

## Customize

- **Copy:** Update text in `app/page.tsx`
- **Brand colors:** Modify `tailwind.config.ts`
- **Images:** Replace `/public/og-image.png` and `/public/favicon.ico`
- **Email sender:** Update sender address in `lib/email.ts`

## Structure

```
website/
├── app/
│   ├── api/contact/route.ts    # Contact form API endpoint
│   ├── layout.tsx               # Root layout with metadata
│   ├── page.tsx                 # Main landing page
│   └── globals.css              # Global styles
├── components/
│   ├── ContactForm.tsx          # Contact form with validation
│   ├── FeatureCard.tsx          # Feature card component
│   ├── Logo.tsx                 # Intent Systems logo
│   ├── MetricCard.tsx           # Metric display component
│   ├── PrimaryButton.tsx        # Primary CTA button
│   └── SectionHeading.tsx       # Section header component
├── lib/
│   ├── email.ts                 # Email sending via Resend
│   └── validators.ts            # Zod schemas for form validation
└── public/
    ├── favicon.ico              # Site favicon
    └── og-image.png             # OpenGraph social image (1200×630)
```

## Features

- ✅ Fully responsive design
- ✅ Modern gradient aesthetics
- ✅ Contact form with validation
- ✅ Honeypot spam protection
- ✅ Email delivery via Resend
- ✅ SEO metadata & OpenGraph tags
- ✅ TypeScript throughout
- ✅ One-click Vercel deploy

## Email Service

This site uses [Resend](https://resend.com) for transactional email. To switch to **Postmark** or **SendGrid**, update `lib/email.ts` accordingly.

## License

© 2025 Intent Systems. All rights reserved.

