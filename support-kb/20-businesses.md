# Business & venue side

Source: the business dashboard help center (bizzyu.com/business → Help). Answers here
apply to business/venue users.

## Accounts & getting started

- Log in at bizzyu.com/business with email + password. "Forgot password" on the login
  page sends a reset link (check spam). Still locked out → support@bizzyu.com.
- New signups are reviewed by the Bizzy team; approval is usually fast and the business
  gets an email once approved. While waiting they can log in and set up their venue.
- The business email on the account can't be self-changed — email support@bizzyu.com.
- The Bizzy phone app doubles as the business tool for scanning and door sales. Sign
  up in the app with the same phone number as the business account to link them.

## Getting paid (Stripe)

- Businesses must connect **Stripe** (Settings → Stripe Connect) before creating paid
  events, Weekly Cover, or line skips. Stripe's wizard asks for business details,
  bank account, and photo ID.
- Sales pay out to the business's bank account on Stripe's schedule for their account
  (not a Bizzy timeline). The first payout usually takes about 7 to 14 days while Stripe
  verifies the account; after that, payouts arrive on Stripe's standard rolling schedule.
  Exact dates live in the business's Stripe dashboard.
- A service fee is added on top of the business's price and paid by the customer —
  the business receives the full amount it set.
- Businesses with more than one venue can route a specific venue's sales to a different
  Stripe account (Settings → Payments → Venue payout accounts); by default everything
  pays out to one default account.

## Venues

- A venue is a physical location; a business can have several. Every event, Weekly
  Cover series, deal, and line skip belongs to one venue. Add/edit venues under
  Settings → Your venues; the venue switcher at the top of the sidebar filters the
  dashboard.

## Events & tickets

- Create events under Events → "Create event": name, description, date/time, flyer
  image, optional 21+ toggle, venue, then ticket types.
- Multiple ticket types per event (e.g. GA $10, VIP $25). Each has a name, price
  ($0 = free), quantity (blank = unlimited), and max-per-person.
- Sold out: a "Sold out" badge appears automatically; increase quantity to sell more.
- Price changes only affect future purchases; existing holders keep their price.
- **Promo codes**: per-event under Manage → Promo codes — percentage or fixed amount
  off, with a max number of uses. The service fee is calculated on the discounted
  price.
- **Promoters**: enable the Promoter Program on an event and set commission terms.
  Promoters get a personal share link; commissions accrue to the promoter's in-app
  wallet and they cash out on demand (no weekly payout). Track under Manage → Promoters.
- **Recurring events** (named series, e.g. Trivia Tuesdays): each generated
  night is a **green named Event** with its own tickets, sales, and 6-digit
  door code. This is **not** Weekly Cover. Open grouped series rows from the
  Events list (there is no Recurring item in the sidebar).
- **Weekly Cover**: a pink series of regular nights. Customers buy Cover for
  one date. `product_kind` is `weekly_cover`, not `event`. Create from Events
  → Create → the pink Weekly Cover tile. A custom night stays Weekly Cover;
  editing the program still restamps that night. Camera check-in, not a door
  code. See "Weekly Cover". Don't guess from a title ending in Cover.
- **Low-stock alerts**: turn on low-stock/sold-out alerts on the event form (percent
  or count threshold; blank = sold-out-only). Alerts reach the event team by push and
  in the app's Events tab.

## Door tools

- **Scanning tickets** (named events): Scanner in the dashboard sidebar or the
  Bizzy app. Green = valid, let them in; red = already used or invalid.
- **Door codes** (named events only): every **named event** has a 6-digit door
  code. A doorperson opens the app, taps "Scan Tickets" on the login screen,
  types the code, and can scan and take door sales with NO account or invite.
  Find, share, and rotate it under the event's Manage page (owner, managers,
  event creator, and co-hosts can see/rotate it, not staff/crew). The code
  stops working about 2 hours after the event ends; rotating kills the old one
  instantly. Weekly Cover does **not** use this code. Cover is camera Check In.
- **Weekly Cover at the door**: any phone camera, tap Check In, no staff login.
  Use the redemption list to check names off. The in-app scanner refuses Cover.
- **Line skips are scanned with the phone's regular camera**, NOT the in-app scanner:
  point the camera at the QR, tap the link, it shows valid or not.
- **Tap-to-Pay door sales**: sell at the door with the phone as the card reader
  (Stripe must be connected; no extra hardware). Preset ticket types or custom
  amounts on the numpad; both are recorded in analytics.

## Line skips

- Created as a rolling schedule (days of week, doors open/close, price, quantity per
  night). The system generates upcoming nights 2 weeks ahead automatically.
- Each night can be individually edited (price/quantity/times) or cancelled.
- Line skips include cover and are guaranteed entry.

## Deals

- Free to create — no fees ever on deals. Created under Deals → "Create deal": title,
  description, category, claim frequency (daily/weekly/monthly/anytime), estimated
  savings, start date, image, venue.
- Students claim in the app and show the claim in person; the app enforces the
  claim frequency.

## Refunds & cancellations (policy)

- **All sales are final** — customers can't request individual refunds.
- Refunds happen only when the business cancels an event, a Weekly Cover night, or a
  line-skip night: every buyer is then refunded in full (price + fees) automatically
  through Stripe, and the money is pulled back from the business's Stripe account.
- Cancelling an event requires Bizzy admin approval when there is still money to refund.
  If the event only had free tickets, or every paid order was already refunded, there's
  nothing to return and it cancels immediately. Events that already ended can't be
  cancelled.
- Repeated cancellations trigger review: a 3rd cancellation within 90 days flags the
  account for review by the Bizzy team.

## Team

- **Business team** (ongoing, dashboard access): Owner (everything incl. settings),
  Manager (create/manage events, deals, line skips + analytics; no business
  settings), Staff (scan + Tap-to-Pay + basic event info), Promoter (share link +
  performance). Members can be global or venue-specific. Owners and managers manage the
  team; a manager can add members and remove or re-role non-owner members, but only the
  owner can remove or re-role another manager, transfer ownership, or manage billing.
- **Event team (co-hosts)**: help with one specific event only; no full dashboard
  access. Set up inside that event.
- Invites go by email from the Team page.

## Analytics

- Analytics tab: tickets sold (online + door), revenue (shown as *your* revenue —
  what the business receives), check-in rate; per-event breakdowns by ticket type
  and pre-sale vs door.
