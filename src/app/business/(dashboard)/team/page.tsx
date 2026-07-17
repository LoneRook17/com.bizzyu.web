"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Globe, MapPin, Plus, Users } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue } from "@/lib/business/venue-context"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { TeamMember } from "@/lib/business/types"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Card } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import TeamMemberRow from "@/components/business/v2/team/TeamMemberRow"
import InviteDialog from "@/components/business/v2/team/InviteDialog"
import RolePermissionsDialog from "@/components/business/v2/team/RolePermissionsDialog"
import ConfirmDialog from "@/components/business/v2/ConfirmDialog"

interface VenueGroup {
  venueId: number | null
  venueName: string
  members: TeamMember[]
}

export default function V2TeamPage() {
  const { user, business } = useAuth()
  const { venues, selectedVenueId } = useVenue()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [resendTarget, setResendTarget] = useState<TeamMember | null>(null)
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null)
  const [removeLoading, setRemoveLoading] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)

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
        prev.map((m) => (m.id === memberId ? { ...m, venue_id: venueId, venue_name: venueName } : m))
      )
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to update venue assignment")
    }
  }

  // Resend prefills the invite dialog rather than firing a request behind the
  // owner's back: a resend mints a fresh link, and under the #5 contract the
  // link is the deliverable (Bizzy sends no invite SMS), so it has to land
  // somewhere the owner can copy or text it.
  const handleResend = (member: TeamMember) => {
    setResendTarget(member)
    setInviteOpen(true)
  }

  const handleRemove = async () => {
    if (!removeTarget) return
    setRemoveLoading(true)
    setRemoveError(null)
    try {
      await apiClient.delete(`/business/team/${removeTarget.id}`)
      setMembers((prev) => prev.filter((m) => m.id !== removeTarget.id))
      setRemoveTarget(null)
    } catch (err) {
      setRemoveError(err instanceof ApiError ? err.message : "Failed to remove member")
    } finally {
      setRemoveLoading(false)
    }
  }

  // Group members by venue, filtered by the venue switcher selection
  const venueGroups = useMemo((): VenueGroup[] => {
    const sorted = [...members].sort((a, b) => {
      if (a.role === "owner") return -1
      if (b.role === "owner") return 1
      return a.email.localeCompare(b.email)
    })

    const filtered =
      selectedVenueId !== "all" && selectedVenueId !== null
        ? sorted.filter((m) => m.venue_id === null || m.venue_id === selectedVenueId)
        : sorted

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
    if (globalMembers.length > 0) {
      groups.push({ venueId: null, venueName: "Global team", members: globalMembers })
    }

    const venueEntries = Array.from(byVenue.entries())
      .map(([id, list]) => ({
        venueId: id,
        venueName: list[0]?.venue_name || venues.find((v) => v.id === id)?.name || `Venue #${id}`,
        members: list,
      }))
      .sort((a, b) => a.venueName.localeCompare(b.venueName))

    groups.push(...venueEntries)
    return groups
  }, [members, selectedVenueId, venues])

  const visibleCount = venueGroups.reduce((sum, g) => sum + g.members.length, 0)

  return (
    <>
      <PageHeader
        title="Team"
        description={loading ? "Loading team…" : `${visibleCount} member${visibleCount !== 1 ? "s" : ""} across your workspace.`}
        actions={
          <div className="flex items-center gap-2">
            <RolePermissionsDialog variant="business" />
            {canInvite && (
              <Button onClick={() => setInviteOpen(true)}>
                <Plus /> Invite member
              </Button>
            )}
          </div>
        }
      />

      {loading ? (
        <Card className="p-5">
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : venueGroups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members yet"
          description="Invite managers and staff to help run your events, deals, and check-ins."
          action={canInvite ? <Button onClick={() => setInviteOpen(true)}><Plus /> Invite member</Button> : undefined}
        />
      ) : (
        <div className="flex flex-col gap-5">
          {venueGroups.map((group) => (
            <Card key={group.venueId ?? "global"} className="overflow-hidden">
              <div className="px-5 py-4">
                <div className="flex items-center gap-2">
                  {group.venueId === null ? (
                    <Globe className="size-4 text-neutral-400 dark:text-neutral-500" />
                  ) : (
                    <MapPin className="size-4 text-neutral-400 dark:text-neutral-500" />
                  )}
                  <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{group.venueName}</h2>
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">{group.members.length}</span>
                </div>
                {group.venueId === null && (
                  <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">These members have access to all venues.</p>
                )}
              </div>
              <div className="border-t border-neutral-100 dark:border-neutral-800 px-5">
                {group.members.map((member) => (
                  <TeamMemberRow
                    key={member.id}
                    member={member}
                    currentUserRole={user?.business_role || ""}
                    venues={venues}
                    onRemove={setRemoveTarget}
                    onRoleChange={handleRoleChange}
                    onVenueChange={handleVenueChange}
                    onResend={isOwner ? handleResend : undefined}
                  />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Keyed so a resend remounts the dialog with its prefill — the form
          state is seeded at mount. */}
      <InviteDialog
        key={resendTarget ? `resend-${resendTarget.id}` : "new"}
        open={inviteOpen}
        onOpenChange={(open) => { setInviteOpen(open); if (!open) setResendTarget(null) }}
        onInvited={() => { setInviteOpen(false); setResendTarget(null); fetchMembers() }}
        venues={venues}
        businessName={business?.name ?? "Your team"}
        initial={
          resendTarget
            ? {
                // Legacy rows are email-keyed end to end (the table has no phone
                // column today), so a resend of one is an email invite.
                contactType: "email",
                value: resendTarget.email,
                role: resendTarget.role === "manager" ? "manager" : "staff",
                venueId: resendTarget.venue_id,
              }
            : null
        }
      />

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => { if (!open) { setRemoveTarget(null); setRemoveError(null) } }}
        onConfirm={handleRemove}
        title="Remove team member"
        description={
          <>Remove <span className="font-medium text-neutral-700 dark:text-neutral-300">{removeTarget?.email}</span>? They&apos;ll lose access to the dashboard immediately.</>
        }
        confirmLabel="Remove"
        variant="danger"
        loading={removeLoading}
        error={removeError}
      />
    </>
  )
}
