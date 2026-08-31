# Scanning, door codes & door counters

## Scanning tickets (named events)

1. Open the event → **Manage → Scanner** in the dashboard (or use the Bizzy
   phone app). There is no Scanner item in the sidebar.
2. Point the camera at the customer's QR-code ticket.
3. **Green = valid ticket**, let them in. **Red = already used or invalid**, don't let
   them in.

- This is for **named events** (`product_kind` event). Weekly Cover passes
  are **not** scanned here — the in-app scanner refuses them. See "Weekly Cover".
- Assign team members the **Staff** role so they can scan named-event tickets too
  (see the "Team" article).
- A ticket's **scan window** (its "Valid from / Valid until" times, if set) controls
  when it can be scanned.

## Weekly Cover (camera Check In)

Guests (or staff) open the Cover QR with **any phone camera** and tap **Check In**.
No staff login. On the night, use the **redemption list** to check names off.
Don't send Weekly Cover to Scanner or to a 6-digit door code.

## Door codes (named events only)

Every **named event** has a **6-digit door code**. It's the fastest way to get a
doorperson scanning a green event: they never make an account or get invited.
This is still the answer to "how do I get someone scanning **event tickets**
tonight?" — share the code, not an email invite. Weekly Cover does not use it.

How a staffer uses it:

1. They open the Bizzy phone app and, on the **login screen**, tap **"Scan
   Tickets"** (they do not log in).
2. They type the **6-digit code**.
3. They land on the **door hub** for that event, where they can **Scan Tickets**,
   **Accept Payments** (Tap-to-Pay door sales), and view **Check-ins** — all with
   no account.

Where you find and manage the code:

- Open the event → **Manage** → the door code section. There you can **view**,
  **share**, and **rotate** the code, and add an optional **label** (like "Front
  door") that the staffer sees.
- The code is a **credential**, so who can see or rotate it is limited: the
  **business owner**, **managers**, the **event's creator**, and event
  **co-hosts**. Business **staff** and event **crew** can't view it in the
  dashboard — you hand them the code to use at the door.

Good to know:

- The code is generated automatically for each event (each recurring night gets its
  own).
- It stops working about **2 hours after the event ends**.
- **Rotating** the code makes a brand-new one and **kills the old one instantly** —
  use it if a code leaks.
- When a **new device** first uses the code, the owner gets a notification, so an
  unexpected doorperson is visible.
- A door-code session can scan and take door payments, but it can **never issue
  refunds or manage the event** — those stay in the dashboard for owners/managers.
- Money from a door-code Tap-to-Pay sale still routes to the venue's own Stripe
  account, exactly like any other door sale.

## Scanning line skips (different!)

- **Line skips do NOT use the in-app scanner.** Use the phone's **regular camera app**
  instead.
- Open your phone's camera, point it at the customer's line-skip QR code, and tap the
  link that pops up — it shows whether the line skip is valid.

## Door counters (headcounts at the door)

Door counters are live tally tools for tracking headcount, capacity, or any count at
the door. Each counter has a title, a **step** (how much each tap adds/subtracts), and
an optional **goal**.

- **Who can use them:** owners, managers, and co-hosts can create, edit, and delete
  counters; owners, managers, co-hosts, staff, and crew can **record taps** at the door.
- Counters are tapped from the Bizzy app during the event. Every tap is recorded, so you
  get a **per-staff breakdown** (who tapped, how many taps, and the net count) plus the
  current total and progress toward the goal.
- The counter **recap** — including the per-staff breakdown — is available on the event's
  **Manage** page.

## If a scan won't go through

- Make sure the scanning person's account has a role that allows scanning (Staff or
  above) and that they're scanning the right event.
- If valid tickets are being rejected at the door, don't turn people away on a hunch —
  escalate to support@bizzyu.com or your Bizzy campus rep right away.
