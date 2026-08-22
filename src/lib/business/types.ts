import type { InviteDelivery } from '@/lib/team-invite/types'
import type { PayoutsAccess } from './payouts-scope'
import type { ArtworkTemplate, RedemptionMode } from './constants'

export interface BusinessUser {
  id: number
  email: string
  full_name: string
  business_role: 'owner' | 'manager' | 'staff' | 'promoter'
  venue_id: number | null
  // TM-B2 (#15) venue-SET: the caller's own venue set when they're scoped to
  // more than one. Optional/additive — absent on legacy /me deploys, where the
  // scalar venue_id above still governs the switcher lock byte-identically.
  venue_ids?: number[] | null
  // Per-person Payouts access: whether THIS caller may open the Payouts page +
  // export CSVs — true for the owner OR an owner-granted member (services
  // feat/payouts-per-person-access). Optional/additive: ABSENT on a pre-contract
  // /me deploy, where the owner-role fallback in canAccessPayouts() still lets
  // owners in exactly as before.
  can_view_payouts?: boolean
  // PAYOUTS-PER-PERSON-ACCESS venue-scope: which payouts MODE the web renders
  // without guessing — { granted, all_venues, venues? }. Owner / global granted
  // members are all_venues:true (full account view). A SCOPED granted member is
  // all_venues:false and carries `venues` (id+name) for the venue picker.
  // Optional/additive: ABSENT on a pre-contract /me — the VENUE_SCOPE_REQUIRED
  // 403 fallback still drives the picker in that case. See payouts-scope.ts.
  payouts_access?: PayoutsAccess
}

export type DashboardMode = 'deals' | 'events' | 'hybrid'

export interface Business {
  business_id: number
  name: string
  email: string
  status: 'pending' | 'pending_verification' | 'pending_approval' | 'approved' | 'rejected' | 'suspended'
  logo_url: string | null
  dashboard_mode?: DashboardMode | null
}

export interface Venue {
  id: number
  business_id: number
  name: string
  address: string | null
  description: string | null
  photo_url: string | null
  campus_id: number | null
  is_active: boolean
  website: string | null
  instagram: string | null
  // #9 venue-stripe: matched business_stripe_accounts row (null = default
  // routing). Absent from envs that haven't run the V1 core migrations —
  // the services GET /business/venues drift guard serves the old shape.
  business_stripe_account_id?: number | null
  created_at: string
  updated_at: string
}

// #9 venue-stripe V3 — one business_stripe_accounts row as served by
// GET /business/stripe-accounts (live-verified against Stripe per request:
// a deauthorized/deleted account comes back with all flags false and
// stripe_reconnect_required true, regardless of what the DB claims).
export interface BusinessStripeAccount {
  id: number
  label: string | null
  stripe_connect_id: string | null
  stripe_connect_onboarded: boolean
  charges_enabled: boolean
  payouts_enabled: boolean
  is_default: boolean
  stripe_reconnect_required: boolean
  matched_venue_ids: number[]
}

export interface AuthState {
  user: BusinessUser | null
  business: Business | null
  isLoading: boolean
  isAuthenticated: boolean
  isPending: boolean
}

// Dashboard types
export interface DashboardSummary {
  total_events: number
  total_attendees: number
  total_revenue: number | null
}

export interface QuickStats {
  active_deals_count: number
  claims_this_week: number
  upcoming_events_count: number
  next_event_date: string | null
  // LSK-19 line-skip aggregate. Optional because an older server (a rollback to
  // :150 or below) answers this endpoint without them — the Home page must read
  // "no line skips" from their absence, never crash on it.
  /** Has this business EVER scheduled a night? Presence, not revenue — a venue
   *  with nights and no sales is still a line-skip venue and sees a real $0. */
  has_line_skip_nights?: boolean
  /** Host's take in CENTS, all-time, Bizzy's fee excluded. Omitted for staff
   *  (owner/manager only), exactly like DashboardSummary.total_revenue. */
  line_skip_revenue_cents?: number
  line_skip_passes_sold?: number
  /** Start of the next night that has not ended yet, on the VENUE's clock.
   *  'YYYY-MM-DD HH:MM:SS' so `new Date()` reads it as local, like
   *  next_event_date — a bare date would render as the previous day. */
  next_line_skip_date?: string | null
}

