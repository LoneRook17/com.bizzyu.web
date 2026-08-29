# Support-bot knowledge-pack audit — 2026-07-11

Branch: `fix/business-kb-audit` (off `dev`). Nothing merged — Luke merges after reading
the diff.

> **STATUS: round 2 (2026-07-11) — Luke answered all 3 blocking questions; applied.**
> All 11 business-kb files + the student pack are now review-clean (zero
> `pending review` markers). The three policy answers, plus a final adversarial re-read
> that caught one more team-permission error, are recorded in
> "Resolution — round 2" at the bottom. The "QUESTIONS FOR LUKE" section below is kept
> for the record with each item marked RESOLVED.

Audited every factual claim in `business-kb/*.md` (11 files) and swept `support-kb/*.md`
(student bot) for the same class of errors. Each claim classified:

- ✅ VERIFIED — confirmed against code/schema/config (file:line cited).
- ❌ WRONG — contradicted by code; fixed in this branch (evidence cited).
- ❓ UNVERIFIABLE — a business/policy fact not derivable from code; NOT guessed, collected
  for Luke below.

Ground-truth code lives in the sibling repos `com.bizzyu.services` (Node) and
`com.bizzyu.core` (Laravel); citations point there unless noted.

---

## The four reported issues

1. **Per-event approval (10-events) — ❌ FIXED.** The pack said every new event "goes to
   the Bizzy team for a quick review before it's visible." The code disagrees. For an
   approved business with Stripe connected, events **auto-publish immediately**; there is
   no per-event human review. The single gate is `isCreatorStripeApproved()`
   (`services/src/routes/events.ts:864-897`) plus automated content moderation. See the
   Events section below for the exact rule that replaced it.
2. **"Free RSVP" events (10-events) — ❌ FIXED.** There is no RSVP feature. Event types in
   code are `['Ticketed', 'Free']` (`web src/app/business/(dashboard)/help/content.ts` →
   `EVENT_TYPES` in `src/lib/business/constants.ts`; a legacy `'guest'`/RSVP type was
   removed 2026-06-12, "not an implemented feature"). All RSVP references purged from both
   packs; "free RSVP" replaced with "free tickets (price $0)".
3. **Per-venue Stripe not documented (70) — ❌ FIXED.** Per-venue payout accounts (feature
   #9) are live in code (`services/src/services/StripeManager.ts:166-268` tier-0 resolver;
   `business_stripe_accounts` table; V3 API `services/src/routes/businessStripeAccounts.ts`;
   web UI `web src/components/business/v2/settings/VenuePayoutAccountsSection.tsx`). A new
   "Venue payout accounts" section was added to 70-stripe-payouts.md, accurate to the real
   dropdown-matcher UX and the "pause sales at an un-onboarded matched venue" rule.
4. **"Money arrives within 2–3 business days" (70) — ❌ REMOVED, now ❓ for Luke.** NOT
   code-verifiable. We never set a `payout_schedule`/`delay_days` on connected accounts
   (Express account creation at `services/src/routes/stripeConnect.ts:91`, `user.ts:485/540`,
   `StripeManager.ts:568` — no payout settings), so payouts follow Stripe's defaults, which
   vary by account age (new US accounts: ~7–14 days to first payout, then rolling ~2-day).
   The only in-code timing string is `WithdrawalService.ts:442` ("1–2 business days") and
   that's about **promoter** cash-outs, a different flow. Replaced the hard promise with a
   "follows Stripe's schedule, check your Stripe dashboard, escalate if overdue" answer.

---

## business-kb — per file

### 00-policies.md — ✅ (header removed)
- Persona / hard rules / escalation. No product facts to verify.
- STRENGTHENED per request: the "never invent facts" hard rule now enumerates the four
  danger categories (payout timing, fee percentages, approval rules, feature availability)
  with worked examples of the correct "I'm not certain, here's escalation" answer. The old
  soft wording existed and was ignored by the live bot, so this is now explicit and
  example-driven.

### 01-overview.md — mostly ✅, ❓ on one timeline (header KEPT)
- ✅ Dashboard surfaces (events/line-skips/deals/analytics/team/marketing/settings/scanner)
  match the nav + routes (`web src/lib/business/constants.ts`).
- ✅ Business-account approval EXISTS as a gate: `APPROVED_ONLY_ROUTES` blocks
  event/deal/line-skip creation until the business is approved
  (`web src/lib/business/constants.ts`; `PendingBanner.tsx`). This is a one-time
  business-account review, NOT per-event.
- ✅ Fees: "service fee added on top, paid by customer, you get the full amount" — matches
  the fee-on-top model (`services PlatformFeeService.ts`); deals are free.
