# Stripe & payouts (getting paid)

Stripe is the payment service that handles the money. When a customer buys a ticket or
line skip, Stripe collects payment and sends your share to your bank account.

## Connecting Stripe

You must connect Stripe **before you can create any paid events, Weekly Cover,
or line skips**.

1. Go to **Settings** in the sidebar.
2. Find the **Stripe Connect** section and click **"Set up business Stripe"**.
3. Follow Stripe's wizard — they'll ask for your business details, bank account, and a
   photo ID for verification.
4. When finished, you're brought back to the Bizzy dashboard.

- You can also complete Stripe setup from the Bizzy phone app.
- In **Settings → Stripe Connect** you can view your connection status and **reconnect**
  if Stripe needs more information. Stay connected while you have active paid events or
  line skips.

## Multiple venues: per-venue payout accounts

By default, all of your ticket and line-skip sales pay out to one Stripe account (your
**default payout account**). If you run more than one venue and want a venue's sales to
land in a **different** Stripe account, you can set that up under **Settings → Payments →
Venue payout accounts**.

- **Add an account (owner only):** click **"Add account"**, give it a label (for example
  the venue's business name), and complete Stripe onboarding for it. It becomes another
  payout account on your business.
- **Match a venue to an account:** in **Venue routing**, pick the payout account for each
  venue. Sales at that venue then pay out to that account. Venues you leave on **"Default
  payout account"** keep paying out to your default.
- **Sharing is fine:** several venues can point at the same account.
- **Onboarding matters:** a venue can only be matched to an account that has finished
  Stripe onboarding. Matching a venue to an account that is **not** fully onboarded will
  **pause ticket sales at that venue** until onboarding is complete (the dashboard warns
  you clearly before you confirm). Bizzy never silently reroutes to another account. You
  can **un-match** in one click to instantly restore default routing.
- **Who can manage this:** owners can add accounts, set the default, and match venues;
  managers can match venues to existing accounts; staff and promoters can't manage payout
  accounts.
- **Past sales don't move:** each order's destination is locked in when it's purchased, so
  changing a venue's account only affects future sales, never past ones or refunds.

## When you get paid

- Payouts run on **Stripe's schedule for your account**, not a Bizzy timeline. Your first
  payout takes longer than later ones, because Stripe is still verifying the account.
  Don't quote a number of days: Bizzy doesn't set the schedule and can't promise a date.
- Exact payout dates and history live in **your Stripe dashboard**. If a payout seems
  overdue, check **Settings → Stripe Connect** for anything Stripe still needs, and
  escalate to support@bizzyu.com if it's still unclear.

## Your Bizzy balance (earnings held before payout)

Some earnings land in a **balance on your Bizzy account** first, and move to your Stripe
account when you withdraw them. Stripe then deposits that money to your bank on its
daily schedule. A withdrawal is not a bank deposit yet. This is the balance you see in
the app, separate from your Stripe dashboard.

- Earnings arrive as **Pending** and become **Available** once the event they came from
  is safely past. Pending money is not withdrawable yet.
- **You must have Stripe connected to withdraw.** That is the one requirement. If Stripe
  isn't connected, the balance simply sits there until you connect it, and nothing is
  lost by waiting.
- **There is no minimum to withdraw your own earnings.** Whatever is Available can go out,
  even a few dollars. (The **$20 minimum is promoter commission only** and is unchanged.
  See "Promoters & commissions".)
- Withdrawals go to the **Stripe account you connected**, so the bank details are whatever
  you gave Stripe.

What you should NOT say about this balance: don't describe it as held in trust, in escrow
for the owner, safeguarded, segregated, insured, or protected, and don't compare it to a
bank account. Explain what moves the money and what the owner has to do, nothing more. If
an owner asks who legally holds it, or what happens to it in a worst case, escalate to
support@bizzyu.com rather than answering from this pack.
- **Revenue shown in Analytics is *your* revenue** — the amount you receive. The service
  fee is added on top and paid by the customer, so it doesn't come out of your share. You
  receive the full amount you set (minus any promoter commission on promoter-driven sales,
  if you run the Promoter Program).

## Refunds & your Stripe balance

- **Customers can't self-serve refunds**, and businesses don't issue individual refunds
  from the dashboard. Exceptional cases go through support (support@bizzyu.com).
- Refunds happen automatically only when **you cancel** an event, a Weekly Cover
  night, or a line-skip night.
  Then every buyer is refunded in full (price + fees) automatically, and the money is
  **pulled back from your Stripe account** (Stripe may add processing fees for the
  reversal). See the "Events" article for the cancellation flow and the
  repeated-cancellation policy.

## Promoter payouts

- If you run the Promoter Program, promoter commissions accrue to each promoter's **in-app
  wallet**, become **Available 2 days after that night's event**, and they **withdraw on
  demand to Stripe**. Stripe then deposits to their bank on its daily schedule. A
  withdrawal is not a bank deposit yet. There is no weekly payout and no instant option.
  This is separate from your own revenue (commission
  comes out of the host's share). See the "Promoters & commissions" article for the full
  flow.
- Promoter withdrawals have a **$20 minimum**. Your own earnings do not. These are two
  different rules and it's worth being explicit if an owner is also promoting.

## Troubleshooting payouts

- If a payout is late or Stripe is asking for more info, check **Settings → Stripe
  Connect** and complete any outstanding verification.
- For anything a reconnect doesn't fix, escalate to support@bizzyu.com with your
  business name and the event/date in question.
