"use client"

import { ROLE_LABELS } from "@/lib/business/constants"
import type { TeamMember, Venue } from "@/lib/business/types"

interface TeamMemberRowProps {
  member: TeamMember
  currentUserRole: string
  venues: Venue[]
  onRemove: (member: TeamMember) => void
  onRoleChange: (memberId: number, newRole: string) => void
  onVenueChange: (memberId: number, venueId: number | null) => void
}

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700",
  manager: "bg-blue-100 text-blue-700",
  staff: "bg-gray-100 text-gray-700",
  promoter: "bg-green-100 text-green-700",
}

const ASSIGNABLE_ROLES = ["manager", "staff", "promoter"]

export default function TeamMemberRow({ member, currentUserRole, venues, onRemove, onRoleChange, onVenueChange }: TeamMemberRowProps) {
  const canManage = currentUserRole === "owner" || currentUserRole === "manager"
  const isOwnerViewing = currentUserRole === "owner"
  const isOwnerMember = member.role === "owner"
  const isPending = !member.invite_accepted_at && !isOwnerMember

  const joinedDate = member.invite_accepted_at
    ? new Date(member.invite_accepted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : member.created_at
      ? new Date(member.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—"

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar */}
        <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-500 flex-shrink-0">
          {member.email.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium text-ink truncate">{member.email}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[member.role] || "bg-gray-100 text-gray-600"}`}>
              {ROLE_LABELS[member.role] || member.role}
            </span>
            {isPending && (
              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                Pending Invite
              </span>
            )}
            <span className="text-xs text-gray-400">{joinedDate}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {canManage && !isOwnerMember && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Venue assignment */}
          <select
            value={member.venue_id ?? ""}
            onChange={(e) => {
              const val = e.target.value
              onVenueChange(member.id, val === "" ? null : Number(val))
            }}
            className="rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white text-ink cursor-pointer max-w-[120px]"
            title="Venue assignment"
          >
            <option value="">Global</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>

          {/* Role selector — owner only */}
          {isOwnerViewing && (
            <select
              value={member.role}
              onChange={(e) => onRoleChange(member.id, e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white text-ink cursor-pointer"
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          )}

          {/* Remove — owner only */}
          {isOwnerViewing && (
            <button
              onClick={() => onRemove(member)}
              className="rounded-lg border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  )
}
