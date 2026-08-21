export const NAV_LINKS = [
  { label: 'Home', href: '/business', icon: 'home' },
  { label: 'Events', href: '/business/events', icon: 'calendar' },
  { label: 'Event Marketing', href: '/business/marketing', icon: 'megaphone' },
  // V5 F14. Sits ABOVE Line Skips and does not replace it — both systems are
  // live side by side until the F15 conversion moves the data across.
  { label: 'Weekly Access', href: '/business/door-access', icon: 'bolt' },
  { label: 'Line Skips', href: '/business/line-skips', icon: 'bolt' },
  { label: 'Deals', href: '/business/deals', icon: 'tag' },
  { label: 'Analytics', href: '/business/analytics', icon: 'chart' },
  { label: 'Team', href: '/business/team', icon: 'users' },
  { label: 'Universal Promo Codes', href: '/business/promo-codes', icon: 'tag' },
  { label: 'Settings', href: '/business/settings', icon: 'settings' },
] as const

export const STATUS_LABELS: Record<string, string> = {
  pending_verification: 'Pending Verification',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
}

export const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  manager: 'Manager',
  staff: 'Staff',
  promoter: 'Promoter',
}

export const CAMPUSES = [
  { id: 58, name: 'ASU', full_name: 'Arizona State University' },
  { id: 1, name: 'FGCU', full_name: 'Florida Gulf Coast University' },
  { id: 59, name: 'OSU', full_name: 'The Ohio State University' },
  { id: 60, name: 'Southern', full_name: 'Georgia Southern University' },
  { id: 57, name: 'UGA', full_name: 'University of Georgia' },
  { id: 33, name: 'USF', full_name: 'University of South Florida' },
] as const

// Content-creation routes that require approved status
export const APPROVED_ONLY_ROUTES = [
  '/business/events',
  '/business/line-skips',
  '/business/door-access',
  '/business/deals',
]

// Routes restricted by role - if role is listed, the link is hidden for that role
export const ROLE_HIDDEN_ROUTES: Record<string, string[]> = {
  '/business/analytics': ['staff'],
  '/business/line-skips': ['promoter'],
  // The door-access endpoints admit owner/manager/staff only — a promoter
  // would reach a 403, so the link is hidden rather than served as a dead end.
  '/business/door-access': ['promoter'],
  '/business/settings': ['promoter'],
  '/business/promo-codes': ['staff', 'promoter'],
}

export const EVENT_TABS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'drafts', label: 'Drafts' },
  { value: 'recurring', label: 'Recurring' },
] as const

export const DEAL_TABS = [
  { value: 'live', label: 'Live' },
  { value: 'expired', label: 'Expired' },
  { value: 'deactivated', label: 'Deactivated' },
] as const

export const EVENT_TYPES = ['Ticketed', 'Free'] as const
// 'guest' (Guest list) removed 2026-06-12 - not an implemented feature.
// Legacy rows may still carry ticket_type='guest'; types keep accepting it.
export const TICKET_TYPES = ['paid', 'free'] as const

// 5.0 D-P2: the free path is "Free", never "RSVP". It mints a real $0 order and
// a scannable wallet ticket via /free-ticket/{id}/purchase - same mechanics as a
// paid ticket, no price. Copy anywhere near event type must match this wording.
export const EVENT_TYPE_LABELS: Record<(typeof EVENT_TYPES)[number], string> = {
  Ticketed: 'Ticketed',
  Free: 'Free',
}

export const EVENT_TYPE_HINTS: Record<(typeof EVENT_TYPES)[number], string> = {
  Ticketed: 'Sell tickets in tiers. Each buyer gets a scannable ticket.',
  Free: 'No charge. Guests still claim a real, scannable ticket.',
}

// 5.0 D11 / D-F10.1: the host picks, per event, HOW people get checked in.
// Same two modes the Door Access spine uses (services DoorAccessProgramService
// REDEMPTION_MODES) so events and access programs speak one vocabulary.
export const REDEMPTION_MODES = ['native_scan', 'camera_tap'] as const
export type RedemptionMode = (typeof REDEMPTION_MODES)[number]

// Events default to the Bizzy scanner - that is how every existing event
// already behaves, so an untouched form keeps today's door flow.
export const DEFAULT_EVENT_REDEMPTION_MODE: RedemptionMode = 'native_scan'

