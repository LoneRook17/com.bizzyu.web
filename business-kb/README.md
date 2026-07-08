# business-kb — support bot knowledge pack (business audience)

This directory is the knowledge base for the **business** variant of the support chat
bot (the floating help bubble in the business dashboard). It mirrors `/support-kb`
(the student pack). `src/lib/support/kb.ts` concatenates every `*.md` in this directory
(except this README) in filename order into one system prompt; `loadKnowledgePack("business")`
returns it.

**Every content file starts with `<!-- CONTENT PENDING LUKE REVIEW -->`.** These
articles were drafted from the dashboard's own help center (`src/app/business/(dashboard)/help/content.ts`)
and the live dashboard pages (e.g. the Manage tickets page), but have **not** been
reviewed by Luke for accuracy/tone. Remove the header on each file once reviewed.

Files:

- `00-policies.md` — bot persona, hard rules, escalation, answer style (business).
- `01-overview.md` — dashboard overview, accounts/approval, venues, fees.
- `10-events.md` — events lifecycle: create, approval, manage, edit, cancel.
- `20-tickets.md` — ticket types, drag-reorder, mark sold out, hide, scan window.
- `30-promo-codes.md` — per-event promo codes.
- `40-promoters.md` — Promoter Program, commissions, weekly payouts.
- `50-scanners-door-counters.md` — ticket/line-skip scanning + door counters.
- `60-team.md` — business team vs event co-hosts, roles, invites.
- `70-stripe-payouts.md` — connecting Stripe, payout timing, refunds.
- `80-line-skips-deals.md` — line-skip schedules + deals.
- `90-analytics-marketing.md` — analytics, Tap-to-Pay, marketing/blasts.

## Editing

Editing a `.md` takes effect on the next deploy (the pack is cached per serverless
instance). If you add a NEW pack directory, also add it to `outputFileTracingIncludes`
in `next.config.ts` so the files ship in the serverless bundle.
