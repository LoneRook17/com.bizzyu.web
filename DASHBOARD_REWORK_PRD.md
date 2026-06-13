# Business Dashboard Rework — PRD

**Status**: Draft (prep / planning)
**Last updated**: 2026-06-07
**Repo**: `com.bizzyu.web` (Next.js 16 App Router, React 19, Tailwind v4, Vercel)
**Surface**: `src/app/business/(dashboard)/` + `src/app/business/(auth)/`
**Suggested branch**: `feature/dashboard-rework` (off `dev`)
**Scope this round**: **Front-end first.** No backend/approval-automation work (see §7 for the backend contract this depends on).

---

## 1. Background

The Bizzy business dashboard is the operator surface where venues create events, post deals, run line skips, manage their team, and view analytics. It works and is feature-complete, but it has two problems we want to fix together:

1. **The UI feels "vibe-coded."** It functions, but it reads as a developer-built admin panel rather than a designed product. The root causes are concrete and fixable (see §4): there are **no shared UI primitives** — every page re-implements buttons, cards, inputs, modals, and skeletons inline with repeated Tailwind class strings (e.g. the `bg-gradient-to-br from-[#2ECB4E] to-[#05EB54]` button appears copy-pasted across many files). Spacing, typography, empty states, and loading states are inconsistent page-to-page.

2. **The approval gate blocks everything.** A newly signed-up business lands in a `pending_approval` state where it can *see* the dashboard chrome but is actively **blocked from the core value** — the Events, Line Skips, and Deals routes redirect back to home, their sidebar links are disabled, and a banner reads "You can view the dashboard but cannot create events or deals yet." We lose the new operator at their moment of peak motivation, right after signup, while they wait on a human review.

### Current gate mechanics (as built today)

Grounded in the code so the rework is precise:

- **Signup** (`(auth)/signup/page.tsx`) → `POST /business/auth/signup` → redirect to `/business/login?registered=1`. New business is `pending_verification`, then `pending_approval` after email verification.
- **Middleware** (`src/middleware.ts`) admits any request with `biz_token`/`biz_refresh` cookies into `/business/*`.
- **`isPending`** (`lib/business/auth-context.tsx`) is true for `pending` / `pending_approval` / `pending_verification`.
- **Route blocking**: `APPROVED_ONLY_ROUTES = ['/business/events', '/business/line-skips', '/business/deals']` (`lib/business/constants.ts`). The dashboard layout (`(dashboard)/layout.tsx`) does `router.replace('/business')` when a pending business hits those routes; `Sidebar.tsx` renders those links `disabled`.
- **No discrete "go-live" step.** Creating a deal is `POST /business/deals`; creating an event is `POST /business/events`. The response carries `moderation_status` — if `"pending_review"` the item is held for **content** moderation, otherwise it's live. "Live" today = created + passed content moderation. There is no separate publish toggle.

So the gate we're moving is the **account-approval gate**, and the place it's moving *to* is a new **go-live checkpoint** that holds an operator's content until their business is approved.

---

## 2. Goals

- **G1 — Professional, efficient UI.** A cohesive, designed look built on a real design-token + component foundation, with faster, denser, more legible operator workflows.
- **G2 — Relocate the approval gate.** Let unapproved businesses explore the dashboard and **build their first deal/event** immediately after signup. The gate moves to **go-live**: nothing reaches students until the business is approved.
- **G3 — A guided, secluded trial phase.** The pre-approval experience is tutorial-like — it teaches the product and channels the operator toward building their first deal, while clearly signalling that some features are locked until approval.
- **G4 — No regressions** for approved businesses; the approved experience is the redesigned dashboard with no functional loss.

## 2a. Non-goals (this round)

- Backend approval-automation ("auto-approve obvious yeses"), the "You're live!" email, and review-queue tooling — **deferred.** This round assumes the existing manual review process still decides approval (see §7).
- Mobile (Flutter) app changes.
- Re-platforming. We stay on Next.js + Tailwind; we may layer a component approach on top (decision in §4).
- Changes to analytics/scanner/marketing *features* beyond restyling them onto the new component system.

---

## 3. The new model (target flow)

```
Create account  →  Build first deal  →  Submit deal  →  [APPROVAL GATE]  →  "You're live!"  →  Live to students
   (instant)        (~2 min, peak         (queues for      (only this        (notification)
                     motivation)           review)          step blocks)
```

The approval gate becomes a single checkpoint that **only blocks go-live** — everything before it is open. An unapproved operator can sign up, tour the dashboard, and build a real first deal in minutes; that deal sits in a **"Queued — goes live once you're approved"** state instead of being blocked from existing at all.

---

## 4. Workstream A — UI overhaul

### Design principles