- ❓ "approval usually takes **1–2 business days**" — the review exists, but the turnaround
  time is an operator policy not in code. QUESTION 1.

### 10-events.md — ❌ fixed (approval + RSVP), ❓ on cancellation ladder (header KEPT)
- ❌→✅ Approval rewritten (see issue 1). New text: events go live right away once the
  business is approved and Stripe is connected; two things hold an event back —
  (a) automated content moderation flags it to `pending_review`
  (`services/src/routes/events.ts:989-1054`), or (b) Stripe not connected (paid events are
  blocked outright at `events.ts:958-964`; a free event created before Stripe is connected
  is held as `pending_approval` for admin review instead of auto-publishing).
- ❌→✅ "free RSVP" removed (see issue 2).
- ✅ "Editing details updates in the app right away."
- ✅ "Changing a ticket price only affects future purchases; existing holders keep their
  price" — each order snapshots its own price (`services TicketInstance.ts:38-42`).
- ✅ Cancellation branching: paid tickets sold → admin approval; none → cancels immediately
  (`services/src/routes/businessCancellations.ts:130-149`).
- ✅ Cancel → full refund of price + fees, pulled back from the host's Stripe
  (`services RefundService.ts:257-591`).
- ❓ "Repeated cancellations: 2nd in 90 days = warning; 3rd = flagged; 4th+ = suspension."
  The dashboard help center only states the "3rd in 90 days = flagged for review" rung
  (`web help/content.ts:560-563`); the 2nd-warning and 4th-suspension rungs aren't in code
  I could find. QUESTION 2.

### 20-tickets.md — ✅ (header removed)
- ✅ Multiple ticket types; Paid/Free; price; quantity **0 = unlimited**
  (`services Ticket.ts:44-57`); max-per-person; valid-from/until scan window.
