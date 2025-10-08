# Vercel Deployment Guide

Quick guide to deploy Intent Systems website to Vercel and point your domain.

## Prerequisites

- [ ] Code pushed to GitHub ✅ (Just did this!)
- [ ] Vercel account (free tier is fine)
- [ ] Domain registered at registrar (intent-systems.com)
- [ ] Resend API key (get from resend.com)

---

## Step 1: Deploy to Vercel (5 minutes)

### A. Connect GitHub to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click **"Add New..."** → **"Project"**
4. Import `Napageneral/intent` repository

### B. Configure Project

**Important settings:**

```
Project Name:           intent-systems
Framework Preset:       Next.js
Root Directory:         website          ← CRITICAL!
Build Command:          npm run build    (auto-detected)
Output Directory:       .next            (auto-detected)
Install Command:        npm install      (auto-detected)
```

### C. Add Environment Variables

Click **"Environment Variables"** and add:

```env
RESEND_API_KEY              = re_xxxxxxxxxxxxxx
CONTACT_RECIPIENT           = hello@intent-systems.com
NEXT_PUBLIC_SITE_URL        = https://intent-systems.com
```

**Where to get RESEND_API_KEY:**
1. Go to [resend.com](https://resend.com) and sign up
2. Add domain → Verify DNS records (see Step 3 below)
3. Create API Key → Copy it
4. Paste into Vercel env vars

### D. Deploy!

Click **"Deploy"**

Vercel will:
- Clone the repo
- Install dependencies
- Build the Next.js app
- Deploy to a `.vercel.app` URL

**You'll get a URL like:** `https://intent-systems.vercel.app`

---

## Step 2: Test the Deployment

Once deployed, click **"Visit"** and verify:

- [ ] Homepage loads with correct styling
- [ ] All sections visible (hero, how it works, outcomes, etc.)
- [ ] Navigation links work
- [ ] Contact form is present (don't test yet - need to configure Resend first)

---

## Step 3: Configure Resend Email (10 minutes)

### A. Sign Up for Resend

1. Go to [resend.com](https://resend.com)
2. Sign up (free tier: 3,000 emails/month, 100/day)

### B. Add Your Domain

1. Click **"Domains"** → **"Add Domain"**
2. Enter: `intent-systems.com`
3. Resend will give you DNS records like:

```
Type    Name                            Value
TXT     _resend                         [verification token]
MX      intent-systems.com              feedback-smtp.us-east-1.amazonses.com (10)
TXT     intent-systems.com              "v=spf1 include:amazonses.com ~all"
CNAME   [dkim-selector]._domainkey      [aws-ses-value].dkim.amazonses.com
```

### C. Add DNS Records

Go to your domain registrar (Namecheap, Cloudflare, etc.) and add these records.

**Wait 5-30 minutes for DNS propagation.**

### D. Verify Domain in Resend

Once DNS propagates, click **"Verify"** in Resend dashboard.

✅ Status should change to "Verified"

### E. Create API Key

1. Go to **"API Keys"** in Resend
2. Click **"Create API Key"**
3. Name: `Intent Systems Website`
4. Permission: **Full Access**
5. Copy the key (starts with `re_`)

### F. Update Vercel Environment Variable

1. Go back to Vercel dashboard
2. Project Settings → Environment Variables
3. Edit `RESEND_API_KEY` → Paste the key
4. Click **"Redeploy"** to apply the new env var

---

## Step 4: Point Your Domain to Vercel (10 minutes)

### A. Get Vercel DNS Records

In Vercel project:
1. Go to **Settings** → **Domains**
2. Add domain: `intent-systems.com`
3. Add domain: `www.intent-systems.com` (optional)

Vercel will show you the DNS records:

```
Type    Name    Value
A       @       76.76.21.21
CNAME   www     cname.vercel-dns.com
```

### B. Update DNS at Your Registrar

Go to your domain registrar and:

1. **For root domain (`intent-systems.com`):**
   - Type: `A`
   - Name: `@` or blank
   - Value: `76.76.21.21`
   - TTL: `3600` (or Auto)

2. **For www subdomain:**
   - Type: `CNAME`
   - Name: `www`
   - Value: `cname.vercel-dns.com`
   - TTL: `3600` (or Auto)

### C. Wait for DNS Propagation

- Usually takes 5-30 minutes
- Can take up to 48 hours (rare)

Check status:
```bash
dig intent-systems.com
# Should show 76.76.21.21
```

Or use: [dnschecker.org](https://dnschecker.org)

### D. Verify in Vercel

Once DNS propagates, Vercel will automatically:
- Detect the domain is pointing correctly
- Issue SSL certificate (via Let's Encrypt)
- Enable HTTPS

**Status in Vercel will show:** ✅ Valid Configuration

---

## Step 5: Final Tests

Once domain is live:

### A. Visit Your Site

- [ ] `https://intent-systems.com` loads
- [ ] `https://www.intent-systems.com` redirects (if configured)
- [ ] HTTPS works (green lock icon)
- [ ] All pages/sections load correctly

### B. Test Contact Form

1. Go to `https://intent-systems.com#contact`
2. Fill out the form with real info
3. Click **"Request the Assessment"**
4. Check `hello@intent-systems.com` for the email

Expected email format:
```
From: Intent Systems <noreply@intent-systems.com>
To: hello@intent-systems.com
Subject: New inquiry (assessment) — [Company] / [Name]

Name:    [Name]
Email:   [Email]
Company: [Company]
Role:    [Role]
Interest: assessment

Message:
[Message content]
```

---

## Troubleshooting

### "Build Failed" in Vercel

- **Check:** Root Directory is set to `website` (not blank)
- **Check:** All dependencies in `package.json`
- **Check:** No TypeScript errors (run `npm run build` locally first)

### Email Not Sending

- **Check:** `RESEND_API_KEY` is set in Vercel env vars
- **Check:** Domain is verified in Resend dashboard
- **Check:** DNS records are correct (SPF, DKIM)
- **Check:** Sender address `noreply@intent-systems.com` is allowed
- **Test:** Use Resend's API tester first

### Domain Not Pointing

- **Check:** A record points to `76.76.21.21`
- **Check:** DNS propagation (use dnschecker.org)
- **Wait:** Can take 5-30 minutes (rarely 48 hours)
- **Check:** No conflicting records at registrar

### HTTPS Not Working

- Vercel auto-provisions SSL (takes ~1 minute after DNS)
- Check domain status in Vercel dashboard
- If stuck, try: Settings → Domains → [domain] → "Refresh"

---

## Production Checklist

Before sharing publicly:

- [ ] Site loads at `intent-systems.com`
- [ ] HTTPS enabled (green lock)
- [ ] Contact form works (test submission received)
- [ ] All sections display correctly
- [ ] Mobile responsive (test on phone)
- [ ] Favicon showing (replace placeholder)
- [ ] OG image showing (test share on LinkedIn/Twitter)
- [ ] All copy reviewed (no typos)
- [ ] `hello@intent-systems.com` email monitored

---

## Sharing with Cofounder 💜

Once deployed:

```
Hey! Just deployed our Intent Systems site:
https://intent-systems.com

Check it out! The contact form goes to hello@intent-systems.com

Let me know what you think 🚀
```

---

## Post-Deployment

### Monitor Traffic

Vercel gives you free analytics:
- Project → Analytics tab
- See visits, page views, load times

### Update the Site

Changes are easy:
```bash
# Make changes locally
git add -A
git commit -m "Update homepage copy"
git push origin main

# Vercel auto-deploys in ~1 minute
```

### Environment Variables

To change env vars:
1. Vercel dashboard → Project Settings → Environment Variables
2. Edit the variable
3. Click **"Redeploy"** to apply

---

## Summary

**Time Investment:**
- Vercel setup: 5 min
- Resend setup: 10 min
- DNS configuration: 10 min
- DNS propagation wait: 5-30 min

**Total:** ~30-60 minutes from start to live site

**Result:** Production-ready website at `https://intent-systems.com` with working contact form! 🎉

---

## Quick Links

- **Vercel Dashboard:** [vercel.com/dashboard](https://vercel.com/dashboard)
- **Resend Dashboard:** [resend.com/home](https://resend.com/home)
- **DNS Checker:** [dnschecker.org](https://dnschecker.org)
- **GitHub Repo:** [github.com/Napageneral/intent](https://github.com/Napageneral/intent)

---

**You got this! 🚀**