- **Designed, not decorated.** Consistent spacing scale, type scale, and a restrained use of the brand green (`#05EB54`) as an accent — not as the fill on every button.
- **Efficient & dense.** Operators run venues; favor information density, fast scanning, keyboard-friendly forms, and minimal clicks over marketing-style whitespace.
- **One source of truth for every primitive.** A button is a `<Button>`, not a class string.

### The foundation (the core fix)

Build a small dashboard design system before (or alongside) restyling pages:

1. **Design tokens** — formalize colors, spacing, radius, shadow, and type scale in the Tailwind v4 `@theme` block (`globals.css`). Replace hardcoded hex (`#2ECB4E`, `gray-200`, etc.) with semantic tokens (`surface`, `border`, `accent`, `danger`, `text-muted`).
2. **Primitives** — `Button` (variants/sizes/loading), `Card`, `Input`/`Select`/`Textarea` (+ label/error/help), `Badge`/`StatusPill`, `Modal`/`Drawer`, `Table`, `Tabs`, `EmptyState`, `Skeleton`, `Toast`. Today only a marketing `components/ui/Button.tsx` exists; the dashboard has none of these as shared parts.
3. **Layout shell** — redesigned `DashboardShell` / `Sidebar` / `Topbar`: cleaner nav, a more legible venue switcher, consistent page header pattern (title + actions + breadcrumb).
4. **Patterns** — standard page header, list/table pattern, form layout, and a consistent loading/empty/error trio.

### Approach

Mockups first, code second. **Claude drafts mockups for one or two key screens → you approve the direction → we build the design system to match → restyle pages onto it.** First mockups: (1) the redesigned **dashboard home + shell** (establishes the visual language) and (2) the **trial-phase "build your first deal"** experience (the headline new feature). The mockups are HTML/Tailwind so they translate directly into the React codebase.

### UI decision to confirm

How far to go on the component layer (tracked as OQ-1):
- **(a) Refine current Tailwind** — keep raw Tailwind, add tokens + a hand-built primitive set. Lowest churn.
- **(b) Adopt a headless system** — e.g. shadcn/ui + Radix on top of Tailwind for accessible primitives (menus, dialogs, tabs) with less bespoke code.

Recommendation: **(b)** for interactive primitives (modals, dropdowns, tabs) where accessibility/behavior is easy to get wrong, while keeping bespoke styling. Confirm before Phase 1.

---

## 5. Workstream B — Approval gate relocation + trial phase

### 5.1 Trial phase spec (unapproved businesses)

While a business is **not approved**, the dashboard runs in **Trial Mode**:

- **Full navigability.** Remove the redirect + disabled-link blocking for Events / Deals / Line Skips. Pending operators can open these sections and see how they work.
- **Build a first deal/event for real.** The create flows are open. On submit, the item is **saved and queued** rather than published — surfaced everywhere as a **"Queued — goes live when you're approved"** status, not an error.
- **Guided & secluded.** A trial home that replaces the empty stat-card grid (which today just reads "data will populate once approved") with a **getting-started checklist / tutorial**: *Verify email → Set up your venue → Build your first deal → Get approved → Go live.* Progress is visible; the "Build your first deal" step is the primary CTA.
- **Honest feature locking.** Features that can't be meaningfully trialed pre-approval (e.g. SMS blasts, promoter payouts, Stripe payouts, real scanning) are shown but clearly **locked** with a short "available once approved" affordance — visible so they understand the product, not hidden.
- **Sample/preview data** where a section would otherwise be empty (e.g. analytics), clearly labeled as example data, so the operator sees what the populated product looks like. (Confirm depth — OQ-2.)

### 5.2 Status model

Introduce an explicit **go-live gate** distinct from content moderation. A created item's visibility to students requires **both**:

- business `status === 'approved'`, **and**
- item `moderation_status !== 'pending_review'` (existing content check).

Proposed item lifecycle (front-end vocabulary):

| State | Meaning | Visible to students |
|---|---|---|
| `draft` | Saved, not submitted | No |
| `queued_for_approval` | Submitted by an unapproved business | No — goes live on approval |
| `pending_review` | Held by content moderation | No |
| `live` | Approved business + passed moderation | **Yes** |
| `expired` / `deactivated` | Existing end states | No |

On business approval, all `queued_for_approval` items auto-transition to `live` (or to `pending_review` if content moderation still pending). This auto-transition is the backend dependency in §7.

### 5.3 Front-end changes (files)

