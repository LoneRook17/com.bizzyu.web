export interface BusinessUser {
  id: number
  email: string
  full_name: string
  business_role: 'owner' | 'manager' | 'staff' | 'promoter'
}

export interface Business {
  business_id: number
  name: string
  email: string
  status: 'pending' | 'pending_verification' | 'pending_approval' | 'approved' | 'rejected' | 'suspended'
  logo_url: string | null
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
  type: 'Ticketed' | 'Free' | 'RSVP'
  status: string
  flyer_image_url?: string
  is_21_plus: boolean
  is_recurring: boolean
  total_attendees: number
  total_revenue: number
  ticket_sales_count: number
  checkin_rate: number
  moderation_reason?: string | null
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
}

export interface EventDetail extends EventListItem {
  university_id: number
  school: string
  fee: number
  percentage: number
  tickets: TicketTier[]
  sales: { total_attendees: number; total_revenue: number; checkin_rate: number }
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
  venue_name: string
  venue_address: string
  latitude: number | null
  longitude: number | null
  start_date_time: string
  end_date_time: string
  type: 'Ticketed' | 'Free' | 'RSVP'
  is_21_plus: boolean
  is_recurring: boolean
  recurring_event?: RecurringEventConfig
  flyer_image_url: string
  tickets: TicketTier[]
}

// Deal types
export interface DealListItem {
  id: number
  deal_title: string
  description: string
  deal_category: string
  deal_type: string
  business_name: string
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
}

export interface DealFormData {
  deal_title: string
  description: string
  total_saving: string
  redemption_frequency: string
  start_date: string
  deal_image_path: string
}

// Team types
export interface TeamMember {
  id: number
  user_id: number | null
  role: 'owner' | 'manager' | 'staff' | 'promoter'
  email: string
  is_active: boolean
  invite_accepted_at: string | null
  created_at: string
}

// Analytics types
export interface EventAnalytics {
  ticketAccess: { paid: number; free: number; guest: number }
  checkIn: { scanned: number; notScanned: number; total: number; percent: number }
  doorSales: { preSales: number; doorSales: number }
  tierBreakdown: { ticket_id: number; tier_name: string; sold: number; revenue: number }[]
  trackingLinks: { tracking_link_id: number; promoter_name: string; code: string; sales_count: number; clicks: number }[]
  revenue: { revenue: number }
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
  venue_name: string
  status: string
  flyer_image_url: string | null
  tickets_sold: number
  tickets_total: number
  revenue: number
  checkin_rate: number
  door_sales_count: number
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
  event_id: number
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
  revenue_generated?: number
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
  created_at: string
}