export const REDEMPTION_MODE_OPTIONS: {
  value: RedemptionMode
  label: string
  hint: string
}[] = [
  {
    value: 'native_scan',
    label: 'Bizzy scanner',
    hint: 'Staff open the Bizzy scanner and scan each guest’s QR code.',
  },
  {
    value: 'camera_tap',
    label: 'Camera + tap to redeem',
    hint: 'Staff scan with any phone camera, then tap the guest off a list. No app setup.',
  },
]

// 5.0 D10 / D-F4.1: when there is no flyer, the app renders artwork from a small
// fixed set of templates - a style pick plus an optional accent. Nothing is
// uploaded or stored as an image; only the choice travels with the event.
export const ARTWORK_TEMPLATES = ['classic', 'bold', 'minimal', 'night'] as const
export type ArtworkTemplate = (typeof ARTWORK_TEMPLATES)[number]

export const DEFAULT_ARTWORK_TEMPLATE: ArtworkTemplate = 'classic'

export const ARTWORK_TEMPLATE_OPTIONS: {
  value: ArtworkTemplate
  label: string
  hint: string
  // Tailwind classes for the swatch preview - the app renders the real widget.
  swatch: string
}[] = [
  { value: 'classic', label: 'Classic', hint: 'Venue mark over a soft green wash.', swatch: 'from-[#05EB54]/80 to-emerald-900' },
  { value: 'bold', label: 'Bold', hint: 'Big type, high contrast.', swatch: 'from-[#05EB54] to-neutral-900' },
  { value: 'minimal', label: 'Minimal', hint: 'Name and date, nothing else.', swatch: 'from-neutral-200 to-neutral-500' },
  { value: 'night', label: 'Night', hint: 'Dark card with a magenta edge.', swatch: 'from-fuchsia-600 to-neutral-900' },
]

export const ARTWORK_ACCENTS: { value: string; label: string; dot: string }[] = [
  { value: 'green', label: 'Green', dot: 'bg-[#05EB54]' },
  { value: 'magenta', label: 'Magenta', dot: 'bg-fuchsia-500' },
  { value: 'amber', label: 'Amber', dot: 'bg-amber-400' },
  { value: 'ice', label: 'Ice', dot: 'bg-sky-300' },
]

export const DEAL_CATEGORIES = [
  'Food', 'Drinks', 'Things to Do', 'BOGO', 'Shopping', 'Services', 'Other',
] as const

export const DEAL_TYPES = [
  'Daily', 'Weekly', 'Monthly', 'One-Time', 'Limited', 'Anytime',
] as const

export const REDEMPTION_OPTIONS = [
  { value: 'once_per_day', label: 'Once Per Day', dealType: 'Daily', info: 'After a student claims this deal, it locks for 24 hours before they can claim again.' },
  { value: 'once_per_week', label: 'Once Per Week', dealType: 'Weekly', info: 'After a student claims this deal, it locks for 7 days before they can claim again.' },
  { value: 'once_per_month', label: 'Once Per Month', dealType: 'Monthly', info: 'After a student claims this deal, it locks for 30 days before they can claim again.' },
  { value: 'unlimited', label: 'Unlimited', dealType: 'Anytime', info: 'Students can claim this deal as many times as they want with no cooldown.' },
  { value: 'one_time', label: 'One Time Only', dealType: 'One-Time', info: 'Each student can only claim this deal once, ever.' },
] as const

// Map deal_type DB values back to redemption frequency values
export const DEAL_TYPE_TO_FREQUENCY: Record<string, string> = {
  'Daily': 'once_per_day',
  'Weekly': 'once_per_week',
  'Monthly': 'once_per_month',
  'Anytime': 'unlimited',
  'One-Time': 'one_time',
  'Limited': 'one_time',
  'One-Time Only': 'one_time',
}

export const EVENT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  published: { bg: 'bg-green-100', text: 'text-green-700' },
  draft: { bg: 'bg-gray-100', text: 'text-gray-600' },
  pending_approval: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  pending_review: { bg: 'bg-orange-100', text: 'text-orange-700' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700' },
}

export const MODERATION_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  approved: { bg: 'bg-green-100', text: 'text-green-700' },
  pending_review: { bg: 'bg-orange-100', text: 'text-orange-700' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700' },
}
