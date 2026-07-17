"use client"

import { cn } from "@/lib/v2/utils"
import { ROLE_LABELS } from "@/lib/business/constants"
import type { TeamMember, Venue } from "@/lib/business/types"
import { Avatar, AvatarFallback } from "@/components/business/v2/ui/avatar"
import { Badge } from "@/components/business/v2/ui/badge"
import { Button } from "@/components/business/v2/ui/button"
import { Select } from "@/components/business/v2/ui/input"

interface TeamMemberRowProps {
  member: TeamMember
  currentUserRole: string
  venues: Venue[]
  onRemove: (member: TeamMember) => void
  onRoleChange: (memberId: number, newRole: string) => void
  onVenueChange: (memberId: number, venueId: number | null) => void
  onResend?: (member: TeamMember) => void
}

const ROLE_BADGE: Record<string, { className: string }> = {
  owner: { className: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400" },
  manager: { className: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400" },
  staff: { className: "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400" },
  promoter: { className: "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400" },
}

const ASSIGNABLE_ROLES = ["manager", "staff"]

function initials(s: string) {
  return s.trim().charAt(0).toUpperCase() || "?"
}

type BadgeVariant = "warning" | "danger"

/**
 * What the row says about an invite that has not been accepted yet — never a
 * silent-success row, and never a guess.
 *
 * Terminal states outrank delivery: a revoked or expired invite is not "sent",
 * whatever happened to the email a fortnight ago.
 *
 * The `default` arm is the grandfather guarantee: a legacy row carries no
 * `invite_delivery`, so it falls through to the exact "Pending invite" badge it
 * rendered before this change. Nothing new is inferred about rows the new flow
 * did not create.
 */
function inviteBadge(member: TeamMember, isExpired: boolean): { label: string; variant: BadgeVariant } {
  if (member.invite_revoked_at) return { label: "Invite revoked", variant: "danger" }
  if (isExpired) return { label: "Invite expired", variant: "danger" }

  switch (member.invite_delivery) {
    case "email_sent":
      return { label: "Invite sent", variant: "warning" }
    case "email_failed":
      // The invite is live and the link works — only the email failed. Says so,
      // rather than reporting a send that did not happen.
      return { label: "Email failed — send the link", variant: "danger" }
    case "link_only":
      // Bizzy sends no invite SMS: until the owner texts the link, nothing has
      // reached this person at all.
      return { label: "Not sent yet — send the link", variant: "warning" }
    default:
      return { label: "Pending invite", variant: "warning" }
  }
}

export default function TeamMemberRow({
  member, currentUserRole, venues, onRemove, onRoleChange, onVenueChange, onResend,
}: TeamMemberRowProps) {
  const isOwnerViewing = currentUserRole === "owner"
  const isOwnerMember = member.role === "owner"
  // UNCHANGED by the #5 work, deliberately. It mirrors the server's own access
  // rule (resolveActiveBusinessId.ts:34 — is_active=1 AND (invite_accepted_at
  // IS NOT NULL OR role='owner')), so the badge agrees with who can actually
  // get in, and the owner exemption is what keeps the 181 grandfathered owner
  // rows (of 196) badge-free. Widening this to "no invite_delivery = broken"
  // would light up every legacy row.
  const isPending = !member.invite_accepted_at && !isOwnerMember
  const isExpired = isPending && !!member.invite_expires_at && new Date(member.invite_expires_at) < new Date()
  const badge = isPending ? inviteBadge(member, isExpired) : null

  const joinedSource = member.invite_accepted_at ?? member.created_at
  const joinedDate = joinedSource
    ? new Date(joinedSource).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—"

  return (
    <div className="flex flex-col gap-3 border-b border-neutral-100 dark:border-neutral-800 py-3.5 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="size-9">
          <AvatarFallback className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">{initials(member.email)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{member.email}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <Badge size="sm" className={cn(ROLE_BADGE[member.role]?.className ?? "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400")}>
              {ROLE_LABELS[member.role] ?? member.role}
            </Badge>
            {badge && <Badge size="sm" variant={badge.variant}>{badge.label}</Badge>}
            <span className="text-xs text-neutral-400 dark:text-neutral-500">{joinedDate}</span>
          </div>
        </div>
      </div>

      {/* Actions - owner only, non-owner members */}
      {isOwnerViewing && !isOwnerMember && (
        <div className="flex flex-wrap items-center gap-2 pl-12 sm:flex-nowrap sm:pl-0">
          <Select
            value={member.venue_id ?? ""}
            onChange={(e) => {
              const val = e.target.value
              onVenueChange(member.id, val === "" ? null : Number(val))
            }}
            title="Venue assignment"
            className="h-8 min-w-0 flex-1 px-2 text-xs sm:w-[140px] sm:flex-none"
          >
            <option value="">Global</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </Select>

          <Select
            value={member.role}
            onChange={(e) => onRoleChange(member.id, e.target.value)}
            title="Role"
            className="h-8 min-w-0 flex-1 px-2 text-xs sm:w-[120px] sm:flex-none"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </Select>

          {/* Was expired-only. Now on every unaccepted row, because under the
              #5 contract the link is the deliverable and this is the only way
              to get one — including for the legacy rows that never went
              through an accept flow and are stuck without it. Mints a fresh
              invite; it never alters the membership. */}
          {isPending && onResend && (
            <Button variant="ghost" size="sm" onClick={() => onResend(member)} className="text-primary dark:text-primary hover:bg-primary/10">
              Send link
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onRemove(member)} className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40">
            Remove
          </Button>
        </div>
      )}
    </div>
  )
}
