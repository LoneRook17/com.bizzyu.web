// Host-facing copy for Manage Event → Promoters (owner / manager / staff).
// Display only. Does not change commission math, payout flags, or the
// create-link / list UI on that page.

export const PROMOTER_TAB_SUBTITLE =
  "Referral links for this night, and what they've earned."

export const PROMOTER_TAB_EXPLAINER =
  "Promoters share a referral link. Anyone can buy from it, app or not. They earn a cut of those sales. You don't pay anyone out of pocket. Bizzy handles it. More people come to the night."

export const PROMOTER_TAB_EMPTY_TITLE = "No promoters yet"

export const PROMOTER_TAB_EMPTY_DESCRIPTION =
  "Once someone shares a referral link for this night, they show up here with clicks, sales, and what they've earned."

// Same money meaning as before: already taken out, host does not pay it
// separately, Stripe take-home is what is left. Plain words only.
export const PROMOTER_TAB_COMMISSION_EXPLAINER =
  "Already deducted from ticket sales. You don't pay anyone out of pocket. Bizzy handles it. Your Stripe take-home is what's left after this."

export const PROMOTER_TAB_HOST_COPY = [
  PROMOTER_TAB_SUBTITLE,
  PROMOTER_TAB_EXPLAINER,
  PROMOTER_TAB_EMPTY_TITLE,
  PROMOTER_TAB_EMPTY_DESCRIPTION,
  PROMOTER_TAB_COMMISSION_EXPLAINER,
] as const
