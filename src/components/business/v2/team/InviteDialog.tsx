"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, UserPlus } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { Venue } from "@/lib/business/types"
import {
  inviteDefaultVenueIds, inviteVenuePayload, venueEditorModel, venueIdsLabel,
  type EditorScope,
} from "@/lib/business/team-venues"
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/business/v2/ui/dialog"
import { Button } from "@/components/business/v2/ui/button"
import { Label } from "@/components/business/v2/ui/label"
import { Select } from "@/components/business/v2/ui/input"
import UserSearchInput from "./UserSearchInput"
import VenueMultiSelect from "./VenueMultiSelect"

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvited: () => void
  /** TM-B3 (#15b): the inviter's own scope — a scoped manager may only invite
   *  into their own venues (global option hidden, minimum one enforced). */
  editorScope: EditorScope
  venues: Venue[]
}

const INVITABLE_ROLES = [
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
] as const

export default function InviteDialog({
  open, onOpenChange, onInvited, editorScope, venues,
}: InviteDialogProps) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("staff")
  // TM-B3 (#15b): venue-SET selection. Default depends on the inviter's scope.
  const [venueIds, setVenueIds] = useState<number[]>(() => inviteDefaultVenueIds(editorScope))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // The invite has no existing member, so nothing is ever "locked" here — the
  // editor model only shapes which venues are selectable + whether global shows.
  const editor = venueEditorModel(editorScope, [], venues)

  // Re-seed the default whenever the dialog opens or the inviter's scope resolves
  // (auth can load after mount) so a scoped manager never starts at empty/global.
  useEffect(() => {
    if (open) setVenueIds(inviteDefaultVenueIds(editorScope))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editorScope.role, editorScope.venueIds.join(",")])

  const reset = () => {
    setEmail("")
    setRole("staff")
    setVenueIds(inviteDefaultVenueIds(editorScope))
    setError("")
    setSuccess(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  // Scoped managers must pick at least one venue (no global fallback).
  const missingVenue = !editor.allowGlobal && venueIds.length === 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || missingVenue) return

    setLoading(true)
    setError("")
    try {
      await apiClient.post("/business/team/invite", {
        email,
        role,
        ...inviteVenuePayload(venueIds),
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
          <div className="flex items-center gap-2.5 rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 px-4 py-3.5 text-sm font-medium text-green-700 dark:text-green-400">
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
                {INVITABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-venue">Venue assignment</Label>
              {/* TM-B3 (#15b): same multi-select as the team row (controlled mode). */}
              <VenueMultiSelect
                editor={editor}
                value={venueIds}
                triggerLabel={venueIdsLabel(venueIds, venues)}
                mode="controlled"
                onChange={setVenueIds}
                align="start"
                className="w-full sm:w-full"
              />
              <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                {editor.allowGlobal
                  ? "Global members can access all venues. Pick specific venues to scope them."
                  : "Assign at least one of your venues. This member will only see the venues you choose."}
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2.5 text-sm text-red-600 dark:text-red-400">{error}</div>
            )}

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !email || missingVenue}>
                <UserPlus /> {loading ? "Sending…" : "Send invite"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
