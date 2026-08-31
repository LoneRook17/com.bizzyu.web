# Recurring events (weekly series)

Run the same **named event** every week, like Trivia Tuesdays or Friday Karaoke,
without building each night by hand. You set up a **series** once and Bizzy
creates each night automatically. Every night is a **green named Event**
(`product_kind` event) with its own tickets, its own sales, and its own 6-digit
door code.

This is **not Weekly Cover**. Weekly Cover is a pink series of Cover nights
(`product_kind` weekly_cover). A custom Weekly Cover night does not become a
recurring named event. See "Weekly Cover".

There is no Recurring item in the sidebar. Open a named series from the grouped
rows on the **Events** list.

## Creating a series

1. Create a **named Event** (Events → Create → green Event tile) and turn on
   the weekly repeat, or open an existing series from the Events list.
2. Give it a name and description.
3. Pick the **nights of the week** it runs (one or more), a **start date**, and an
   optional **end date**. Leave the end date blank to keep it going.
4. Set the **end time** for each night.
5. Build your **ticket template** (the ticket types each night starts with), same
   as a normal event.
6. Pick the venue. As with any paid event, Stripe must be connected.

Bizzy then generates the upcoming nights for you. You don't create each night by
hand.

## Each night is its own event

- Every generated night is a **separate event** with its **own inventory, its own
  sales, its own analytics, and its own door code**. Selling out one night does
  **not** sell out the next one.
- Alerts (like low-stock) fire per night, and each night's door code is separate,
  so rotating one night's code doesn't touch the others.

## Editing one night vs. the whole series

- **Edit a single night** (open that night and edit it) to change just that date,
  for example a special price or a different lineup. That night is then marked
  **"Customized"** and a banner shows it.
- **Edit the series template** to change all the upcoming nights at once. Two
  protections apply automatically:
  - Nights you already **customized** are **left alone** — a template edit won't
    overwrite them.
  - On a night that already has **buyers**, the tiers people bought stay in place;
    only unsold tiers are updated. Existing ticket holders are never disrupted.

## Suspending a series

- Suspending the series stops future nights, but it **only cancels nights that
  have no sales**. Nights that already have **buyers**, and nights you
  **customized**, are **preserved** so you never strand a customer who already
  bought a ticket.

## Promoters and door codes on recurring nights

- The **Promoter Program** settings you set on the series carry through to every
  generated night, so promoters can create links on any night.
- Each night gets its own **6-digit door code**, and you can **rotate** any one
  night's code without affecting the others (see the "Scanning, door codes & door
  counters" article).

## A note on far-out nights and discovery

- Generated nights that are **more than about a week away** don't show up in the
  student discovery feed or search **yet**. This is on purpose, to keep the feed
  focused on what's coming up soon.
- Those nights still **exist and still sell** — they're fully manageable in your
  dashboard, and **direct links and promoter links to them still open and work**.
  As each night gets closer, it appears in the feed and search on its own.
