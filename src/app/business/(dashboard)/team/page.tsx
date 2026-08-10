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
  userVenueIds, isVenueScopeForbidden, groupMembersByScope,
  type EditorScope,
} from "@/lib/business/team-venues"
import { togglePayoutsAccess, PAYOUTS_ACCESS_TOGGLE } from "@/lib/business/team-payouts-access"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Card } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import TeamMemberRow from "@/components/business/v2/team/TeamMemberRow"
import InviteDialog from "@/components/business/v2/team/InviteDialog"
import RolePermissionsDialog from "@/components/business/v2/team/RolePermissionsDialog"
import ConfirmDialog from "@/components/business/v2/ConfirmDialog"

export default function V2TeamPage() {
  const { user, business } = useAuth()
  // TF-DRIVE-W1: the roster is DECOUPLED from the page venue switcher — every
  // member is always shown, grouped by their own scope. `selectedVenueId` is
  // deliberately NOT read here so a venue-set save (or switching venues) can
  // never hide a member.
  const { venues } = useVenue()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [resendTarget, setResendTarget] = useState<TeamMember | null>(null)
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null)
  const [removeLoading, setRemoveLoading] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)
  // TM-B3 (#15b): per-row venue-assignment errors (e.g. 403 VENUE_SCOPE_FORBIDDEN).
  const [venueErrors, setVenueErrors] = useState<Record<number, string>>({})
  // PAYOUTS-PER-PERSON-ACCESS: per-row Payouts-access errors + in-flight rows.
  const [accessErrors, setAccessErrors] = useState<Record<number, string>>({})
  const [accessSaving, setAccessSaving] = useState<Record<number, boolean>>({})

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

  // PAYOUTS-PER-PERSON-ACCESS: owner flips a member's Payouts-page access.
  // Optimistic (functional setState composes on the latest roster), with a clean
  // revert + inline error on failure. The pure orchestration lives in
  // team-payouts-access.ts (unit-tested); this only wires state + the client.
  const handlePayoutsAccessChange = useCallback(async (memberId: number, enabled: boolean) => {
    // Clear any prior error for this row before retrying.
    setAccessErrors((prev) => {
      if (!(memberId in prev)) return prev
      const next = { ...prev }
      delete next[memberId]
      return next
    })
    const previous = members.find((m) => m.id === memberId)?.can_view_payouts ?? false
    setAccessSaving((prev) => ({ ...prev, [memberId]: true }))
    await togglePayoutsAccess({
      memberId,
      enabled,
      previous,
      patch: (path, body) => apiClient.patch(path, body),
      setMembers,
      onError: (id, err) =>
        setAccessErrors((prev) => ({
          ...prev,
          [id]: err instanceof ApiError ? err.message : PAYOUTS_ACCESS_TOGGLE.errorLabel,
        })),
    })
    setAccessSaving((prev) => {
      const next = { ...prev }
      delete next[memberId]
      return next
    })
  }, [members])

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

  // Group members by their EFFECTIVE venue scope (set-aware). Legacy single/
  // global members read the scalar fallback via memberVenueIds() and land in the
  // same groups; members scoped to >1 venue get a dedicated "Multiple venues"
  // group so nobody is duplicated across venue cards. Visibility is TOTAL and
  // switcher-independent (TF-DRIVE-W1) — no member is ever filtered out.
  const venueGroups = useMemo(
    () => groupMembersByScope(members, venues, (m) => memberDisplay(m).name),
    [members, venues],
  )

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
                    onPayoutsAccessChange={isOwner ? handlePayoutsAccessChange : undefined}
                    payoutsAccessSaving={accessSaving[member.id]}
                    payoutsAccessError={accessErrors[member.id]}
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
