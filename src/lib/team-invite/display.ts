// Never-blank team-list rendering — TI-3w / fixes TI-F1.
//
// TI-F1: an accepted phone-invited member rendered as a BLANK row (no name, "?"
// avatar) because the row keyed its primary text off `email`, and a phone-keyed
// member has none until they set one. This module is the single rule that
// guarantees a row ALWAYS has something to show, and it is pure so the
// never-blank guarantee is asserted in a test rather than eyeballed.
//
// Priority, most-specific first:
//   1. display_name  — the real name after accept, or the owner's provisional
//                      name before it. This is the field TI-3's `none` path
//                      writes and the invitee confirms/corrects at accept.
//   2. email         — legacy rows are email-keyed end to end; this is what they
//                      have always shown, so they render byte-identically.
//   3. masked contact— a phone-only provisional row with no name yet: the masked
//                      number the owner typed, so the row is recognisable
//                      without leaking the full number back to the dashboard.
//   4. "Pending invite" — the hard floor. A row is never blank, full stop.

import type { TeamMember } from '@/lib/business/types'

export interface MemberDisplay {
  /** Always non-empty — the row's primary text and avatar seed. */
  name: string
  /**
   * True when `name` is a stand-in (provisional name / masked phone / floor),
   * not a confirmed identity. Drives the muted styling; the "Pending" invite
   * badge itself is still owned by TeamMemberRow's inviteBadge().
   */
  isProvisional: boolean
}

const FLOOR = 'Pending invite'

function clean(s: string | null | undefined): string {
  return typeof s === 'string' ? s.trim() : ''
}

/**
 * Resolve what a team row shows for a member. Total: the return `name` is never
 * empty. `isProvisional` is true whenever the name is not a confirmed identity —
 * i.e. the invite has not been accepted, or we fell through to the masked
 * number or the floor.
 */
export function memberDisplay(member: TeamMember): MemberDisplay {
  const accepted = !!member.invite_accepted_at || member.role === 'owner'

  const name = clean(member.display_name)
  if (name) return { name, isProvisional: !accepted }

  const email = clean(member.email)
  if (email) return { name: email, isProvisional: !accepted }

  const masked = clean(member.invited_contact_masked)
  if (masked) return { name: masked, isProvisional: true }

  return { name: FLOOR, isProvisional: true }
}

/** First letter for the avatar, from whatever the row ends up showing. */
export function memberInitial(member: TeamMember): string {
  const { name } = memberDisplay(member)
  const ch = name.replace(/[^A-Za-z0-9]/g, '').charAt(0)
  return ch ? ch.toUpperCase() : '?'
}