export interface ActivityFeedItem {
  type: 'ticket_purchase' | 'deal_claim' | 'team_join' | 'event_milestone'
  message: string
  timestamp: string
  metadata?: {
    event_id?: number
    order_id?: number
    user_name?: string
    deal_id?: number
    member_id?: number
    role?: string
  }
}

// Auth request/response types
export interface LoginRequest {
  email: string
  password: string
}

export interface SignupRequest {
  email: string
  password: string
  business_name: string
  contact_name: string
  phone?: string
  campus_id: number
}

export interface LoginResponse {
  message: string
  user: BusinessUser
  business: Business
  tokens: { accessToken: string; refreshToken: string }
}

export interface MeResponse {
  user: BusinessUser
  business: Business
}

// Event types
export interface EventListItem {
  event_id: number
  name: string
  description: string
  venue_name: string
  venue_address: string
  start_date_time: string
  end_date_time: string
  type: 'Ticketed' | 'Free'
  status: string
  flyer_image_url?: string
  is_21_plus: boolean
  /** True on the SERIES TEMPLATE row only. Generated nights carry false. */
  is_recurring: boolean
  /**
   * D2-2. The series FK, present on every AUTO-GENERATED night and null on a
   * one-off. `SELECT e.*` has always returned it; the list only started needing
   * it when the Events page began grouping a series' nights under one row.
   * Optional because a build that predates the column would otherwise be a
   * type error rather than an ungrouped list, which is the safer degrade.
   */
  recurring_series_id?: number | null
  /**
   * V5 F14 — the pink flag. `'door_access'` marks one night of a Weekly Access
   * program; `'event'` is everything else and is the column default.
   *
   * V5 REDEMPTION reads it to pick the DOOR SURFACE (scanner vs redemption list)
   * on the manage page, because redemption is derived from kind rather than
   * chosen. `SELECT e.*` has returned it since the F14 migration; optional so a
   * response that predates the column degrades to 'event' rather than a type
   * error — which is also the correct reading of a missing value.
   */
  access_kind?: 'event' | 'door_access' | null
  total_attendees: number
  total_revenue: number
  ticket_sales_count: number
  checkin_rate: number
  moderation_reason?: string | null
  cancellation_status?: 'none' | 'pending' | 'approved' | 'denied'
  cancellation_reason?: string | null
  cancellation_requested_at?: string | null
  cancellation_denial_reason?: string | null
}

export interface TicketTier {
  ticket_id?: number
  name: string
  description?: string
  price_usd: number
  quantity: number
  available_quantity?: number
  sold_count?: number
  max_per_person?: number
  ticket_type: 'paid' | 'free' | 'guest'
  is_hidden?: boolean
  // Operator "force sold out" flag. Unlike is_hidden, the tier stays visible on
  // checkout but shows a Sold Out banner and can't be purchased. Quantity is
  // untouched — clearing it restores sales.
  force_sold_out?: boolean
  // Derived signal from the API: force_sold_out OR a finite tier that ran out.
  is_sold_out?: boolean
  // Scheduled tickets: optional sales/scan window (datetime-local strings, US/Eastern wall-clock). Empty/null = no limit.
  valid_from?: string | null
  valid_until?: string | null
}

export interface EventDetail extends EventListItem {
  venue_id: number | null
  university_id: number
  school: string
  fee: number
  percentage: number
  tickets: TicketTier[]
  my_event_role: 'owner' | 'cohost' | 'crew' | 'scan_only' | 'scan_door_sales' | null
  sales: { total_attendees: number; total_revenue: number; checkin_rate: number }
  promotion_enabled?: boolean | number
  promotion_commission_type?: 'percent' | 'fixed' | null
  promotion_commission_value?: number | null
  lowstock_alerts_enabled?: boolean | number
  lowstock_threshold_type?: 'percent' | 'count' | null
  lowstock_threshold_value?: number | null
  lowstock_notify_business_team?: boolean | number
  // NOTE: the door code is intentionally NOT on this payload. It's a credential,
  // so services keeps it off the broadly-fetched event and serves it from a
  // dedicated GET /business/events/:id/door-code — DoorCodeCard fetches it there.
  // Recurring series linkage (#5): set when this event is one night of a
  // recurring series. series_customized_at marks a hand-edited night that
  // template edits will never overwrite.
  recurring_series_id?: number | null
  series_customized_at?: string | null
  occurrence_date?: string | null
}

