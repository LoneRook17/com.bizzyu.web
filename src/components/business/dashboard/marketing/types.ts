export interface AttendeeTag {
  id: number
  name: string
  color_hex: string
}

export interface AttendeeRow {
  id: number
  full_name: string
  email: string
  phone_masked: string | null
  has_phone: boolean
  profile_photo_path: string | null
  tickets: number
  spend_cents: number
  last_purchase_at: string | null
  tags: AttendeeTag[]
  contact: {
    sms_reachable: boolean
    phone_reachable: boolean
    push_subscribed: boolean
    marketing_muted: boolean
  }
}

export interface AttendeesResponse {
  attendees: AttendeeRow[]
  pagination: { page: number; limit: number; total: number; total_pages: number }
}

export interface AttendeeDetail {
  user: {
    id: number
    full_name: string
    email: string
    phone_number: string | null // unmasked
    profile_photo_path: string | null
    marketing_globally_muted: boolean
    push_subscribed: boolean
    following: { followed_at: string | null; sms_enabled: boolean; push_enabled: boolean }
  }
  totals: { tickets: number; line_skips: number; total_spend_cents: number; last_purchase_at: string | null }
  tickets: Array<Record<string, unknown>>
  line_skips: Array<Record<string, unknown>>
  tags: AttendeeTag[]
}

export interface TagWithCount extends AttendeeTag {
  attendee_count: number
  created_at: string
}

export const TAG_COLOR_PALETTE: Array<{ name: string; hex: string }> = [
  { name: "Green", hex: "#05EB54" },
  { name: "Red", hex: "#EF4444" },
  { name: "Orange", hex: "#F97316" },
  { name: "Yellow", hex: "#EAB308" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Purple", hex: "#8B5CF6" },
  { name: "Pink", hex: "#EC4899" },
  { name: "Gray", hex: "#6B7280" },
]

// ─── Campaigns / Blasts (Session 5.1) ────────────────────────────────────

export type CampaignType = "announcement" | "event_sms" | "attendee_sms"
export type CampaignTypeFilter = "all" | CampaignType
export type BlastChannel = "announcement" | "sms"

export interface AudienceFiltersBody {
  tag_id?: number | null
  purchased_within_days?: number | null
  has_phone?: boolean
  has_push?: boolean
  is_follower?: boolean
}

export interface BlastAudienceBody {
  user_ids?: number[]
  filters?: AudienceFiltersBody
}

export interface AudiencePreviewResponse {
  recipients_count: number
  breakdown_by_channel: { phone_reachable: number; push_reachable: number }
}

export interface SendBlastResponse {
  blast_id: number
  recipients_count: number
  estimated_cost_cents: number
  channel: BlastChannel
  blast_type: "announcement" | "sms_blast" | "organization_blast"
}

export interface CampaignRow {
  id: number
  blast_type: CampaignType
  channel: "push" | "sms" | "both"
  audience_summary: string
  recipients_count: number
  estimated_cost_cents: number
  message_preview: string
  sent_at: string
}

export interface CampaignsResponse {
  campaigns: CampaignRow[]
  pagination: { page: number; limit: number; total: number; total_pages: number }
}

export interface CampaignDetail {
  id: number
  blast_type: CampaignType
  channel: "push" | "sms" | "both"
  fired_by_user_id: number
  sent_at: string
  message: string
  counts: {
    recipients: number
    push_sent: number
    sms_segments_sent: number
    estimated_cost_cents: number
  }
  audience: {
    event_ids: number[]
    events: Array<{ id: number; name: string }>
    organization_filters: { user_ids?: number[]; filters?: AudienceFiltersBody } | null
    recipients: Array<{ user_id: number; full_name: string }>
    cohort_note: string | null
  }
  delivery_note: string
}
