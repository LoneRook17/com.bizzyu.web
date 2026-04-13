"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue } from "@/lib/business/venue-context"
import { apiClient, ApiError } from "@/lib/business/api-client"
import TeamMemberRow from "@/components/business/dashboard/TeamMemberRow"
import InviteModal from "@/components/business/dashboard/InviteModal"
import ConfirmModal from "@/components/business/dashboard/ConfirmModal"
import type { TeamMember } from "@/lib/business/types"
import RolePermissionsModal from "@/components/business/dashboard/RolePermissionsModal"

interface VenueGroup {
  venueId: number | null
  venueName: string
  members: TeamMember[]
}

export default function TeamPage() {
  const { user } = useAuth()
  const { venues, selectedVenueId, isAllVenues } = useVenue()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null)
  const [removeLoading, setRemoveLoading] = useState(false)

  const canInvite = user?.business_role === "owner" || user?.business_role === "manager"
  const isOwner = user?.business_role === "owner"

  const fetchMembers = useCallback(async () => {
    try {
      const data = await apiClient.get<{ members: TeamMember[] }>("/business/team")
      setMembers(data.members)
    } catch {
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleRoleChange = async (memberId: number, newRole: string) => {
    try {
      await apiClient.patch(`/business/team/${memberId}/role`, { role: newRole })
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole as TeamMember["role"] } : m))
      )
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to update role")
    }
  }

  const handleVenueChange = async (memberId: number, venueId: number | null) => {
    try {
      await apiClient.patch(`/business/team/${memberId}/venue`, { venue_id: venueId })
      const venueName = venueId ? venues.find((v) => v.id === venueId)?.name ?? null : null
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId ? { ...m, venue_id: venueId, venue_name: venueName } : m
        )
      )
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to update venue assignment")
    }
  }

  const handleRemove = async () => {
    if (!removeTarget) return
    setRemoveLoading(true)
    try {
      await apiClient.delete(`/business/team/${removeTarget.id}`)
      setMembers((prev) => prev.filter((m) => m.id !== removeTarget.id))
      setRemoveTarget(null)
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to remove member")
    } finally {
      setRemoveLoading(false)
    }
  }

  // Group members by venue, filtered by the venue switcher selection
  const venueGroups = useMemo((): VenueGroup[] => {
    // Sort: owner first, then by email
    const sorted = [...members].sort((a, b) => {
      if (a.role === "owner") return -1
      if (b.role === "owner") return 1
      return a.email.localeCompare(b.email)
    })

    // If a specific venue is selected, show only that venue's team + global team
    const filtered =
      selectedVenueId !== "all" && selectedVenueId !== null
        ? sorted.filter((m) => m.venue_id === null || m.venue_id === selectedVenueId)
        : sorted

    // Build groups
    const globalMembers = filtered.filter((m) => m.venue_id == null)
    const byVenue = new Map<number, TeamMember[]>()

    for (const m of filtered) {
      if (m.venue_id != null) {
        const list = byVenue.get(m.venue_id) || []
        list.push(m)
        byVenue.set(m.venue_id, list)
      }
    }

    const groups: VenueGroup[] = []

    // Global team always first
    if (globalMembers.length > 0) {
      groups.push({ venueId: null, venueName: "Global Team", members: globalMembers })
    }

    // Then each venue, ordered by venue name
    const venueEntries = Array.from(byVenue.entries())
      .map(([id, members]) => ({
        venueId: id,
        venueName: members[0]?.venue_name || venues.find((v) => v.id === id)?.name || `Venue #${id}`,
        members,
      }))
      .sort((a, b) => a.venueName.localeCompare(b.venueName))

    groups.push(...venueEntries)

    return groups
  }, [members, selectedVenueId, venues])

  const visibleCount = venueGroups.reduce((sum, g) => sum + g.members.length, 0)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-ink">Team</h1>
            <RolePermissionsModal variant="business" />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{visibleCount} member{visibleCount !== 1 ? "s" : ""}</p>
        </div>
        {canInvite && (
          <button
            onClick={() => setInviteOpen(true)}
            className="rounded-lg bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/25 hover:brightness-110 transition-all cursor-pointer"
          >
            Invite Member
          </button>
        )}
      </div>

      {/* Member list grouped by venue */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="h-9 w-9 rounded-full bg-gray-200" />
              <div>
                <div className="h-4 bg-gray-200 rounded w-40 mb-1" />
                <div className="h-3 bg-gray-200 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : venueGroups.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          No team members found.
        </div>
      ) : (
        <div className="space-y-4">
          {venueGroups.map((group) => (
            <div key={group.venueId ?? "global"} className="rounded-xl border border-gray-200 bg-white">
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  {group.venueId === null ? (
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A8.966 8.966 0 013 12c0-1.97.633-3.794 1.708-5.276" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  )}
                  <h2 className="text-sm font-semibold text-ink">{group.venueName}</h2>
                  <span className="text-xs text-gray-400">{group.members.length}</span>
                </div>
                {group.venueId === null && (
                  <p className="text-xs text-gray-400 mt-0.5">These members have access to all venues</p>
                )}
              </div>
              <div className="px-4">
                {group.members.map((member) => (
                  <TeamMemberRow
                    key={member.id}
                    member={member}
                    currentUserRole={user?.business_role || ""}
                    venues={venues}
                    onRemove={setRemoveTarget}
                    onRoleChange={handleRoleChange}
                    onVenueChange={handleVenueChange}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite modal */}
      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={() => { setInviteOpen(false); fetchMembers() }}
        canInviteManager={isOwner}
        venues={venues}
      />

      {/* Remove confirm */}
      <ConfirmModal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        title="Remove Team Member"
        message={`Are you sure you want to remove ${removeTarget?.email}? They will lose access to the dashboard immediately.`}
        confirmLabel="Remove"
        variant="danger"
        loading={removeLoading}
      />
    </div>
  )
}