export interface RecurringNight {
  day_of_week: number // 0=Sun, 1=Mon, ..., 6=Sat
  start_time: string  // HH:MM format e.g. "21:00"
  end_time: string    // HH:MM format e.g. "02:00"
}

export interface RecurringEventConfig {
  frequency: 'Weekly' | 'Monthly'
  day_of_week?: number // 0=Sun, 1=Mon, ..., 6=Sat
  day_of_month?: number // 1-31
  end_date?: string
  nights?: RecurringNight[]
}

export interface EventFormData {
  name: string
  description: string
  venue_id?: number | null
  venue_name: string
  venue_address: string
  latitude: number | null
  longitude: number | null
  start_date_time: string
  end_date_time: string
  type: 'Ticketed' | 'Free'
  is_21_plus: boolean
  is_recurring: boolean
  recurring_event?: RecurringEventConfig
  flyer_image_url: string
  tickets: TicketTier[]
  promotion_enabled?: boolean
  promotion_commission_type?: 'percent' | 'fixed'
  promotion_commission_value?: number | null
  notify_followers_on_publish?: boolean
  lowstock_alerts_enabled?: boolean
  lowstock_threshold_type?: 'percent' | 'count'
  lowstock_threshold_value?: number | null
  lowstock_notify_business_team?: boolean
  // 5.0 creation fields (D11 scanner mode, D10/D-F4.1 template artwork).
  // Sent on create/edit; see EventForm for the persistence caveat.
  redemption_mode?: RedemptionMode
  artwork_template?: ArtworkTemplate | null
  artwork_accent?: string | null
}

// Deal types
export interface DealAvailabilityWindow {
  day_of_week: number // 0=Sun, 1=Mon ... 6=Sat
  start_time: string // "HH:MM:SS" or "HH:MM"
  end_time: string
}

export interface DealListItem {
  id: number
  deal_title: string
  description: string
  deal_category: string
  deal_type: string
  business_name: string
  venue_name?: string
  display_name?: string
  location: string
  uses: string
  total_saving: number
  start_date: string
  expired_date: string
  deal_image_path: string
  is_active?: boolean
  supply_limit?: number
  moderation_status?: string | null
  moderation_reason?: string | null
  claim_count?: number
  availability_windows?: DealAvailabilityWindow[]
}

export interface DealFormData {
  deal_title: string
  description: string
  total_saving: string
  redemption_frequency: string
  start_date: string
  expired_date: string
  deal_image_path: string
  availability_windows?: DealAvailabilityWindow[]
}