- ✅ Drag-to-reorder tiers (QoL #2, deployed to dev; `web .../manage/tickets/page.tsx`).
- ✅ "Mark sold out / Mark available" forces a tier out without touching quantity
  (`force_sold_out` / `is_sold_out`; `web tickets/page.tsx`, `types.ts`).
- ✅ Hide keeps existing holders scannable.
- ✅ Fee-on-top minus promoter commission (`services TicketPurchaseService.ts:531-552`).

### 30-promo-codes.md — ✅ (header removed)
- ✅ Percentage or fixed-amount off, max uses, applied at checkout, managed per event.
- ✅ "Service fee is calculated on the **discounted** price" — fee % applied to
  `discountedSubtotal` (`services PlatformFeeService.ts:182-187`).
- Note: an unverified "universal venue codes across all a venue's events" claim was in the
  STUDENT pack (support-kb), not here; removed there (universal codes live only on an
  unmerged `feature/admin-v2` branch).

### 40-promoters.md — ✅ (header removed) — all six claims verified
- ✅ Become a promoter in-app, no upfront phone verification / no Stripe to start.
- ✅ Percentage or fixed per-ticket commission; snapshotted onto the link.
- ✅ Paid-tickets-only + host needs Stripe Connect.
- ✅ Commission comes out of the host's share (`TicketPurchaseService.ts:531-552`).
- ✅ No commission on the promoter's own purchases (`TicketPurchaseService.ts:68-86`, FR-18).
- ✅ Accrues to in-app wallet; Pending → Available after event end + chargeback buffer
  (2 days after that night's event) (`core WalletSettlementService.php:10-21,39`).
- ✅ **$20 minimum** withdrawal (`services WithdrawalService.ts:68`, 2000¢).
- ✅ Withdraw is Transfer-only. Stripe automatic daily pays the bank. Instant is
  gone. A withdrawal is not a bank deposit yet.
- ✅ Stripe connected at first withdrawal, not signup (`WithdrawalService.ts:524-558`).
- ✅ **No weekly payout** — on-demand only; the weekly payout cron is explicitly RETIRED
  (`core app/Console/Kernel.php:36-43`). (This is what the student pack got wrong — fixed.)

### 50-scanners-door-counters.md — ✅ (header removed)
- ✅ Ticket scanning (green/red); Staff role can scan (`RolePermissionsDialog.tsx:42`).
- ✅ Line skips scanned with the phone's regular camera, not the in-app scanner.
- ✅ Door counters + per-staff tap breakdown; create/edit = owner/manager/co-host, taps =
  +staff/crew (`event_counters`/`event_counter_taps`, May-2026 schema).

### 60-team.md — ❌ FIXED (header removed)
- ✅ Business roles Owner/Manager/Staff/Promoter and their capabilities match the
  permission matrix (`web src/components/business/v2/team/RolePermissionsDialog.tsx`):
  manager creates/manages events+deals+line-skips+analytics+promo, no billing/Stripe;
  staff scans + basic view; owner-only financial/billing.
- ✅ Event team co-host vs crew split; the "add me as co-host to the specific event"
  gotcha (matches the business-permission notes).
- ❌→✅ WRONG claim fixed: pack said "**only the owner** can remove a member or change a
  member's role." The matrix says managers CAN remove non-owner members ("Remove team
  members: manager = Not owner") and change staff roles ("Change member roles: manager =
  Staff only") (`RolePermissionsDialog.tsx:58-60`). Only owner removes/re-roles another
  manager, transfers ownership, and manages billing. Rewritten to match.

### 70-stripe-payouts.md — ❌ fixed (added venue section), ❓ on timing (header KEPT)
- ✅ Must connect Stripe before paid events/line skips (`events.ts:958-964`; line-skip
  revenue routes to the business account, `lineSkipCheckout.ts`).
- ✅ Revenue in Analytics = your revenue; fee on top; refunds only on cancel; promoter
  payouts via wallet (all cross-checked above).
- ✅ NEW "Venue payout accounts" section added (see issue 3), accurate to the live
  dropdown-matcher, owner-vs-manager permissions, the un-onboarded-account "pauses sales"
  rule (locked decision 2), and the per-order destination snapshot (past sales never move).
- ❓ Payout timing (see issue 4) — the actual number of days is an open question. QUESTION 3.

### 80-line-skips-deals.md — ✅ (header removed)
- ✅ Line skips include cover / guaranteed entry (product policy, consistent both sides).
- ✅ Rolling schedule generates nights **2 weeks (14 days) ahead**
  (`services/src/migrations/003_line_skip_rolling_window.ts:24-36`).
- ✅ Per-night edit/cancel; deals are free to create, claim frequency
  (daily/weekly/monthly/anytime), app enforces frequency.

### 90-analytics-marketing.md — ✅ (header removed)
- ✅ Analytics tabs (Events/Deals/Line skips); pre-sale vs door split; check-in rate.
- ✅ Tap-to-Pay = phone as card reader, Stripe connected, no extra hardware.
- ✅ Marketing tab: attendees + announcements + SMS blasts; sends rate-limited, logged,
  opt-out honored (May-2026 `blast_usage_log`, `business_followers`; matches the marketing
  audit notes).

---

## support-kb (student bot) sweep — approval / RSVP / payouts

- ✅ **No RSVP references** in the student pack (uses "free ticket" correctly).
- ✅ **No per-event approval claim.** It correctly describes only the business-account
  review ("approval usually takes 1–2 business days", `20-businesses.md`) — same ❓ timeline
  as QUESTION 1 — and the paid-vs-unpaid cancellation branching (verified).
- ❌→✅ **Promoter "paid weekly via Stripe"** appeared TWICE (`01-product-overview.md:35`,
  `20-businesses.md:44`). Both WRONG — fixed to "accrues to in-app wallet, cash out on
  demand, no weekly payout" (evidence in 40-promoters above).
- ❌→✅ **"Money arrives within 2–3 business days"** (`20-businesses.md:22`) — same
  unverifiable promise as issue 4; softened to "Stripe's schedule for their account".
- ❌→✅ **"Universal venue codes can apply across all of a venue's events"**
  (`20-businesses.md:41`) — not verifiable; per-event universal-code support lives only on
  the unmerged `feature/admin-v2` branch. Claim removed.
- Added one accurate line noting per-venue payout routing exists (Settings → Payments).
- Student-pack files were NOT drafts (no PENDING header) and remain code-grounded; the
  remaining student claims (phone signup, 5-min OTP, deal cooldowns, premium limits,
  scan windows, all-sales-final + cancel-refund) were previously grounded and left intact.

---

## QUESTIONS FOR LUKE (blockers — nothing ships until these are answered)

These are business/policy facts that are NOT derivable from code. The three files that
still carry `<!-- CONTENT PENDING LUKE REVIEW -->` (01-overview, 10-events,
70-stripe-payouts) are held on these.

1. **Business-account approval turnaround.** The pack (both bots) says new business
   signups are reviewed and "approval usually takes 1–2 business days." The review gate is
   real; is "1–2 business days" the number you want the bot to state, or should it stay
   vague ("a short review")? — holds `01-overview.md` (and the same line in support-kb).

2. **Repeated-cancellation escalation ladder.** The pack states: 2nd cancellation in 90
   days = warning, 3rd = account flagged, 4th+ = possible suspension. Code/help center only
   evidences the "3rd = flagged" rung. Are the 2nd-warning and 4th-suspension rungs real
   policy, or should the bot only say "frequent cancellations trigger review"? — holds
   `10-events.md`.

3. **Payout timing.** We don't set a Stripe payout schedule, so real timing is Stripe's
   default (varies; new accounts ~7–14 days to first payout). I removed the "2–3 business
   days" promise. What should the bot tell an owner who asks "when do I get paid"? Options:
   (a) keep it vague + point to their Stripe dashboard (current fix), or (b) give a real
   number you're willing to stand behind (e.g. after the first payout, ~2 business days
   rolling). — holds `70-stripe-payouts.md`.

### Lower-priority confirmations (not blocking; not changed)
4. **Fee wording.** The pack says a "small" service fee is added on top. The bot is now
   forbidden from stating a percentage. Confirm you're OK with the bot only ever saying
   "a service fee is added on top, paid by the customer" and escalating for the number.
5. **Universal promo codes.** Confirm universal/venue-wide codes are NOT live in prod
   (only on `feature/admin-v2`), so keeping them out of both packs is correct.

---

## Resolution — round 2 (2026-07-11)

Luke answered the three blockers. Applied to both packs:

1. **Payout timing → RESOLVED.** Describe Stripe's actual default, no single number.
   `70-stripe-payouts.md` "When you get paid" now reads: payouts run on Stripe's schedule
   for the account; the **first** payout takes roughly **7–14 days** while Stripe verifies
   the account; after that, payouts arrive on Stripe's standard rolling schedule; exact
   dates live in the owner's Stripe dashboard. Framed as Stripe's schedule, not a Bizzy
   guarantee. Same wording applied to `support-kb/20-businesses.md`.
2. **Business-account approval → RESOLVED, kept vague.** Removed "1–2 business days" from
   `01-overview.md` and from `support-kb/20-businesses.md`. Now: "approval is usually fast,
   and you'll get an email once your account is approved." This is ACCOUNT approval only —
   no per-EVENT approval language was reintroduced.
3. **Cancellation ladder → RESOLVED.** Stripped the 2nd-warning and 4th-suspension rungs
   from `10-events.md` and `support-kb/20-businesses.md`. Only the verifiable rung remains:
   a 3rd cancellation within 90 days flags the account for review. Escalation path kept.

Headers: `pending review` marker removed from `01-overview.md`, `10-events.md`,
`70-stripe-payouts.md`. Grep confirms **zero** markers across `business-kb/` and
`support-kb/`. All 11 business files + the student pack are review-clean.

### Final adversarial self-check — one more defect found and fixed

Re-read both packs in full asking "can I point to the code that proves this?" of every
claim. One survivor from the first pass:

- ❌→✅ **`support-kb/20-businesses.md` Team section said "Only owners manage the team."**
  Same defect I fixed in `business-kb/60-team.md` last round, missed in the student pack.
  Contradicts the permission matrix (`RolePermissionsDialog.tsx:57-60`): managers can add
  members and remove/re-role non-owner members. Fixed to match — owners and managers
  manage the team; only the owner can remove/re-role another manager, transfer ownership,
  or manage billing.

Everything else in both packs traces to verified code or Luke-confirmed policy. Two claims
I deliberately left, with reasoning (neither is code-citable to a line, both are
long-standing operational facts, neither is in the payout/fee/approval/feature danger set):

- App↔business linking by shared phone number (`01-overview.md`, `support-kb/20`) — an
  operational mechanism, consistent across both packs and the dashboard help center; not
  line-citable but low-risk and unchanged.
- Support SLA "replies within 24 hours on business days" (`00-policies.md` both packs) — a
  support-response expectation, operator policy, not a payout/approval claim. Unchanged.

### Lower-priority items — recommendations (no further Luke input needed)

4. **Fee wording → RECOMMEND: keep the no-percentage rule; do NOT document a fee %.**
   There is no single fee number to document: platform fees vary per business (business-
   level overrides exist, e.g. 14% vs the 20% global — see the fee-override history). That
   is a positive reason the bot must never quote a percentage. The strengthened
   `00-policies.md` rule already enforces this. The soft word "small" is a qualifier, not a
   number, and is fine to keep. No change needed unless you want "small" dropped too.
5. **Universal promo codes → RECOMMEND: keep them OUT of both packs (done).** Verified the
   universal/venue-wide-code work lives only on the unmerged `feature/admin-v2` branch, so
   it is not in dev/prod. The claim was removed from `support-kb`. Re-add to the pack only
   when that feature actually ships. Re-confirm at admin-v2 release.
