# Bizzy Website — Developer Guide (`com.bizzyu.web`)

## Overview

Marketing and business signup website for Bizzy (bizzyu.com). Built with **Next.js 16** (App Router), **React 19**, **Tailwind CSS v4**, and **TypeScript**. Deployed on **Vercel**.

This is a mostly static marketing site with a few server-side API routes for contact forms and deal submissions. It does **not** connect to the shared MySQL database directly — it calls the Laravel admin API (`ADMIN_API_URL`) to forward deal submissions.

---

## Directory Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── layout.tsx          # Root layout (Navbar, Footer, JSON-LD, fonts)
│   ├── page.tsx            # Homepage (students landing page)
│   ├── globals.css         # Tailwind v4 import + custom theme + animations
│   ├── about/page.tsx      # About page
│   ├── businesses/page.tsx # Business landing page (partner with Bizzy)
│   ├── contact/            # General contact form (layout.tsx + page.tsx)
│   ├── events/page.tsx     # Events/bars landing page (0% fees pitch)
│   ├── events-contact/     # Events-specific contact form
│   ├── privacy/page.tsx    # Privacy policy
│   ├── terms/page.tsx      # Terms of service
│   ├── signup/page.tsx     # Business deal submission flow (multi-step form)
│   ├── admin/submissions/  # Admin view for reviewing submissions
│   ├── sitemap.ts          # Dynamic sitemap generator
│   ├── robots.ts           # Robots.txt generator
│   └── api/                # API route handlers (Next.js Route Handlers)
│       ├── contact/route.ts         # POST — sends contact email via Resend
│       ├── events-contact/route.ts  # POST — sends events contact email via Resend
│       ├── submissions/route.ts     # POST — deal submission (email + S3 upload + forward to admin API)
│       ├── submissions/[id]/route.ts # GET/PATCH — single submission by ID
│       └── trending-deals/route.ts  # GET — fetches deals from bizzy-deals.com API
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx      # Sticky nav with desktop/mobile variants
│   │   └── Footer.tsx      # Site footer
│   ├── ui/                 # Reusable UI components
│   │   ├── Button.tsx      # Button/link component (variants: primary, outline, white)
│   │   ├── AnimatedSection.tsx  # Framer Motion scroll-triggered fade-in
│   │   ├── SectionContainer.tsx # Max-width + padding wrapper
│   │   ├── FAQ.tsx          # Expandable FAQ accordion
│   │   ├── PhoneMockup.tsx  # Phone frame for screenshots
│   │   ├── Marquee.tsx      # Infinite scroll marquee
│   │   ├── AnimatedCounter.tsx # Number counter animation
│   │   ├── CampusGrid.tsx   # Campus cards grid
│   │   ├── DealTypeGrid.tsx # Deal category grid
│   │   ├── FeatureCard.tsx  # Feature highlight card
│   │   └── ZeroFrictionBanner.tsx # "Zero friction" marketing banner
│   ├── businesses/          # Business page components
│   │   ├── HeroDealCard.tsx
│   │   ├── HowItWorks.tsx
│   │   └── Testimonials.tsx
│   ├── signup/              # Multi-step deal submission form
│   │   ├── SignupFlow.tsx   # Form orchestrator (steps + state)
│   │   ├── StepBusiness.tsx # Step 1: business info
│   │   ├── StepDeal.tsx     # Step 2: deal details
│   │   ├── StepMedia.tsx    # Step 3: logo + deal image upload
│   │   ├── StepReview.tsx   # Step 4: review & submit
│   │   ├── StepSuccess.tsx  # Step 5: confirmation
│   │   ├── StepProgress.tsx # Progress indicator
│   │   ├── DealCardPreview.tsx    # Live preview of deal card
│   │   └── MobilePreviewSheet.tsx # Bottom sheet preview on mobile
│   ├── students/
│   │   └── TrendingDeals.tsx # Fetches and displays trending deals
│   └── seo/
│       └── JsonLd.tsx       # JSON-LD structured data script tag
└── lib/
    ├── constants.ts         # App Store URL, social links, nav links, FAQs, campuses
    ├── types.ts             # TypeScript interfaces (Submission, FormData, BusinessInfo, DealInfo)
    └── submissions.ts       # File-based submission CRUD (reads/writes data/submissions.json)
