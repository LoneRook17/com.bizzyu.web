"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { apiClient, ApiError } from "@/lib/business/api-client"
import UserSearchInput from "@/components/business/dashboard/UserSearchInput"
import type { EventTeamMember } from "@/lib/business/types"
import RolePermissionsModal from "@/components/business/dashboard/RolePermissionsModal"

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  cohost: "Co-host",
  crew: "Crew",
  promoter: "Promoter",
}

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700",
  cohost: "bg-blue-100 text-blue-700",
  crew: "bg-green-100 text-green-700",
  promoter: "bg-orange-100 text-orange-700",
}

export default function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [members, setMembers] = useState<EventTeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("crew")
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState("")

  const fetchMembers = () => {
    apiClient
      .get<{ members: EventTeamMember[] }>(`/business/events/${id}/team`)
      .then((data) => setMembers(data.members))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load team"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchMembers() }, [id])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setAdding(true)
    setAddError("")
    try {
      await apiClient.post(`/business/events/${id}/team`, { email: email.trim(), role })
      setEmail("")
      setShowAdd(false)
      fetchMembers()
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : "Failed to add member")
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (memberId: number) => {
    if (!confirm("Remove this team member?")) return
    try {
      await apiClient.delete(`/business/events/${id}/team/${memberId}`)
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to remove member")
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <Link href={`/business/events/${id}/manage`} className="text-xs text-gray-500 hover:text-primary mb-2 inline-block">
        &larr; Back to Manage
      </Link>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-ink">Event Team</h1>
          <RolePermissionsModal variant="event" />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors cursor-pointer"
        >
          Add Member
        </button>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
          <h3 className="text-sm font-semibold text-ink mb-3">Add Team Member</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div className="sm:col-span-2">
              <UserSearchInput
                value={email}
                onChange={setEmail}
                onSelect={(user) => setEmail(user.email)}
                placeholder="Search by name or email..."
                autoFocus
              />
            </div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
            >
              <option value="cohost">Co-host</option>
              <option value="crew">Crew</option>
              <option value="promoter">Promoter</option>
            </select>
          </div>
          {addError && <p className="text-xs text-red-500 mb-3">{addError}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={adding || !email.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-60"
            >
              {adding ? "Adding..." : "Add"}
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setEmail(""); setAddError("") }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Members list */}
      {members.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">No team members yet.</p>
          <p className="text-xs text-gray-400 mt-1">Add co-hosts, crew, or promoters for this event.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-ink truncate">{member.full_name || "Unknown"}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_COLORS[member.role] || "bg-gray-100 text-gray-600"}`}>
                    {ROLE_LABELS[member.role] || member.role}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">{member.email}</p>
              </div>
              {member.role !== "owner" && (
                <button
                  onClick={() => handleRemove(member.id)}
                  className="text-xs text-red-500 hover:text-red-700 cursor-pointer shrink-0 ml-4"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