- **`lib/business/constants.ts`** — remove/replace `APPROVED_ONLY_ROUTES` gating; pending businesses are no longer redirected. Keep role-based hiding (`ROLE_HIDDEN_ROUTES`) as-is.
- **`(dashboard)/layout.tsx`** — delete the `isPending` → `router.replace('/business')` redirect; instead set a **Trial Mode** context/flag for descendants.
- **`Sidebar.tsx`** — stop disabling Events/Deals/Line Skips links; add Trial-Mode treatment (e.g. lock badges on truly-locked items only).
- **`(dashboard)/page.tsx`** — branch on trial vs approved: render the **getting-started checklist** for trial, the stats dashboard for approved.
- **`PendingBanner.tsx`** — reframe from "you cannot create" to "**Trial mode — build your first deal now; it goes live the moment you're approved.**"
- **`DealForm.tsx` / `EventForm.tsx`** — on submit while in trial mode, show a "Queued for review — goes live when you're approved" confirmation instead of the live/under-review copy; handle the new status in lists/detail/badges.
- **Lists & cards** (`deals/page.tsx`, `events/page.tsx`, `DealCard`, `EventCard`, `StatusBadge`, `MODERATION_STATUS_COLORS`) — render the `queued_for_approval` state.
- **New**: a `TrialChecklist` component + a small `useTrialMode()` hook reading auth/business status.

### 5.4 Approved-business experience

Unchanged functionally; it is simply the redesigned dashboard. Once approved, the trial home is replaced by the real dashboard, locked features unlock, and queued items go live.

---

## 6. Phased roadmap

| Phase | Title | Deliverable | Depends on |
|---|---|---|---|
| 0 | **Prep** (this doc) | PRD + approved mockups for 1–2 screens | — |
| 1 | **Design system foundation** | Tokens in `globals.css` + primitive components (`Button`, `Card`, inputs, `Modal`, `Badge`, `EmptyState`, `Skeleton`, `Toast`); Storybook-style demo page | OQ-1 decision |
| 2 | **Shell + home redesign** | Redesigned `DashboardShell`/`Sidebar`/`Topbar` + dashboard home on the new system | Phase 1 |
| 3 | **Trial mode (front-end)** | Remove route gate, add Trial context + getting-started checklist, reframe banner, "queued" status across forms/lists/badges | Phase 1; §7 contract |
| 4 | **Section restyle** | Migrate Events, Deals, Line Skips, Analytics, Team, Marketing, Settings, Scanner onto the new components | Phase 2 |
| 5 | **QA + polish** | Cross-section visual QA, responsive pass, a11y pass, trial→approved transition test | Phases 2–4 |

Phases 1–2 (design system + shell) and Phase 3 (trial mode) can largely run in parallel once the foundation lands.

---

## 7. Backend dependency (front-end-first assumption)

This round is front-end-only, but true "nothing goes live" enforcement is ultimately a **backend guarantee**. We need to confirm what the Node services API (`com.bizzyu.services`, `POST /business/deals` & `POST /business/events`) does today when an **unapproved** business creates an item:

- **If it already refuses or auto-holds** unapproved-business content → the front-end can build the full trial UX against that contract now.
- **If it would publish** regardless of business status → a backend change is required so unapproved businesses' items are created as `queued_for_approval` and **auto-transition to live on approval**.

**Action**: confirm the current API behavior before Phase 3. Until then the front-end treats trial submissions as queued and renders them accordingly. (This is the one item that may pull a small backend change into scope.)

---

## 8. Risks & open questions

- **OQ-1 (UI)**: Refine-Tailwind vs adopt shadcn/Radix for primitives. *Recommendation: shadcn/Radix for interactive primitives.*
- **OQ-2 (trial depth)**: Do we show **sample/preview data** in trial analytics, or just empty-with-explanation? Affects scope.
- **OQ-3 (backend)**: Does the API hold unapproved-business content today, or is a backend change needed (see §7)?
- **OQ-4 (locked features)**: Exact list of features locked vs trial-able pre-approval (proposed: lock SMS/announcements, promoter payouts, Stripe payouts, live scanning).
- **R-1**: Scope creep — restyling all sections (Phase 4) is the largest chunk; consider shipping foundation + home + trial first, then sections incrementally behind the same components.
- **R-2**: The trial→approved transition (queued items going live, locked features unlocking) needs explicit QA; it's the highest-risk state change.
- **R-3**: Auth/cookie fragility (documented "Cooper, May 2026" redirect-loop history around `biz_session` vs `biz_token`) — avoid touching session logic in this rework unless necessary; if we do, budget testing.

## 9. Success criteria

- New operators can sign up and **build a first deal within minutes**, pre-approval, with zero "you can't do this yet" dead-ends.
- A clear, single go-live moment on approval; queued items appear live without operator rework.
- Every screen renders from the shared component system — no remaining inline gradient-button class strings.
- Approved businesses report (qualitatively) the dashboard "looks like a real product."