// Team types
export interface TeamMember {
  id: number
  user_id: number | null
  role: 'owner' | 'manager' | 'staff' | 'promoter'
  email: string
  is_active: boolean
  invite_accepted_at: string | null
  invite_expires_at: string | null
  created_at: string
  venue_id: number | null
  venue_name: string | null
  // ── #5 invite fields. OPTIONAL, and that is the grandfather guarantee in the
  // type system: every one of the 196 legacy rows arrives without them and
  // renders exactly as it did before this change. A row is never badged
  // "broken" for lacking a field the new flow writes.
  /** How the invite actually went out. Absent on legacy rows. */
  invite_delivery?: InviteDelivery | null
  /** Explicit — NOT inferred from is_active, which legacy rows use for
   *  deactivated-but-real memberships (the ghost-invite lesson). */
  invite_revoked_at?: string | null
  // ── TI-3 never-blank fields (GET /business/team, reconciled to TI-3s
  // as-built). OPTIONAL — grandfather guarantee holds: a legacy row lacks them
  // and falls back to its `email` exactly as before.
  /**
   * Guaranteed non-blank by TI-3s: real name (joined member) → provisional_name
   * → typed email → masked phone → "Pending invite". The primary text a row
   * shows when present. See lib/team-invite/display.ts.
   */
  display_name?: string | null
  /** The real name only for joined members; null for pending invites. */
  full_name?: string | null
  /** The owner's provisional label for an unresolved invite; else null. */
  provisional_name?: string | null
  /**
   * Masked `invited_phone` for a phone-only provisional row with no name yet —
   * so the row is recognisable without leaking the number back to the dashboard.
   * TI-3s names this `masked_phone` (was `invited_contact_masked` pre-reconcile).
   */
  masked_phone?: string | null
  // TM-B2 (#15) venue-SET: assigned venues as a pivot set. EMPTY or ABSENT ⇒
  // legacy — fall back to the scalar venue_id/venue_name above (venue_id null =
  // global). See lib/business/team-venues.ts for the reconciliation.
  venues?: { venue_id: number; name: string }[] | null
  // Per-member Payouts-page access grant. Present ONLY when the CALLER is the
  // business owner (the server omits it for everyone else, and on a pre-contract
  // deploy) — its presence is what drives the owner-only toggle. ABSENT ⇒ render
  // the row exactly as today. See lib/business/team-payouts-access.ts.
  can_view_payouts?: boolean
}

// Analytics types
export interface EventAnalytics {
  ticketAccess: { paid: number; free: number; guest: number }
  checkIn: { scanned: number; notScanned: number; total: number; percent: number }
  doorSales: { preSales: number; doorSales: number }
  tierBreakdown: { ticket_id: number; tier_name: string; sold: number; revenue: number }[]
  trackingLinks: {
    tracking_link_id: number
    promoter_name: string
    code: string
    sales_count: number
    clicks: number
    // Combined pending+paid commission cents for this promoter on this event.
    // Excludes clawed_back. New 2026-05-12 (May 2026 promoter rework).
    commission_cents: number
  }[]
  revenue: {
    // The "Revenue" tile reads this - now matches the Stripe payout (net of
    // promoter commission). Pre-2026-05-12 this was gross creator payout.
    revenue: number
    pre_sales_revenue: number
    door_sales_revenue: number
    // Total commission owed to promoters this event (pending + paid). Already
    // deducted from `revenue` above. Surfaced for the "Going to promoters"
    // tile on the new Web Promoters tab.
    promoter_commission_total_cents: number
    // Business take-home from promoter-attributed sales specifically. Drives
    // the "Of the $X above, $Y was promoter-generated" callout.
    promoter_attributed_take_home_cents: number
  }
}

// Per-event promoters (matches Node `GET /events/:id/promoters`). Used by the
// new Web Promoters tab in Manage Event.
export interface PromoterDetail {
  tracking_link_id: number
  user_id: number
  full_name: string | null
  profile_photo_path: string | null
  code: string
  share_url: string
  clicks: number
  sales_count: number
  commission_pending_cents: number
  commission_paid_cents: number
}

export interface PromotersResponse {
  promoters: PromoterDetail[]
}

export interface PerScannerRow {
  staff_user_id: number | null
  staff_name: string | null
  scanner_label: string | null
  scans: number
  valid_scans: number
  rejected_scans: number
  // scan_revenue + sold_revenue. Server emits `revenue` as an alias of this
  // for backwards compat with older clients.
  revenue: number
  // Newly added fields (May 2026 - tap-to-pay attribution). Optional so the
  // type still describes responses from older service deploys.
  scan_revenue?: number
  sold_count?: number
  sold_revenue?: number
  total_revenue?: number
  first_scan_at: string | null
  last_scan_at: string | null
}

export interface PerScannerResponse {
  rows: PerScannerRow[]
}

export interface DealAnalytics {
  total_claims: number
  claims_by_period: { period: string; count: number }[]
  supply_usage: { used: number; total: number | null }
}

