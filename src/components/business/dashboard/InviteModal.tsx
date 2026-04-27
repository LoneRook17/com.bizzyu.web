"use client"

import { useState } from "react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import UserSearchInput from "./UserSearchInput"
import type { Venue } from "@/lib/business/types"

interface InviteModalProps {
  open: boolean
  onClose: () => void
  onInvited: () => void
  canInviteManager: boolean
  venues: Venue[]
}

const INVITABLE_ROLES = [
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
] as const

export default function InviteModal({ open, onClose, onInvited, canInviteManager, venues }: InviteModalProps) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("staff")
  const [venueId, setVenueId] = useState<string>("") // "" = global (null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const roles = canInviteManager
    ? INVITABLE_ROLES
    : INVITABLE_ROLES.filter((r) => r.value !== "manager")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setError("")

    try {
      await apiClient.post("/business/team/invite", {
        email,
        role,
        venue_id: venueId ? Number(venueId) : null,
      })
      setSuccess(true)
      setTimeout(() => {
        onInvited()
        handleClose()
      }, 1500)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to send invite")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setEmail("")
    setRole("staff")
    setVenueId("")
    setError("")
    setSuccess(false)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative rounded-xl bg-white p-6 shadow-xl max-w-md w-full">
        <h3 className="text-lg font-semibold text-ink mb-1">Invite Team Member</h3>
        <p className="text-sm text-gray-500 mb-4">They&apos;ll receive an email with an invite link.</p>

        {success ? (
          <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
            Invite sent successfully!
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <UserSearchInput
                value={email}
                onChange={(val) => { setEmail(val); setError("") }}
                onSelect={(user) => { setEmail(user.email); setError("") }}
                placeholder="Search by name or email..."
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white text-ink"
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="invite-venue" className="block text-sm font-medium text-gray-700 mb-1">
                Venue Assignment
              </label>
              <select
                id="invite-venue"
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white text-ink"
              >
                <option value="">All Venues (Global)</option>
                {venues.map((v) => (
                  <option key={v.id} value={String(v.id)}>{v.name}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Global members can access all venues. Venue-specific members only see their assigned venue.
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !email}
                className="rounded-lg bg-gradient-to-br from-[#2ECB4E] to-[#05EB54] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/25 hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
