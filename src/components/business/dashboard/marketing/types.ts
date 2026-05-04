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
