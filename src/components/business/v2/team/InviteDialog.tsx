"use client"

import { useState } from "react"
import { CheckCircle2, UserPlus } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { Venue } from "@/lib/business/types"
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/business/v2/ui/dialog"
import { Button } from "@/components/business/v2/ui/button"
import { Label } from "@/components/business/v2/ui/label"
import { Select } from "@/components/business/v2/ui/input"
import UserSearchInput from "./UserSearchInput"

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvited: () => void
  canInviteManager: boolean
  venues: Venue[]
}

const INVITABLE_ROLES = [
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
] as const

export default function InviteDialog({
  open, onOpenChange, onInvited, canInviteManager, venues,
}: InviteDialogProps) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("staff")
  const [venueId, setVenueId] = useState<string>("") // "" = global (null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const roles = canInviteManager
    ? INVITABLE_ROLES
    : INVITABLE_ROLES.filter((r) => r.value !== "manager")

  const reset = () => {
    setEmail("")
    setRole("staff")
    setVenueId("")
    setError("")
    setSuccess(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

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
        handleOpenChange(false)
      }, 1400)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send invite")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite team member</DialogTitle>
          <DialogDescription>They&apos;ll receive an email with a link to join your team.</DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-green-200 bg-green-50 px-4 py-3.5 text-sm font-medium text-green-700">
            <CheckCircle2 className="size-5 shrink-0" />
            Invite sent successfully.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <UserSearchInput
                value={email}
                onChange={(val) => { setEmail(val); setError("") }}
                onSelect={(user) => { setEmail(user.email); setError("") }}
                placeholder="Search by name or email…"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <Select id="invite-role" value={role} onChange={(e) => setRole(e.target.value)}>
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-venue">Venue assignment</Label>
              <Select id="invite-venue" value={venueId} onChange={(e) => setVenueId(e.target.value)}>
                <option value="">All venues (global)</option>
                {venues.map((v) => (
                  <option key={v.id} value={String(v.id)}>{v.name}</option>
                ))}
              </Select>
              <p className="text-[13px] text-neutral-500">
                Global members can access all venues. Venue-specific members only see their assigned venue.
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>
            )}

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !email}>
                <UserPlus /> {loading ? "Sending…" : "Send invite"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
