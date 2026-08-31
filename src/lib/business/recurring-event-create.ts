/**
 * Green recurring event create — product_kind=event on /business/recurring-series.
 *
 * Not Weekly Cover. Never send program_kind=door_access. Fresh create does not
 * send Custom one-date overrides. Weekday diffs at create are the series
 * weekday template (days_of_week + one hours/tickets template), not Custom.
 */

export const GREEN_RECURRING_PRODUCT_KIND = "event" as const

export function todayIsoDate(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA")
}

export type GreenRecurringCreateInput = {
  name: string
  description: string
  venue_id: number | null
  venue_name: string
  venue_address: string
  days_of_week: number[]
  date_range_start?: string
  date_range_end?: string | null
  start_time: string
  end_time: string
  type: "Ticketed" | "Free"
  is_21_plus: boolean
  flyer_image_url: string
  template_tickets: unknown[]
  notify_followers_on_publish: boolean
  promotion_enabled: boolean
  promotion_commission_type?: "percent" | "fixed"
  promotion_commission_value?: number | null
}

export function greenRecurringCreatePayload(
  input: GreenRecurringCreateInput,
  now: Date = new Date(),
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    description: input.description.trim() || null,
    days_of_week: [...input.days_of_week].sort((a, b) => a - b),
    date_range_start: input.date_range_start || todayIsoDate(now),
    date_range_end: input.date_range_end || null,
    start_time: input.start_time,
    end_time: input.end_time,
    venue_id: input.venue_id,
    venue_name: input.venue_name,
    venue_address: input.venue_address,
    type: input.type,
    is_21_plus: input.is_21_plus,
    flyer_image_url: input.flyer_image_url || null,
    template_tickets: input.type === "Ticketed" ? input.template_tickets : [],
    notify_followers_on_publish: input.notify_followers_on_publish,
    product_kind: GREEN_RECURRING_PRODUCT_KIND,
    promotion_enabled: false,
  }

  if (input.promotion_enabled) {
    payload.promotion_enabled = true
    payload.promotion_commission_type = input.promotion_commission_type ?? "percent"
    payload.promotion_commission_value = input.promotion_commission_value ?? null
  }

  return payload
}
