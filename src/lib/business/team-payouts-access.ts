// Owner-managed, per-member Payouts-page access — the TEAM-ROW half of
// PAYOUTS-PER-PERSON-ACCESS. Pure decision logic behind the owner-only "Payouts
// access" toggle: no React, no api-client import → unit-testable under
// `node --test`, mirroring team-venues.ts. The components
// (PayoutsAccessControl / TeamMemberRow / the team page) only render / wire what
// these functions decide.
//
// Contract (services feat/payouts-per-person-access):
//   GET   /business/team                                   → each member carries
//         can_view_payouts ONLY when the caller is the owner (absent otherwise).
//   PATCH /business/team/members/:memberId/payouts-access  { enabled: boolean }
//         → owner-only; 404 if the member isn't on the business; 400 for an
//           owner-target or a non-boolean body.

export type TeamRole = "owner" | "manager" | "staff" | "promoter"

/** The slice of a team-row the toggle reads. */
export interface PayoutsAccessMember {
  id: number
  role: TeamRole | string
  /** The owner-only grant field from GET /business/team. ABSENT (undefined) for
   *  a non-owner caller (server omits it) and on a pre-contract server. */
  can_view_payouts?: boolean
}

/** What a row renders for the Payouts-access control:
 *   hidden — no control at all: a non-owner viewer, or a legacy/absent field
 *   owner  — the member IS the owner → a disabled "Owner" indicator (inherent access)
 *   on/off — a mutable toggle reflecting the stored grant
 */
export type PayoutsToggleState = "hidden" | "owner" | "on" | "off"

/**
 * The sole visibility+state decision. Owner-only surface: a non-owner viewer
 * always gets "hidden" (belt-and-suspenders — the server already omits the field
 * for non-owners, so a genuine non-owner row also has can_view_payouts ===
 * undefined). A row without the grant field (pre-contract server) → "hidden", so
 * the roster renders exactly as today. The owner's own row → "owner" (never a
 * mutable toggle — their access is inherent).
 */
export function payoutsToggleState(
  viewerRole: TeamRole | string | null | undefined,
  member: PayoutsAccessMember,
): PayoutsToggleState {
  if (viewerRole !== "owner") return "hidden"
  if (member.can_view_payouts === undefined) return "hidden"
  if (member.role === "owner") return "owner"
  return member.can_view_payouts ? "on" : "off"
}

/** True only when the owner may actually FLIP this member's grant (a mutable
 *  toggle) — i.e. not hidden and not the inherent-access owner row. */
export function canTogglePayoutsAccess(
  viewerRole: TeamRole | string | null | undefined,
  member: PayoutsAccessMember,
): boolean {
  const s = payoutsToggleState(viewerRole, member)
  return s === "on" || s === "off"
}

/** Immutably set a member's grant in the roster. Both the optimistic set AND the
 *  revert use this (absolute write), so a revert is just re-applying the prior
 *  value. Never mutates the input array or its members. */
export function withPayoutsAccess<T extends PayoutsAccessMember>(
  members: T[],
  memberId: number,
  enabled: boolean,
): T[] {
  return members.map((m) => (m.id === memberId ? { ...m, can_view_payouts: enabled } : m))
}

/** The PATCH endpoint for a member's grant (mirrors memberVenuesPath). */
export const payoutsAccessPath = (memberId: number): string =>
  `/business/team/members/${memberId}/payouts-access`

/** The PATCH body (mirrors memberVenuesPayload). */
export function payoutsAccessPayload(enabled: boolean): { enabled: boolean } {
  return { enabled }
}

/** Copy for the toggle + its (i) tooltip. The tooltip wording is the contract
 *  copy: what turning it on grants, and that turning it off keeps them on the team. */
export const PAYOUTS_ACCESS_TOGGLE = {
  label: "Payouts access",
  ownerLabel: "Owner",
  tooltip:
    "When on, this person can open the Payouts page and export CSVs. Turning it off removes that access but keeps them on your team.",
  errorLabel: "Couldn't update payouts access. Please try again.",
} as const

export interface TogglePayoutsAccessDeps<T extends PayoutsAccessMember> {
  memberId: number
  enabled: boolean
  /** The member's grant BEFORE the flip — restored verbatim on failure. */
  previous: boolean
  /** The typed client's patch (apiClient.patch) — injected so this is pure. */
  patch: (path: string, body: unknown) => Promise<unknown>
  /** React functional-setState applier: composes on the LATEST roster, so
   *  concurrent flips of different rows never clobber each other. */
  setMembers: (updater: (prev: T[]) => T[]) => void
  /** Called on failure, after the revert, so the UI can surface an inline error. */
  onError?: (memberId: number, err: unknown) => void
}

/**
 * One optimistic flip with a clean revert on failure. Sets the new state
 * immediately (functional update), PATCHes, and on any rejection restores the
 * member's `previous` value and reports the error — the roster never sticks in a
 * state the server rejected. Pure of React (deps injected, updates via a
 * functional applier) → unit-testable. Returns whether the server confirmed it.
 */
export async function togglePayoutsAccess<T extends PayoutsAccessMember>(
  deps: TogglePayoutsAccessDeps<T>,
): Promise<{ ok: boolean }> {
  const { memberId, enabled, previous, patch, setMembers, onError } = deps
  setMembers((prev) => withPayoutsAccess(prev, memberId, enabled)) // optimistic
  try {
    await patch(payoutsAccessPath(memberId), payoutsAccessPayload(enabled))
    return { ok: true }
  } catch (err) {
    setMembers((prev) => withPayoutsAccess(prev, memberId, previous)) // revert
    onError?.(memberId, err)
    return { ok: false }
  }
}
