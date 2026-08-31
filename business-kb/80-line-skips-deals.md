# Line skips (legacy) & deals

## Line skips are a legacy product

Line skips were Bizzy's original door product: customers paid in advance for a
specific night, showed a QR at the door, and walked to the front with
guaranteed entry, cover included.

That product has been **retired for new setups**. There is no Line skips item
in the sidebar and **no way to create a new line-skip schedule** from the
dashboard. The modern way to sell nightlife entry is a **Weekly Cover**
series: Cover as the base tier, with **"Skip the Line"** as a faster-entry
option on a night (see "Weekly Cover"). If an owner asks how to set up line
skips, point them to Weekly Cover, not to a create flow that no longer exists.

### Venues that still have a legacy schedule

Existing line-skip schedules **keep working** until the venue turns them off:
nights keep generating on the rolling schedule (about 2 weeks ahead) and keep
selling.

- **Where to find it**: inside **Events**, in the Weekly Cover view, through
  the muted legacy line-skips link. Opening a night from there still works.
- **Managing nights**: each upcoming night can be edited (price, quantity,
  times) or cancelled. Cancelling a night automatically refunds every buyer
  for that night (see "Stripe & payouts" for what a refund does).
- **Turning the schedule off**: the legacy Line skips page has a "Turn off
  line skip" action (owner or manager). It is **blocked while a future night
  still has paid passes** — the dialog says how many passes across how many
  nights. Cancel those nights first (which refunds those buyers), then turn
  it off.
- **Sold passes always keep working** exactly as bought: one night, one use,
  camera scan, cover included. Never tell a customer or an owner that a sold
  pass stopped being valid because the product is legacy.
- **Scanning**: line skips are scanned with the phone's **regular camera app**,
  not the in-app scanner (see "Scanning & door counters").

### A naming collision worth knowing about

"Skip the line" is an ordinary English phrase, and owners use it loosely. When
someone says it, they might mean:

- **A Weekly Cover tier named "Skip the Line"** — the current product. Still
  Weekly Cover for that night (`product_kind` weekly_cover). Camera Check In.
  See "Weekly Cover". This is the most likely meaning going forward.
- **A ticket tier they named "Skip the Line"** on a **named event**. That is
  just a ticket: in-app scanner, cover only if they said so.
- **A legacy Bizzy line skip**, the retired standalone product above. Camera
  scan, includes cover.

If it isn't clear which one an owner means, ask one short question before
answering, because the scanning method and the management screens are
different. Don't assume a ticket named "Skip the Line" is a line skip, and
don't send a Weekly Cover owner to the legacy line-skips screen to fix Cover.

## Deals

Deals are **free-to-create** special offers (discounts, freebies, BOGO) that customers
claim in the app to use at your venue. They're essentially free advertising that drives
foot traffic — **no fees, ever**.

### Creating a deal

1. Go to **Deals** in the sidebar and click **"Create deal"**.
2. Add a short, specific title and a clear description.
3. Pick a category and a **claim frequency** (daily, weekly, monthly, or anytime).
4. Set estimated savings, a start date, and an eye-catching image.
5. Choose the venue.

### Deal tips

- Deals with photos get significantly more claims.
- Keep titles short and specific ("$5 margs" beats "Special drink promotion").
- Update deals regularly and use limited-time offers to create urgency.
- Customers claim in the app and show the claim to your staff; the app enforces the
  frequency you set.

### National deals are a different thing

The app also shows **national deals**: student discounts from national brands,
curated by the Bizzy team, the same across every campus, redeemed on the
brand's own website. They are **not** created from this dashboard, and a
venue's local deals never compete with them in the local feed. If an owner
asks how to get their offer into the national catalog, that's a conversation
with the Bizzy team — collect the details and point them to
support@bizzyu.com.
