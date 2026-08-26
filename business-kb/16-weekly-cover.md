# Weekly Cover

Weekly Cover is a **recurring door program** for a venue's regular nights.
You set it up once (which weekdays, doors, Cover and/or Skip the Line
prices). Bizzy generates each upcoming night. Customers buy **Cover** for
**one specific night** and show a QR at the door.

It is **not** a named Event. A custom night is still Weekly Cover. It is
not Trivia Tuesdays (see "Recurring events") and not the standalone line
skip (see "Line skips & deals").

User-facing name is **Weekly Cover** / **Cover**. Don't tell an owner or a
guest it is "door access". The dashboard URL and API may still say
`door-access`; that is wiring, not the product name.

## How to tell it from an event

Identify from **`product_kind`**, never from the title.

- **`product_kind` = `weekly_cover`** — Weekly Cover. Pink. Older
  payloads may only send `access_kind` door_access / weekly_cover. Use
  that fallback only when `product_kind` is missing.
- **`product_kind` = `event`** — a named event (one-off or a recurring
  named series like Trivia Tuesdays). Green. A show titled "Weekly Cover
  Launch Party" is still an event if the stamp says `event`.

Don't guess because the name ends in Cover.

## Creating a series

1. Go to **Events** (or Home) and click **Create**.
2. Pick the **pink Weekly Cover** tile (not "An event").
3. Choose what you sell: **Weekly Cover**, **Skip the Line**, or **both**.
4. Pick the nights of the week, then set doors open/close and prices per
   night.
5. Stripe must be connected before paid nights can sell, same as paid
   events.

The series is usually named like "{Venue} Cover". That name is **not**
how the app decides what the product is.

There is no Weekly Cover item in the sidebar. Open a series from the
**Events** list (filter **Weekly Cover**) or from Home. Pink rows open
the **program**, not a single night as if it were a green event.

## Series, nights, and a custom night

- The **series / program** is the weekday template: which nights it
  runs, door times, and the Cover / Skip the Line options.
- Each **night** is one date. Customers buy that date only. Selling out
  Thursday does not sell out next Thursday.
- **Edit program** changes the series. That **restamps** upcoming nights,
  including a night already marked Custom.
- **Edit one night** (open that date) changes price, hours, or closed
  **for that date**. That night stays Weekly Cover (pink). Custom is
  **not** a forever fork and **not** a green named Event. Do not send
  the owner to Create event / Edit event / Manage tickets on the generic
  event screens to "split it off".

If they want a one-off named show (a concert, a holiday party with its
own title), that is a **separate Event**, created from the green Event
tile.

## Tiers

A night can sell **Cover** (entry) and/or **Skip the Line**. Skip the
Line can include cover or not; the owner sets that, and checkout shows
it.

A Weekly Cover tier named **"Skip the Line"** is still Weekly Cover. It
is not the standalone **Line skips** product in the old line-skip
schedule. If an owner says "skip the line", ask which one before you
answer: scanning and setup screens are different.

Price changes apply to **future** purchases only. Existing buyers keep
what they paid. Quantity **0** is unlimited, same idea as event tickets.

## At the door

Weekly Cover is scanned with **any phone camera**. The guest (or staff)
opens the QR, taps **Check In**. **No staff login** and **no in-app
Bizzy scanner**.

- On the night, use the program/night **redemption list** to check
  names off. Don't send them to Scanner or a 6-digit door code for
  Cover passes. The in-app scanner refuses Weekly Cover.
- **6-digit door codes stay for named events.** Staff still use
  Scan Tickets on the login screen plus the code for green events.
  Don't tell a Weekly Cover owner that door codes went away for events,
  and don't tell them to use a door code for Cover.

Check-in opens closer to doors and closes after that night's window.

## Cancelling a night

Cancelling a Weekly Cover night refunds that night's buyers the same way
cancelling an event or a line-skip night does. If there is money to
refund, it goes to the Bizzy team for review first; if there is nothing
refundable, it cancels immediately. You can't cancel a night that has
already ended. See "Events".

## Analytics

Weekly Cover nights are counted on the **Weekly Cover** analytics tab,
not as extra named events on the Events tab. See "Analytics, Tap-to-Pay
& marketing".

## Promoters

You can turn on the Promoter Program on the series (same paid-ticket +
Stripe rules as events). Don't invent Weekly Cover-only commission
rules; if the pack doesn't say it, escalate.

## What not to say

- Don't call it a subscription, membership, or season pass. Guests buy
  one night at a time.
- Don't call a custom night a new event, a fork, or "now it's Trivia
  Tuesdays".
- Don't say a series-wide edit skips a custom night. The program edit
  **restamps** that night.
- Don't identify the product from the title.
- Don't promise a night will be generated by a particular date. Say the
  series generates upcoming nights and point them at the program
  screen.
- Don't document surge or other unlisted add-ons. If they ask, escalate.
