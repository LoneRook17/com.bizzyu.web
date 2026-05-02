export const NAV_LINKS = [
  { label: 'Home', href: '/business', icon: 'home' },
  { label: 'Events', href: '/business/events', icon: 'calendar' },
  { label: 'Line Skips', href: '/business/line-skips', icon: 'bolt' },
  { label: 'Deals', href: '/business/deals', icon: 'tag' },
  { label: 'Analytics', href: '/business/analytics', icon: 'chart' },
  { label: 'Team', href: '/business/team', icon: 'users' },
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
  { id: 58, name: 'ASU' },
  { id: 1, name: 'FGCU' },
  { id: 59, name: 'OSU' },
  { id: 60, name: 'Southern' },
  { id: 57, name: 'UGA' },
  { id: 33, name: 'USF' },
] as const

// Content-creation routes that require approved status
export const APPROVED_ONLY_ROUTES = [
  '/business/events',
  '/business/line-skips',
  '/business/deals',
]

// Routes restricted by role — if role is listed, the link is hidden for that role
export const ROLE_HIDDEN_ROUTES: Record<string, string[]> = {
  '/business/analytics': ['staff'],
  '/business/line-skips': ['promoter'],
  '/business/settings': ['promoter'],
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
export const TICKET_TYPES = ['paid', 'free', 'guest'] as const

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
