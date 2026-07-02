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

export default function TeamMemberRow({
  member, currentUserRole, venues, onRemove, onRoleChange, onVenueChange, onResend,
}: TeamMemberRowProps) {
  const isOwnerViewing = currentUserRole === "owner"
  const isOwnerMember = member.role === "owner"
  const isPending = !member.invite_accepted_at && !isOwnerMember

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
            {isPending && <Badge size="sm" variant="warning">Pending invite</Badge>}
            <span className="text-xs text-neutral-400 dark:text-neutral-500">{joinedDate}</span>
          </div>
        </div>
      </div>

      {/* Actions — owner only, non-owner members */}
      {isOwnerViewing && !isOwnerMember && (
        <div className="flex flex-wrap items-center gap-2 pl-12 sm:flex-nowrap sm:pl-0">
          <Select
            value={member.venue_id ?? ""}
            onChange={(e) => {
              const val = e.target.value
              onVenueChange(member.id, val === "" ? null : Number(val))
            }}
            title="Venue assignment"
            className="h-8 min-w-0 flex-1 px-2 text-xs sm:max-w-[140px] sm:flex-none"
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
            className="h-8 min-w-0 flex-1 px-2 text-xs sm:max-w-[120px] sm:flex-none"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </Select>

          {/* Resend — any not-yet-accepted invite. Re-invite rotates the
              token + expiry server-side, so it doubles as "refresh the link". */}
          {isPending && onResend && (
            <Button variant="ghost" size="sm" onClick={() => onResend(member)} className="text-primary hover:bg-primary/10">
              Resend
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
