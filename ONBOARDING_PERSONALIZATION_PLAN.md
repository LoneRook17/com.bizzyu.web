# Onboarding Personalization Plan — v2 Dashboard

**Branch:** `feature/dashboard-redesign` · **Status:** planned, not started
**Decisions locked:** no user-facing email verification (emails are notification-only) · deals-only mode hides Events + Line skips entirely · mode switchable anytime in Settings.

---

## 1. Frictionless signup (no login form, no verify step)

Signup creates a session and drops the user straight into trial mode.

### Node services (`com.bizzyu.services`)
- `POST /business/auth/signup` (`businessAuth.ts` + `BusinessAuthService`):
  - After creating the business + owner user, generate the same token pair `login()` produces and set `biz_token` / `biz_refresh` / `biz_session` cookies on the signup response. Return `{ user, business, tokens }`.
  - Set `verified_at = NOW()` at creation so every legacy "is verified" check passes. Stop sending the verification email.
  - Replace it with a transactional **"Application received"** email (Resend) — purely informational.
- `BusinessAuthService.login()` / `loginTeamMember()`: remove the `EMAIL_NOT_VERIFIED` throw (vestigial once signup self-verifies). Keep `suspended` / `rejected` blocks.
- Approval email ("You're approved — your content is live") already belongs to the PRD §7 approval hook; confirm Laravel's approve action sends it.

### Web (`com.bizzyu.web`)
- Signup page: on success, `router.push("/business/v2")` (cookies are already set) instead of `/business/v2/login?registered=1`.
- TrialHome checklist: drop the "Verify your email" step → 4 steps: account ✓ → choose your setup (new, see §2) → build first deal/event → get approved.
- Keep `/business/v2/verify-email` route alive for any old links; it's harmless.

### Risk notes
- Typo'd emails are no longer caught by a verification round-trip. Mitigation: admin approval is still a human gate, and a bounced "application received" email surfaces bad addresses. Turnstile + honeypot + blocked-domain list stay on signup.
- Legacy unverified accounts become loginable — acceptable on dev; flag at prod cutover.

---

## 2. Dashboard modes: deals / events / hybrid

### Data
- New column: `businesses.dashboard_mode` — `ENUM('deals','events','hybrid')`, **NULL default** (NULL = questionnaire not answered yet).
- Migration lives in `com.bizzyu.core` (Laravel is schema source of truth; add to `notes/pending-migrations.md` per repo convention).
- Node: include `dashboard_mode` in the `/business/auth/me` business payload and the businesses model; add `PATCH /business/preferences` accepting `{ dashboard_mode }` (owner/manager only).
- Web: add `dashboard_mode?: 'deals' | 'events' | 'hybrid' | null` to `Business` in `@/lib/business/types`.

### Onboarding questionnaire (first entry)
- In the v2 dashboard layout: if authenticated and `business.dashboard_mode === null`, render a full-screen takeover (`OnboardingMode.tsx`) instead of the dashboard — same pattern as TrialHome, sits above it.
- Single question: **"What will you use Bizzy for?"** Three large selectable cards:
  - **Deals only** — "Post exclusive student deals" (badge: *Most popular*)
  - **Events & tickets** — "Sell tickets, scan, promote"
  - **Both** — "Deals and events together"
- On select → `PATCH /business/preferences` → `refreshProfile()` → land on the mode-tailored TrialHome. No skip button (hybrid is one click for the undecided); answer is changeable in Settings forever.

### Mode effects (single source of truth: `src/lib/v2/mode.ts`)
- `useDashboardMode()` hook reads `business.dashboard_mode` from `useAuth` (hybrid when null/unknown for safety).
- A `MODE_CONFIG` map drives everything:
  - **Sidebar nav** — deals: Home, Deals, Marketing, Analytics, Team, Settings (Events + Line skips hidden). events: Home, Events, Line skips, Marketing, Analytics, Team, Settings (Deals hidden). hybrid: current nav.
  - **Home page** — metric tiles, "Needs your attention," and bento cards filtered to the mode; deals mode leads with claim/redemption stats + "Create deal" CTA, events mode with ticket sales/check-ins + "Create event" CTA.
  - **TrialHome** — hero checklist step becomes "Build your first deal" / "Create your first event" / both options for hybrid.
  - **Analytics** — default tab follows mode.
- Hidden ≠ deleted: routes still exist if URL-typed; hidden sections render a small "This area is off in your deals-only setup — turn it on in Settings" empty state rather than data.

---

## 3. Settings restructure + UX fixes

### Settings page (`settings/page.tsx`)
New order (profile no longer buried at the bottom):
1. **Profile** (`ProfileForm`) — name, contact, description
2. **Logo** (`LogoUpload`)
3. **Dashboard preferences** (new) — mode radio cards (deals / events / hybrid) + **Appearance** (Light / Dark / System select, wired to `useTheme`)
4. **Payments** (`StripeConnectCard`)
5. **Venues** (`VenueManagementSection`)
6. **Danger zone** — last, as is

### Sidebar footer rework (`Sidebar.tsx`)
Replace the single avatar-dropdown row with a footer row of three controls:
- **Avatar + name** → click goes to Settings (profile section)
- **Theme icon button** (sun/moon, one click toggles light↔dark; right-click/long-press not needed — System lives in Settings)
- **Log out icon button** — its own button with tooltip, no dropdown digging
The dropdown goes away entirely (venue switcher at the top is untouched).

---

## 4. Build order & sizing

| # | Work | Repos | Size |
|---|------|-------|------|
| 1 | Settings reorder + sidebar footer (logout & theme buttons) | web | S |
| 2 | Auto-login signup (cookies on signup, drop verify, emails) | services + web | S–M |
| 3 | `dashboard_mode` column + `/me` + PATCH endpoint | core (migration) + services | S |
| 4 | Questionnaire takeover + `MODE_CONFIG` (nav, Home, TrialHome, Analytics) | web | M–L |
| 5 | Settings "Dashboard preferences" section | web | S |
| 6 | (Parallel track) PRD §7 queue-until-approved enforcement | services + core | M |

1 can ship immediately. 2 and 3 are independent of each other. 4–5 depend on 3.

### Test plan (dev preview)
- Fresh signup → lands in questionnaire with a live session, no login form.
- Pick Deals only → trial home is deal-focused, Events/Line skips absent from nav; switch to hybrid in Settings → they reappear.
- Theme button toggles instantly; logout button works from anywhere.
- Approve the business → trial gives way to mode-tailored full dashboard.

### Out of scope (unchanged)
- Mobile app and v1 dashboard are untouched; `dashboard_mode` only affects the v2 web dashboard.
- Per-widget dashboard customization (drag/drop) — modes are presets, not a layout editor.
