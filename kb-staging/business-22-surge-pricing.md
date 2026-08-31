# Surge pricing (DRAFT, not live on prod)

> Staged article. Surge is not on production yet: the `surge_ladders` and `surge_steps`
> tables do not exist there. Re-verify before shipping and move into `business-kb/` next
> to `20-tickets.md`.

## What surge does

Surge raises a ticket's price automatically as it sells. You set a ladder of steps, and
each step says: once this many have sold, the price becomes this. Early buyers get the
low price, later buyers pay more, and you don't have to sit there editing the price.

## Setting it up

1. Open the ticket tier you want to surge.
2. Turn surge on.
3. Add steps. Each step is a number sold and the price to move to at that point.

Rules that the dashboard enforces:

- Steps have to climb. Each step's price must be higher than the one before it, and the
  first step must be higher than the starting price. A ladder that would ever lower the
  price is rejected when you save.
- Surge only moves the price **up**. It will never drop a ticket below what it is
  currently selling for.
- Changing the price affects future purchases only. Anyone who already bought keeps what
  they paid.

## The thing owners get wrong

The ladder's starting price and the tier's current price are two different numbers. Once
sales have pushed the price up a step, the tier's price is the stepped-up price, while the
ladder still remembers where it started. That is expected. If an owner is confused about
why the price box shows a different number than the ladder's first row, that is why.

If an owner raises the price of a tier that already has a ladder, they should check the
ladder still makes sense at the new price. The dashboard will refuse to save a ladder that
no longer climbs from the new price.

## What not to say

- Don't promise surge will increase revenue. It changes pricing, it doesn't guarantee
  sales.
- Don't quote specific step values as a recommendation. The owner sets those.
- If an owner reports that a price went **down**, treat that as a bug and escalate to
  support@bizzyu.com with the event name and ticket tier. Surge is not supposed to do
  that.
