// Host-facing Analytics copy (D-P5).
//
// Analytics is a HOST dashboard. The old line-skip product tab is the same
// IA as Events vs Weekly Access: hosts see Weekly Access, never
// "line skip" / "Line skip" / "Skip the Line", and never the student
// string "Door Access".
//
// Display only. Tab values (`line-skips`), API paths
// (`/business/line-skips/analytics/...`), and response fields stay as they are.
//
// ANALYTICS_ACCESS_TAB_LABEL must stay equal to WEEKLY_ACCESS_SECTION_LABEL
// in ./door-access — the test pins that. This file does not import
// door-access.ts so `node --test` can load it without the rest of that module.

/** Tab / filter label for the old line-skip product. Host vocabulary. */
export const ANALYTICS_ACCESS_TAB_LABEL = "Weekly Access"

export const ANALYTICS_PAGE_DESCRIPTION =
  `Performance across deals, events, and ${ANALYTICS_ACCESS_TAB_LABEL}.`

export const ANALYTICS_ACCESS_EMPTY_TITLE = `No ${ANALYTICS_ACCESS_TAB_LABEL} nights yet`

export const ANALYTICS_ACCESS_EMPTY_DESCRIPTION =
  `Create a ${ANALYTICS_ACCESS_TAB_LABEL} program to see analytics here.`

export const ANALYTICS_ACCESS_ACTIVE_SECTION = `Active ${ANALYTICS_ACCESS_TAB_LABEL}`

export const ANALYTICS_ACCESS_PAST_SECTION = `Past ${ANALYTICS_ACCESS_TAB_LABEL}`

/** First tile on the Weekly Access analytics list (nights, not one-off events). */
export const ANALYTICS_ACCESS_TOTAL_LABEL = "Total nights"

export const ANALYTICS_HELP_INTRO =
  `Track your performance across events, deals, and ${ANALYTICS_ACCESS_TAB_LABEL}.`

export const ANALYTICS_HELP_TABS =
  `The Analytics page shows how your business is performing, split into Events, Deals, and ${ANALYTICS_ACCESS_TAB_LABEL} tabs.`

export const ANALYTICS_HELP_REVENUE_FAQ =
  `Go to Analytics in the sidebar. Your revenue is shown for events, ${ANALYTICS_ACCESS_TAB_LABEL}, and overall.`

/** Every host-visible Analytics string. Used by the regression test. */
export const ANALYTICS_HOST_COPY = [
  ANALYTICS_ACCESS_TAB_LABEL,
  ANALYTICS_PAGE_DESCRIPTION,
  ANALYTICS_ACCESS_EMPTY_TITLE,
  ANALYTICS_ACCESS_EMPTY_DESCRIPTION,
  ANALYTICS_ACCESS_ACTIVE_SECTION,
  ANALYTICS_ACCESS_PAST_SECTION,
  ANALYTICS_ACCESS_TOTAL_LABEL,
  ANALYTICS_HELP_INTRO,
  ANALYTICS_HELP_TABS,
  ANALYTICS_HELP_REVENUE_FAQ,
] as const
