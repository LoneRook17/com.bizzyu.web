# Business Dashboard v2 — Redesign (isolated, for review)

A complete redesign of the business dashboard on **shadcn/ui + Radix** in the warm Mercury/Notion direction you approved. It lives entirely under **`/business/v2`** and does **not** touch the existing `/business` dashboard.

- **Branch:** `feature/dashboard-redesign`
- **URL:** `http://localhost:3001/business/v2`
- **New code only:** `src/app/business/v2/**`, `src/components/business/v2/**`, `src/lib/v2/**`
- **Existing files modified:** none (verified). New deps added: `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`.
- **Typecheck:** `npx tsc --noEmit` → **0 errors** across the whole project.

---

## Run it (on your Mac)

```bash
cd ~/Developer/bizzy/com.bizzyu.web
# you're already on the feature/dashboard-redesign branch
rm -f .git/index.lock                 # clear a harmless stale lock left by the sandbox
git add -A && git commit -m "feat(business-v2): all pages"   # capture the uncommitted v2 pages
npm install                           # ensure the new deps are installed
npm run dev -- -p 3001
```

Open `http://localhost:3001/business/v2`. If you're sent to login, sign in via the existing `/business/login`, then go back to `/business/v2`.

> Tip: open the old `/business` and the new `/business/v2` in two tabs to compare directly.

---

## What's included (all pages)

- **Home** — restructured: metric tiles, a "Needs your attention" hub, and a bento (upcoming events + recent activity)
- **Trial / intro** — the pre-approval "path to going live" onboarding (shown automatically for pending businesses)
- **Events** — list (tabs), create/edit, detail, and the full **manage** hub (tickets, team, promoters, promo codes, announcements, SMS blast, analytics, check-ins, scanner)
- **Deals** — list/create/edit/detail · **Line skips** — list/create/edit/detail/instance
- **Analytics** (role-based) · **Marketing** (event + follower blasts) · **Universal promo codes**
- **Team** · **Settings** (profile, logo, Stripe Connect, venues, security) · **QR Scanner** · **Help**

Every page calls the **same APIs** as the current dashboard — it's a reskin + restructure, not a rewrite of the data layer.

## Design system

shadcn/Radix primitives in `src/components/business/v2/ui/` (Button, Card, Badge, Input/Select/Textarea, Tabs, Dialog, DropdownMenu, Avatar, Progress, Skeleton, Separator, Tooltip, EmptyState). Tokens: Untitled-UI-derived neutral ramp (= Tailwind `neutral-*`), brand green `#079455`, soft shadows. **`globals.css` is untouched** — isolation is class-based.

## Known gaps / decisions (worth knowing during review)

- **Auth screens** (login/signup/verify/reset) are **not** restyled yet — v2 reuses the existing ones. Restyling them needs a 1-line additive change to `src/middleware.ts` to register the v2 auth paths. Say the word and I'll add it.
- The Home **attention hub** is populated from *derived* real data; a dedicated backend feed would make it richer.
- **List pages** fetch `limit=50` rather than server pagination (no v2 Pagination primitive yet — easy to add).
- The **relocated approval gate** is reflected in the UI (pending users explore + build; locked features are marked), but true "queue until approved" enforcement is a backend change (see `DASHBOARD_REWORK_PRD.md`).

## Adopt or discard

- **Adopt** → promote v2 into `/business` (rename the route folders or repoint), or merge the branch.
- **Discard** → `git checkout dev && git branch -D feature/dashboard-redesign` — zero footprint on the live app.

## Before merging to production

Run `npm run build` once — tsc passes with 0 errors; a build confirms prerender. (Dev mode `npm run dev` works regardless.)

---

## Prod cutover checklist (do NOT forget)

Items that exist on `feature/dashboard-redesign` / dev but need explicit action
when promoting to prod:

- [ ] **Public page redesigns ride this branch**: `/venue/[venueId]` and
      `/lineskip/[slug]` (gold-accent line-skip checkout, marketing chrome
      stripped via `LayoutShell`). Merging this branch to prod ships them —
      review them on the dev preview BEFORE merging.
- [ ] **`TURNSTILE_SECRET_KEY`** must be set in the prod services task-def —
      dev fails open (no captcha) without it; prod must not.
- [ ] **`businesses.dashboard_mode` migration** must run on prod RDS BEFORE the
      prod services image that reads/writes it (see notes/pending-migrations.md).
- [ ] **Signup auto-login + no email verification** (services `48c9784`+) and
      pending-business login: prod admin workflow must be ready for trial-mode
      businesses before these hit prod.
- [ ] **Checkout success pages** (Laravel): logo now links to bizzyu.com and
      has a "Buy more tickets" button — deploy core to prod EC2 + `view:clear`.
- [ ] **Env sanity on prod Vercel project**: `CHECKOUT_REDIRECT_BASE_URL` /
      `LARAVEL_CHECKOUT_BASE_URL` → https://bizzy-deals.com, `INTERNAL_API_URL`
      → prod API, `NEXT_PUBLIC_WEB_BASE_URL` → https://bizzyu.com.
