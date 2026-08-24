# KB staging (NOT shipped, NOT loaded)

Draft support-bot articles for features that are **not live on production yet**.

## Why this directory exists

`src/lib/support/kb.ts` loads every `.md` file in `support-kb/` and `business-kb/`
(except `README.md`) straight into the bot's system prompt. There is no per-file
enable flag. So a finished article for an unreleased feature cannot simply sit in a
pack: the moment it is there, the bot starts telling customers about a feature they
cannot see.

This directory is:

- **Not a pack.** `PACK_DIRS` in `src/lib/support/kb.ts` maps only `support-kb` and
  `business-kb`, so nothing here is ever read into a prompt.
- **Not shipped.** `outputFileTracingIncludes` in `next.config.ts` lists only
  `./support-kb/*.md` and `./business-kb/*.md`, so nothing here enters the serverless
  bundle either.

## How to ship an article from here

When the feature actually goes live on prod:

1. Re-verify the article against the shipped behaviour. These drafts were written from
   the dev database and the `fall/integration` tree, and details will have moved.
2. Move the file into `support-kb/` or `business-kb/` with a sensible numeric prefix
   (files are concatenated in filename order).
3. Deploy. The pack is cached at module scope, so the change takes effect on the next
   deploy, not immediately.

No `next.config.ts` change is needed as long as you move files **into the two existing
pack directories**. You only need to touch `outputFileTracingIncludes` if you add a
genuinely new pack directory.

## Why each file here is parked

Checked against the production database on 2026-08-24. Each of these features is absent
from prod at the schema level, not merely turned off, so customers cannot encounter them:

| Feature | Why it is dark on prod |
|---|---|
| Weekly Cover | `recurring_event_series.program_kind` column does not exist on prod |
| Door Access | `events.access_kind` and `events.redemption_mode` do not exist on prod |
| Surge pricing | `surge_ladders` and `surge_steps` tables do not exist on prod |
| National Deals | no national columns on `deals` on prod |
| Host tab / host trust | no host-access columns on `users` on prod |
| Host escrow (as a named product) | `wallet_ledger_entries.entry_key` does not exist on prod |

The generic wallet balance IS live on prod (`wallet_ledger_entries` with `earning`
entries), and the promoter program IS live (257 promoter profiles, 280 tracking links).
Those are documented in the real packs, not here.
