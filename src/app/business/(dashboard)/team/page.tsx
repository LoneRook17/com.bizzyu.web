"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Globe, Layers, MapPin, Plus, Users } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue } from "@/lib/business/venue-context"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { TeamMember } from "@/lib/business/types"
import { memberDisplay } from "@/lib/team-invite/display"
import {
  memberVenueIds, memberVenuesPath, memberVenuesPayload,
  userVenueIds, isVenueScopeForbidden,
  type EditorScope,
} from "@/lib/business/team-venues"
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
  key: string
  kind: "global" | "venue" | "multi"
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
  // TM-B3 (#15b): per-row venue-assignment errors (e.g. 403 VENUE_SCOPE_FORBIDDEN).
  const [venueErrors, setVenueErrors] = useState<Record<number, string>>({})

  const canInvite = user?.business_role === "owner" || user?.business_role === "manager"
  const isOwner = user?.business_role === "owner"

  // TM-B3 (#15b): the viewer's own scope — drives what venues they may assign.
  const editorScope: EditorScope = { role: user?.business_role ?? "", venueIds: userVenueIds(user) }

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

  const handleVenuesChange = async (memberId: number, venueIds: number[]) => {
    // Clear any prior inline error for this row before retrying.
    setVenueErrors((prev) => {
      if (!(memberId in prev)) return prev
      const next = { ...prev }
      delete next[memberId]
      return next
    })
    try {
      // PUT …/members/:id/venues; [] = clear to global. Contract owned by team-venues.ts.
      // NOTE: venueIds already carries any preserved (locked) out-of-scope ids —
      // editorCommitVenueIds() unions them in the row editor before this fires.
      await apiClient.put(memberVenuesPath(memberId), memberVenuesPayload(venueIds))
      const nextVenues = venueIds.map((id) => ({ venue_id: id, name: venues.find((v) => v.id === id)?.name ?? `Venue #${id}` }))
      // Keep the scalar mirror coherent: single → that venue; global/set → null,
      // since memberVenueIds() prefers the non-empty `venues` set anyway.
      const scalarId = venueIds.length === 1 ? venueIds[0] : null
      const scalarName = scalarId != null ? nextVenues[0].name : null
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, venues: nextVenues, venue_id: scalarId, venue_name: scalarName } : m))
      )
    } catch (err) {
      // Inline error, not alert(). The optimistic update above never ran (the PUT
      // threw first), so no state was corrupted — the row keeps its committed scope.
      const message = isVenueScopeForbidden(err)
        ? "You can only assign venues within your own scope."
        : err instanceof ApiError ? err.message : "Failed to update venue assignment"
      setVenueErrors((prev) => ({ ...prev, [memberId]: message }))
    }
  }

  // Resend prefills the invite dialog rather than firing a request behind the
  // owner's back: a resend mints a fresh link, and under the #5 contract the
  // link is the deliverable (Bizzy sends no invite SMS), so it has to land
  // somewhere the owner can copy or text it. The dialog seeds the venue
  // multi-select from the member's full effective set (memberVenueIds via
  // `initial.venueIds`), so a resend preserves their venue scope.
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

  // Group members by their EFFECTIVE venue scope (set-aware), filtered by the
  // venue switcher selection. Legacy single/global members read the scalar
  // fallback via memberVenueIds() and land in exactly the same groups as before;
  // members scoped to >1 venue get a dedicated "Multiple venues" group so nobody
  // is duplicated across venue cards.
  const venueGroups = useMemo((): VenueGroup[] => {
    const sorted = [...members].sort((a, b) => {
      if (a.role === "owner") return -1
      if (b.role === "owner") return 1
      // Sort by what the row actually shows, so provisional/phone-only rows
      // (no email) order sensibly instead of clustering under a blank key.
      return memberDisplay(a).name.localeCompare(memberDisplay(b).name)
    })

    const scoped = sorted.map((m) => ({ m, ids: memberVenueIds(m) }))

    const filtered =
      selectedVenueId !== "all" && selectedVenueId !== null
        ? scoped.filter(({ ids }) => ids.length === 0 || ids.includes(selectedVenueId))
        : scoped

    const globalMembers: TeamMember[] = []
    const multiMembers: TeamMember[] = []
    const byVenue = new Map<number, TeamMember[]>()

    for (const { m, ids } of filtered) {
      if (ids.length === 0) {
        globalMembers.push(m)
      } else if (ids.length > 1) {
        multiMembers.push(m)
      } else {
        const list = byVenue.get(ids[0]) || []
        list.push(m)
        byVenue.set(ids[0], list)
      }
    }

    const groups: VenueGroup[] = []
    if (globalMembers.length > 0) {
      groups.push({ key: "global", kind: "global", venueName: "Global team", members: globalMembers })
    }

    const venueEntries = Array.from(byVenue.entries())
      .map(([id, list]): VenueGroup => ({
        key: `venue-${id}`,
        kind: "venue",
        venueName: list[0]?.venue_name || venues.find((v) => v.id === id)?.name || `Venue #${id}`,
        members: list,
      }))
      .sort((a, b) => a.venueName.localeCompare(b.venueName))

    groups.push(...venueEntries)

    if (multiMembers.length > 0) {
      groups.push({ key: "multi", kind: "multi", venueName: "Multiple venues", members: multiMembers })
    }

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
            <Card key={group.key} className="overflow-hidden">
              <div className="px-5 py-4">
                <div className="flex items-center gap-2">
                  {group.kind === "global" ? (
                    <Globe className="size-4 text-neutral-400 dark:text-neutral-500" />
                  ) : group.kind === "multi" ? (
                    <Layers className="size-4 text-neutral-400 dark:text-neutral-500" />
                  ) : (
                    <MapPin className="size-4 text-neutral-400 dark:text-neutral-500" />
                  )}
                  <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{group.venueName}</h2>
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">{group.members.length}</span>
                </div>
                {group.kind === "global" && (
                  <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">These members have access to all venues.</p>
                )}
                {group.kind === "multi" && (
                  <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">These members are scoped to a specific set of venues.</p>
                )}
              </div>
              <div className="border-t border-neutral-100 dark:border-neutral-800 px-5">
                {group.members.map((member) => (
                  <TeamMemberRow
                    key={member.id}
                    member={member}
                    currentUserRole={user?.business_role || ""}
                    editorScope={editorScope}
                    venues={venues}
                    onRemove={setRemoveTarget}
                    onRoleChange={handleRoleChange}
                    onVenuesChange={handleVenuesChange}
                    onResend={isOwner ? handleResend : undefined}
                    venueError={venueErrors[member.id]}
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
        editorScope={editorScope}
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
                venueIds: memberVenueIds(resendTarget),
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
          <>Remove <span className="font-medium text-neutral-700 dark:text-neutral-300">{removeTarget ? memberDisplay(removeTarget).name : ""}</span>? They&apos;ll lose access to the dashboard immediately.</>
        }
        confirmLabel="Remove"
        variant="danger"
        loading={removeLoading}
        error={removeError}
      />
    </>
  )
}