// Overview types (analytics dashboard)
export interface DealOverviewItem {
  deal_id: number
  deal_title: string
  deal_image_path: string | null
  is_active: boolean
  total_claims: number
  claims_this_week: number
  supply_limit: number | null
  supply_used: number
  venue_name: string
}

export interface DealsOverview {
  total_active_deals: number
  total_claims: number
  claims_this_week: number
  average_claims_per_deal: number
  deals: DealOverviewItem[]
}

export interface EventOverviewItem {
  event_id: number
  name: string
  start_date_time: string
  end_date_time: string
  venue_name: string
  status: string
  flyer_image_url: string | null
  tickets_sold: number
  tickets_total: number
  revenue: number
  checkin_rate: number
  door_sales_count: number
  /**
   * Same pink flag as EventListItem. Weekly Cover nights are real events
   * rows with `'door_access'`; one-off events are `'event'` (or omitted on
   * older overview payloads). Analytics buckets on this, then event id.
   */
  access_kind?: "event" | "door_access" | null
}

export interface EventsOverview {
  total_events: number
  total_tickets_sold: number
  total_revenue: number
  total_checked_in: number
  average_checkin_rate: number
  events: EventOverviewItem[]
}

export interface PromoterLink {
  tracking_link_id: number
  promoter_name: string
  code: string
  sales_count: number
  clicks: number
  event_name: string
  event_id: number
}

// Event Management types
export interface EventTeamMember {
  id: number
  event_id: number
  user_id: number
  role: 'owner' | 'cohost' | 'crew' | 'promoter'
  full_name: string | null
  email: string | null
  created_at: string
}

export interface PromoCode {
  promo_code_id: number
  /** Event-scoped code. null for universal (venue) codes. */
  event_id: number | null
  /** Venue-scoped (universal) code. null for event-scoped codes. */
  venue_id: number | null
  code: string
  discount_type: 'percentage' | 'flat'
  discount_value: number
  max_redemptions: number | null
  current_redemptions: number
  max_per_user: number
  expires_at: string | null
  is_active: boolean
  created_by: number
  created_at: string
  /**
   * Revenue attributed to this code. For universal (venue) codes this is the
   * venue-wide total across EVERY event ("All events"). See event_revenue_generated
   * for the per-event slice returned by the event-scoped endpoint.
   */
  revenue_generated?: number
  /**
   * Universal codes viewed under ONE event: redemptions of this code on THAT
   * event only. Present only in the /business/events/:id/promo-codes payload;
   * undefined for event-scoped rows and older API responses. Pairs with
   * current_redemptions (venue-wide "All events" count).
   */
  event_redemptions?: number
  /**
   * Universal codes viewed under ONE event: revenue on THAT event only. Pairs
   * with revenue_generated (venue-wide total).
   */
  event_revenue_generated?: number
}

/**
 * One event's slice of a universal code's usage — a row in the per-event
 * breakdown (GET /business/venues/:venueId/promo-codes/:promoId/breakdown).
 * INCLUDES zero-usage events. NOTE: redemptions / revenue_generated come from
 * MySQL SUM() and MAY serialize as strings ("3", "25.00") — always coerce with
 * Number() before math or display.
 */
export interface PromoEventBreakdownRow {
  event_id: number
  event_name: string | null
  event_date: string | null
  redemptions: number
  revenue_generated: number
}

/**
 * A universal code's usage decomposed across every event it applied to. The
 * per-event rows reconcile to `aggregate`: sum(events[].redemptions) ===
 * aggregate.redemptions and likewise for revenue.
 */
export interface PromoEventBreakdown {
  promo_code_id: number
  code: string
  aggregate: { redemptions: number; revenue_generated: number }
  events: PromoEventBreakdownRow[]
}

export interface CheckinEntry {
  ticket_instance_id: number
  uuid: string
  is_redeemed: boolean
  redeemed_at: string | null
  is_refunded: boolean
  ticket_name: string
  ticket_type: 'paid' | 'free' | 'guest'
  attendee_name: string | null
  attendee_email: string | null
}

