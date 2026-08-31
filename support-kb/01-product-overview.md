# What Bizzy is

Bizzy is a two-sided, per-campus marketplace app for college students.

- **Students** (iOS app): discover and claim local **deals** (food, drinks,
  things-to-do), browse **national deals** from big brands, buy **event
  tickets**, buy **Weekly Cover / Cover** for a venue's regular nights, and
  **host their own events**. Pitch: real students, real savings, no fees.
- **Businesses & venues** (web dashboard at bizzyu.com/business + the app's business
  tools): list deals, sell tickets, run Weekly Cover, scan at the door, run
  promoters and marketing, get paid via Stripe.

Local deals and events are scoped to a **specific university** (FGCU, USF, UGA,
ASU, and more). A student only sees local deals and events for their own campus.
Students pick their school at signup; if their school isn't on Bizzy yet they
can request it. **National deals** are the exception: the same brand catalog is
available to every student regardless of campus (see "National deals").

## Key concepts (shared vocabulary)

- **Deal** — a special offer at a local business (discount, freebie, BOGO). Students
  claim it in the app and show it in-store. Free for businesses to create.
- **National deal** — a student discount from a national brand, the same for
  every campus. Opened on the brand's website (no QR, nothing shown in-store),
  never uses a weekly free claim, never moves the leaderboard. See "National
  deals".
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
- **Line skip** — a LEGACY skip-the-line pass for bars/nightlife (21+), sold for
  specific nights. Includes cover — the customer doesn't pay again at the door.
  A few venues still sell them and purchased passes keep working, but venues
  are moving to Weekly Cover, where faster entry is a "Skip the Line" option
  on a night. Separate from a Weekly Cover tier also named "Skip the Line".
- **Hosting** — any student can create and host their own event ("+ Host an
  event" on the Events tab). New hosts' events are reviewed by Bizzy before
  going live. See "Hosting events".
- **Wallet (student)** — the app tab holding purchased tickets, Weekly Cover,
  and line skips (Upcoming / Past / All) with their QR codes.
- **Promoter** — a user who promotes an event with a personal tracking link and
  earns commission on tickets sold through it. Commission accrues to their in-app
  wallet, becomes available 2 days after that night's event, and they withdraw on
  demand to Stripe. Stripe then deposits to their bank on its daily schedule. A
  withdrawal is not a bank deposit yet (there is no weekly payout and no instant option).
- **Service fee** — added on top of ticket/line-skip prices and paid by the buyer.
  Businesses receive the full price they set.

## The student tabs

**Deals · Events · Wallet · Profile** — four tabs for most students. A fifth
**Host** tab appears (in the middle) once someone hosts an event or works a
door/team role; not having it is normal. Profile shows lifetime savings, deals
claimed, the per-school monthly leaderboard (ranked by amount saved),
favorites, deal history, and settings.

The **Deals** tab has a Local / National toggle at the top: Local is the
student's campus, National is the brand catalog (see "National deals").

On **Events**, named events are green and Weekly Cover nights are pink. **Events
→ Venues** lists venues that have upcoming events or Weekly Cover, not places
that only have deals.

## Support contacts

- Email: **support@bizzyu.com** (replies within 24h on business days)
- Business users on event night: their Bizzy campus representative
- The app also has a Contact form (Profile → Contact us)
