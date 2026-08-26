/**
 * The user-facing name for the line-skip product — ONE definition.
 *
 * ⚠️ PLACEHOLDER. A rename is pending and undecided. Every operator-facing
 * string that names the product should read from here so the rename is one
 * edit to this file rather than a hunt through the dashboard.
 *
 * This is a DISPLAY string only. It deliberately does not match — and must not
 * be used to rename — the database tables (`line_skips`, `line_skip_instances`,
 * `line_skip_tickets`), the API paths (`/business/line-skips`), the response
 * fields (`line_skip_revenue_cents`, …), or the route (`/business/line-skips`).
 * Those are contracts shared with the frozen mobile app and must not move.
 *
 * Not yet adopted by `NAV_LINKS` in ./constants.ts, which still reads
 * "Line Skips" — pointing the sidebar here is a separate, deliberate rename of
 * an existing surface, not something LSK-19 changed on its way past.
 */
export const LINE_SKIP_LABEL = "Skip the Line"
