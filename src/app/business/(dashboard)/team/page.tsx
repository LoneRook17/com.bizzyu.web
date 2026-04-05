"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/business/auth-context"
import { apiClient, ApiError } from "@/lib/business/api-client"
import TeamMemberRow from "@/components/business/dashboard/TeamMemberRow"
import InviteModal from "@/components/business/dashboard/InviteModal"
import ConfirmModal from "@/components/business/dashboard/ConfirmModal"
import type { TeamMember } from "@/lib/business/types"
import RolePermissionsModal from "@/components/business/dashboard/RolePermissionsModal"

export default function TeamPage() {
  const { user } = useAuth()
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

  // Sort: owner first, then by role, then by email
  const sortedMembers = [...members].sort((a, b) => {
    if (a.role === "owner") return -1
    if (b.role === "owner") return 1
    return a.email.localeCompare(b.email)
  })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-ink">Team</h1>
            <RolePermissionsModal variant="business" />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{members.length} member{members.length !== 1 ? "s" : ""}</p>
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

      {/* Member list */}
      <div className="rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <div className="p-4 space-y-4">
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
        ) : sortedMembers.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No team members found.
          </div>
        ) : (
          <div className="px-4">
            {sortedMembers.map((member) => (
              <TeamMemberRow
                key={member.id}
                member={member}
                currentUserRole={user?.business_role || ""}
                onRemove={setRemoveTarget}
                onRoleChange={handleRoleChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* Invite modal */}
      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={() => { setInviteOpen(false); fetchMembers() }}
        canInviteManager={isOwner}
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
