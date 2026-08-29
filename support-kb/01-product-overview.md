# What Bizzy is

Bizzy is a two-sided, per-campus marketplace app for college students.

- **Students** (iOS app): discover and claim local **deals** (food, drinks,
  things-to-do), buy **event tickets**, buy **Weekly Cover / Cover** for a
  venue's regular nights, and buy **line skips** for nightlife.
  Pitch: real students, real savings, no fees.
- **Businesses & venues** (web dashboard at bizzyu.com/business + the app's business
  tools): list deals, sell tickets, run Weekly Cover, sell line skips, scan at
  the door, run promoters and marketing, get paid via Stripe.

Everything is scoped to a **specific university** (FGCU, USF, UGA, ASU, and more).
A student only sees deals and events for their own campus. Students pick their
school at signup; if their school isn't on Bizzy yet they can request it.

## Key concepts (shared vocabulary)

- **Deal** — a special offer at a local business (discount, freebie, BOGO). Students
  claim it in the app and show it in-store. Free for businesses to create.
- **Deal cooldown / frequency** — each deal is claimable daily, weekly, monthly, or
  anytime, set by the business. After claiming, the deal locks with a countdown until
  it's available again.
- **Bizzy Premium** — student subscription (via Apple, monthly or yearly, 7-day free
  trial). At participating schools, free users get a limited number of deal
  redemptions; Premium users get unlimited.
- **Event ticket** — paid or free ticket to a **named event** (`product_kind`
  event): a concert, DJ night, Trivia Tuesdays, themed show. Green on Happening
  Tonight and the Events tab. Lives in the Wallet as a QR; can be added to
  Apple Wallet. Staff scan with the in-app scanner. Scheduled tickets have
  scan windows (valid-from/until times, shown in the event's timezone).
- **Weekly Cover / Cover** — entry for **one night** of a venue's regular
  Weekly Cover series (`product_kind` weekly_cover). Pink on Happening Tonight
  and the Events tab. Not a named event and not a subscription. Guest copy
  says Cover or Weekly Cover, never "door access". Don't guess from a title
  that ends in Cover. See "Weekly Cover".
- **Line skip** — a skip-the-line pass for bars/nightlife (21+), sold for specific
  nights over the coming week. Includes cover — the customer doesn't pay again at
  the door. Guaranteed entry. Separate from a Weekly Cover tier also named
  "Skip the Line".
- **Wallet (student)** — the app tab holding purchased tickets, Weekly Cover,
  and line skips (Upcoming / Past / All) with their QR codes.
- **Promoter** — a user who promotes an event with a personal tracking link and
  earns commission on tickets sold through it. Commission accrues to their in-app
  wallet, becomes available 2 days after that night's event, and they withdraw on
  demand to Stripe. Stripe then deposits to their bank on its daily schedule. A
  withdrawal is not a bank deposit yet (there is no weekly payout and no instant option).
- **Service fee** — added on top of ticket/line-skip prices and paid by the buyer.
  Businesses receive the full price they set.

## The four student tabs

**Deals · Events · Wallet · Profile.** Profile shows lifetime savings, deals claimed,
the per-school monthly leaderboard (ranked by amount saved), favorites, deal history,
and settings.

On **Events**, named events are green and Weekly Cover nights are pink. **Events
→ Venues** lists venues that have upcoming events or Weekly Cover, not places
that only have deals.

## Support contacts

- Email: **support@bizzyu.com** (replies within 24h on business days)
- Business users on event night: their Bizzy campus representative
- The app also has a Contact form (Profile → Contact us)