export interface TrackingLink {
  id: number
  event_id: number
  promoter_name: string
  code: string
  sales_count: number
  clicks: number
  created_at: string
}

// Line Skip types
export interface LineSkip {
  id: number
  business_id: number
  name: string
  description: string | null
  days_of_week: number[] // 0=Sun, 1=Mon, ..., 6=Sat
  default_start_time: string // HH:MM
  default_end_time: string // HH:MM
  default_price_cents: number
  default_capacity: number | null
  date_range_start: string // YYYY-MM-DD
  date_range_end: string // YYYY-MM-DD
  is_active: boolean
  created_by: number
  created_at: string
  updated_at: string
  instance_count?: number
  upcoming_count?: number
}

export interface LineSkipInstance {
  id: number
  line_skip_id: number
  business_id: number
  date: string // YYYY-MM-DD
  start_time: string // HH:MM
  end_time: string // HH:MM
  price_cents: number
  capacity: number | null
  status: 'active' | 'cancelled' | 'sold_out'
  cancellation_status?: 'none' | 'pending' | 'approved' | 'denied'
  cancellation_reason: string | null
  tickets_sold: number
  revenue?: number
  checkin_rate?: number
  created_at: string
  updated_at: string
}

// Per-weekday recurring settings for a line skip program (0=Sun..6=Sat). Each
// selected day may carry its own price/time/limit; days without an override row
// fall back to the program's default_* values.
export interface LineSkipDayOverride {
  day_of_week: number
  start_time: string // HH:MM[:SS]
  end_time: string // HH:MM[:SS]
  price_cents: number
  capacity: number | null
}

export interface LineSkipDetail extends LineSkip {
  instances: LineSkipInstance[]
  day_overrides?: LineSkipDayOverride[]
}

export interface LineSkipFormData {
  name: string
  description: string
  days_of_week: number[]
  date_range_start: string
  date_range_end: string
  default_start_time: string
  default_end_time: string
  default_price_cents: number
  default_capacity: string // string for form input, empty = unlimited
}

// Line Skip Analytics types
export interface LineSkipInstanceAnalytics {
  // Core instance fields - echoed by the API so the night-detail page can render
  // the configured price/time/date and drive the edit modal without a 2nd fetch.
  id: number
  line_skip_id: number
  business_id: number
  date: string // YYYY-MM-DD
  start_time: string // HH:MM[:SS]
  end_time: string // HH:MM[:SS]
  price_cents: number
  status: 'active' | 'cancelled' | 'sold_out'
  tickets_sold: number
  total_revenue_cents: number
  capacity: number | null
  capacity_utilization: number | null
  check_in_rate: number
  checked_in: number
  promo_usage: { tickets_with_promo: number; total_discount_cents: number }
  channel_split: { app: number; web: number }
  purchase_by_hour: Array<{ hour: number; count: number }>
  promo_breakdown: Array<{
    promo_code_id: number
    code: string
    discount_type: 'percentage' | 'flat'
    discount_value: number
    times_used: number
    total_discount_cents: number
  }>
  tickets: Array<{
    id: number
    uuid: string
    user_id: number | null
    attendee_name: string
    phone_number: string
    price_paid_cents: number
    is_redeemed: boolean
    redeemed_at: string | null
    promo_code_id: number | null
    promo_code: string | null
    created_at: string
  }>
}

export interface LineSkipAggregateAnalytics {
  total_revenue_cents: number
  total_tickets_sold: number
  total_instances: number
  avg_tickets_per_night: number
  avg_revenue_per_night_cents: number
  busiest_day: { day_of_week: number; avg_tickets: number } | null
  revenue_trend: Array<{ date: string; instance_id: number; revenue_cents: number; tickets_sold: number }>
  avg_check_in_rate: number
  total_promo_discount_cents: number
}

export interface LineSkipOverviewInstance {
  instance_id: number
  line_skip_id: number
  line_skip_name: string
  venue_name: string
  date: string
  start_time: string
  end_time: string
  price_cents: number
  capacity: number | null
  status: string
  tickets_sold: number
  revenue_cents: number
  check_in_rate: number
}

