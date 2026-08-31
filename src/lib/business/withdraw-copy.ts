// Host / promoter withdraw is Transfer-only. Stripe automatic daily pays the bank.
// Instant is gone. A Transfer is not a bank deposit.

/** Same honesty as EscrowPanel in_transit: money left Bizzy, not in the bank yet. */
export const WITHDRAW_IN_TRANSIT_COPY =
  "A withdrawal sends money to your Stripe account. Stripe then deposits it to your bank on its daily schedule. It is not in your bank yet."

/** Lifetime withdrawn / transferred. Not deposited, and not a bank send on Transfer. */
export const PROMOTER_WITHDRAWN_LABEL = "Withdrawn"

export const PROMOTER_WITHDRAW_HELP_AFTER_HOLD =
  `They withdraw on demand to Stripe. ${WITHDRAW_IN_TRANSIT_COPY} There is no weekly payout and no instant option.`

export const PROMOTER_TERMS_PAYOUT_COPY =
  "Withdrawals go to your Stripe account. Stripe then deposits to your bank on its daily schedule. By continuing, you agree to the Bizzy Promoter Terms."
