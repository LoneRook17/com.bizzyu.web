# Bizzy Support Bot — Knowledge Pack

These markdown files are the **entire knowledge base** for the in-app support chatbot.
At runtime they are concatenated (in filename order) into the model's system prompt,
so the bot only knows what is written here plus the conversation itself.

## Rules for editing

- **Plain English, no jargon.** Write answers the way a support rep would say them.
- **Only verified behavior.** Every claim about how the app works must match the code
  or an operator-confirmed policy. If something is uncertain, leave it out — the bot
  is instructed to escalate rather than guess.
- **Update on product changes.** When a policy or flow changes (refunds, cooldowns,
  premium limits…), edit the relevant file in the same PR. The bot picks it up on the
  next deploy — no retraining, no app release.
- **Keep it small.** The whole pack should stay well under ~25k tokens so it loads into
  a single cached prompt. If a file grows huge, split or trim it.

## Files

| File | Contents |
|---|---|
| `00-policies.md` | Bot persona, scope, hard rules, escalation policy |
| `01-product-overview.md` | What Bizzy is, both sides, campuses, key concepts |
| `10-students.md` | Student-side: accounts, deals, premium, tickets, legacy line skips, wallet |
| `11-national-deals.md` | National brand deals: Local/National toggle, open-on-brand-site, no quota/leaderboard impact |
| `12-weekly-cover.md` | Weekly Cover / Cover (`product_kind` weekly_cover): buy one night, camera check-in, pink vs green |
| `14-hosting-events.md` | Any student can host: + Host an event, review before live, held earnings until Stripe, Host tab |
| `20-businesses.md` | Business-side: dashboard, events, Weekly Cover, payouts, refunds, team, door tools |
| `30-known-issues.md` | Current known issues / temporary answers (edit freely, prune often) |

`10-students.md` and `30-known-issues.md` are grounded in a code-behavior trace —
re-verify against code when flows change.