```

---

## Routing

Uses **Next.js App Router** (not Pages Router). All routes are in `src/app/`.

### Pages
| Route | File | Description |
|-------|------|-------------|
| `/` | `page.tsx` | Student landing page (hero, features, deals, FAQ, CTA) |
| `/events` | `events/page.tsx` | Bar/events landing page (Tap to Pay, ticketing, 0% fees) |
| `/businesses` | `businesses/page.tsx` | Business partner landing page |
| `/signup` | `signup/page.tsx` | Multi-step deal submission form |
| `/about` | `about/page.tsx` | About Bizzy |
| `/contact` | `contact/page.tsx` | General contact form |
| `/events-contact` | `events-contact/page.tsx` | Events-specific contact form |
| `/privacy` | `privacy/page.tsx` | Privacy policy |
| `/terms` | `terms/page.tsx` | Terms of service |
| `/admin/submissions` | `admin/submissions/page.tsx` | Admin submission review dashboard |

### API Routes
| Method | Route | Handler | Description |
|--------|-------|---------|-------------|
| POST | `/api/contact` | `api/contact/route.ts` | Sends contact form email via Resend |
| POST | `/api/events-contact` | `api/events-contact/route.ts` | Sends events contact email via Resend |
| POST | `/api/submissions` | `api/submissions/route.ts` | Creates deal submission: sends email, uploads images to S3, forwards to admin API |
| GET | `/api/submissions` | `api/submissions/[...]/route.ts` | Lists all submissions (file-based) |
| GET/PATCH | `/api/submissions/[id]` | `api/submissions/[id]/route.ts` | Get/update single submission |
| GET | `/api/trending-deals` | `api/trending-deals/route.ts` | Proxies deals from `bizzy-deals.com/api/home_deals` |

---

## Styling

- **Tailwind CSS v4** via `@tailwindcss/postcss` plugin
- Theme defined inline in `globals.css` using `@theme inline` block
- Custom colors: `primary` (#05EB54), `primary-light`, `secondary`, `muted`, `ink`
- Fonts: Geist Sans + Geist Mono (loaded via `next/font/google`)
- Custom animations: `animate-float`, `animate-marquee`, `animate-marquee-half`, `green-glow`
- No CSS modules — all styling via Tailwind utility classes

---

## Key Patterns

### Component Style
- Server components by default; `"use client"` only where needed (Navbar, signup form, admin page, AnimatedSection)
- `framer-motion` for scroll-triggered animations (`AnimatedSection` wrapper)
- `next/image` for all images with explicit width/height
- Path alias: `@/*` maps to `./src/*`

### API Calls
- **Outbound**: `trending-deals` route fetches from `https://bizzy-deals.com/api/home_deals` (production Laravel API)
- **Submissions**: POST to `/api/submissions` → emails via Resend, uploads to S3, forwards to `ADMIN_API_URL`
- **Contact forms**: POST to `/api/contact` or `/api/events-contact` → emails via Resend
- No authentication on API routes (public forms)

### Data Storage
- `submissions.ts` uses file-based storage (`data/submissions.json`) for the submission admin view
- No database connection from this project

---

## Environment Variables

```bash
# Required for contact/submission form emails
RESEND_API_KEY=

# Required for deal submission image uploads
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1        # default
AWS_BUCKET=bizzy-dev         # default

# Forwards deal submissions to Laravel admin backend
ADMIN_API_URL=http://127.0.0.1:8001
```

---

## Running Locally

```bash
npm install
npm run dev -- -p 3001       # Port 3001 (3000 is used by com.bizzyu.services)
# → http://localhost:3001
```

**Note**: The `next.config.ts` has `experimental.staleTimes.static: 0` which triggers a warning — it still works fine.

---

## Deployment

Deployed on **Vercel**. `vercel.json` defines:
- Redirects from old WordPress-style URLs (`/home-3-2-2` → `/about`, etc.)
- Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy)
- Cache headers for `sitemap.xml` and `robots.txt`

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `next` (16.1.6) | Framework |
| `react` / `react-dom` (19.2.3) | UI |
| `framer-motion` | Scroll animations |
| `resend` | Email sending (contact forms, submission notifications) |
| `@aws-sdk/client-s3` | Image uploads for deal submissions |
| `tailwindcss` v4 | Styling |
