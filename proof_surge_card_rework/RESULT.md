# Surge card rework — dev proof

Branch `feat/surge-card-rework` @ `5860ad5`, cut off the dev tip `f0fef91`.
**Dev only.** Nothing pushed, nothing to prod, no services/API change — the
`/business/surge` contracts are consumed exactly as before.

## Deployment (dev twin only)

| | |
|---|---|
| Project | `com-bizzyu-web-l2gp` (dev twin — points at `dev-services.bizzy-deals.com`) |
| Deployment id | `dpl_FsqKyL72pU3awqTiFh1f7LAPTXxD` |
| Live URL | https://com-bizzyu-web-l2gp.vercel.app |
| Build URL | https://com-bizzyu-web-l2gp-hp4nxcp91-lonerook17s-projects.vercel.app |
| Deployed | 2026-08-12 11:32 ET, `vercel --prod` from the local checkout (no push) |

`com-bizzyu-web` / bizzyu.com untouched.

## Shots

Both phases were driven through the REAL dashboard surfaces on the dev twin as
the biz-267 owner (user 5547) — event manage page (per priced tier) and the
line-skip night panel — so both placements are covered by the same component.

| state | before | after |
|---|---|---|
| clean saved card — line-skip night (night 2175) | `before/01-clean-saved-card-lineskip-night.png` | `after/01-…` |
| clean saved card — event tier (tier 527) | `before/02-clean-saved-card-event-tier.png` | `after/02-…` |
| dirty card | `before/03-dirty-card-event-tier.png` | `after/03-…` |
| fire dialog with the ladder OFF | `before/04-fire-dialog-ladder-off.png` | `after/04-…` |
| off-with-fired (ladder 23, tier 525) | `before/05a-…-before-click.png` + `before/05-off-with-fired-no-confirm.png` | `after/05a-…` + `after/05-off-with-fired-confirm.png` |
| surge off → price line reason | — (no price line existed) | `after/06-surge-off-price-line.png` |

Before, "off with fired" had no confirm at all: one click on `Disable` and the
price changed — hence the before file name.

## Live copy captured from the deployed dev build

- off confirm: `Turn off surge?` / `Customers go back to $5.00. Fire history is kept.`
- fire dialog, ladder off: `These step(s) are already at or below the current sold count and will fire immediately on save.` + `Surge is off, so customers keep paying $5.00 until you turn surge on. The steps are marked as fired either way.`
- fire dialog, ladder on: word-for-word the shipped sentence (`… — the price jumps right away for the next buyer.`)
- unsaved-draft nav guard on an in-app link click: `You have unsaved surge steps. Leave this page and discard them?`

## Fixture state — restored, nothing fired

`Fire & save` was never clicked; every fire dialog was cancelled. Verified after
the run:

```
event_ticket/527      active=true   steps=[[1, 1000, unfired]]
event_ticket/525      active=false  steps=[[1, 850, fired 2026-08-12 11:05:12]]
line_skip_night/2175  active=true   steps=[[5,2000],[12,2500],[20,3000]] all unfired
```

Identical to the pre-run state. Ladders 22 and 23 were toggled during the drive
and put back.

## Tests

`npm test` — **432 pass / 0 fail** (baseline on `dev` was 400/0). Name-level
diff vs baseline: zero baseline tests missing or renamed; +32 new in
`src/lib/business/surge-card-state.test.ts`. `npx tsc --noEmit`, `eslint` on the
changed files, and `next build` all clean.