export interface LineSkipAnalyticsOverview {
  total_active_schedules: number
  total_upcoming_instances: number
  total_tickets_this_week: number
  total_revenue_this_week_cents: number
  instances: LineSkipOverviewInstance[]
}

// Settings/Profile types
export interface BusinessProfile {
  business_id: number
  name: string
  contact_name: string
  email: string
  phone: string
  address: string
  campus_id: number
  website: string | null
  instagram: string | null
  logo_image_url: string | null
  status: string
  stripe_connect_onboarded: boolean
  /** True when a stored Stripe account is no longer valid (deauthorized/deleted) and must be reconnected. */
  stripe_reconnect_required?: boolean
  created_at: string
}

// Recurring event series (#5) — /business/recurring-series (services).
// A series is the schedule + occurrence template; every occurrence is a normal
// Event row stamped by core's generator and managed from the events surface.
export interface RecurringTemplateTicket {
  /** Stable identity on door-access templates. Omit on create; send back on edit. */
  tier_key?: string
  name: string
  description?: string | null
  price_usd: number
  quantity: number // 0 = unlimited
  max_per_person: number // 0 = unlimited
  ticket_type: 'paid' | 'free'
  is_hidden?: number
  sort_order?: number
  // Sales/scan windows are RELATIVE to each night: a time of day plus a day
  // offset vs the occurrence date. Absolute datetimes are computed at stamp time.
  valid_from_time: string | null // "HH:MM:SS"
  valid_until_time: string | null
  valid_from_day_offset: number
  valid_until_day_offset: number
}

export interface RecurringSeriesListItem {
  id: number
  name: string
  days_of_week: number[] // ISO weekdays, 1 = Mon … 7 = Sun
  date_range_start: string // "YYYY-MM-DD"
  date_range_end: string | null // null = runs until suspended
  is_active: number | boolean
  type: 'Ticketed' | 'Free' | 'RSVP'
  venue_id: number | null
  venue_name: string
  start_time: string // "HH:MM:SS"
  end_time: string
  flyer_image_url: string | null
  created_at: string
  updated_at: string
  occurrence_count: number
  upcoming_count: number
  next_occurrence_date: string | null // "YYYY-MM-DD"
}

export interface RecurringSeriesDetail extends RecurringSeriesListItem {
  business_id: number
  created_by: number
  description: string | null
  venue_address: string
  is_21_plus: number
  timezone: string | null
  promotion_enabled: number
  promotion_commission_type: 'percent' | 'fixed' | null
  promotion_commission_value: number | null
  notify_followers_on_publish: number
  lowstock_alerts_enabled: number
  lowstock_threshold_type: 'percent' | 'count' | null
  lowstock_threshold_value: number | null
  lowstock_notify_business_team: number
  template_tickets: RecurringTemplateTicket[] | null
}

export interface RecurringOccurrence {
  event_id: number
  name: string
  slug: string
  occurrence_date: string // "YYYY-MM-DD"
  status: string
  start_date_time: string
  end_date_time: string
  /** events.series_customized_at IS NOT NULL — the operator edited this night directly. */
  is_customized: boolean
  tickets_sold: number
  paid_orders: number
}

/** core topUpSeries — POST create + POST /:id/generate-now. */
export interface RecurringGenerationSummary {
  stamped: number[]
  skipped_existing: number
  status: string
}

/** core restampFutureOccurrences — returned by PUT /business/recurring-series/:id. All values are event ids. */
export interface RecurringRestampSummary {
  restamped: number[]
  tiers_replaced: number[]
  skipped_customized: number[]
  skipped_tiers_with_sales: number[]
  // Pattern shrink (weekday dropped / date range pulled in): nights that no
  // longer match the schedule.
  removed_from_pattern_cancelled: number[]
  removed_from_pattern_skipped_customized: number[]
  removed_from_pattern_skipped_with_sales: number[]
}

/** core suspendSeries — returned by POST /business/recurring-series/:id/suspend. */
export interface RecurringSuspendSummary {
  message?: string
  cancelled: number[]
  skipped_customized: number[]
  skipped_with_sales: number[]
}
