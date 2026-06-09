"use client"

import { useState, useEffect, use } from "react"
import { Loader2, Plus, Users } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import type { EventTeamMember } from "@/lib/business/types"
import { Card, CardContent } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Select } from "@/components/business/v2/ui/input"
import { Badge, type BadgeProps } from "@/components/business/v2/ui/badge"
import { Avatar, AvatarFallback } from "@/components/business/v2/ui/avatar"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/business/v2/ui/dialog"
import { ManageSubheader } from "@/components/business/v2/events/ManageSubheader"
import { UserSearchInput } from "@/components/business/v2/events/UserSearchInput"

const ROLE_LABELS: Record<string, string> = { owner: "Owner", cohost: "Co-host", crew: "Crew", promoter: "Promoter" }
const ROLE_VARIANT: Record<string, NonNullable<BadgeProps["variant"]>> = {
  owner: "brand", cohost: "info", crew: "success", promoter: "warning",
}

function initials(s?: string | null) {
  if (!s) return "?"
  return s.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")
}

export default function V2EventTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [members, setMembers] = useState<EventTeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("crew")
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState("")
  const [removeTarget, setRemoveTarget] = useState<EventTeamMember | null>(null)

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

  const handleRemove = async () => {
    if (!removeTarget) return
    try {
      await apiClient.delete(`/business/events/${id}/team/${removeTarget.id}`)
      setMembers((prev) => prev.filter((m) => m.id !== removeTarget.id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove member")
    } finally {
      setRemoveTarget(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  return (
    <>
      <ManageSubheader
        eventId={id}
        title="Event team"
        subtitle="Co-hosts, crew, and promoters for this event."
        actions={<Button onClick={() => setShowAdd(true)}><Plus /> Add member</Button>}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {members.length === 0 ? (
        <EmptyState icon={Users} title="No team members yet" description="Add co-hosts, crew, or promoters for this event." />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-neutral-100">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarFallback>{initials(member.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-neutral-900">{member.full_name || "Unknown"}</p>
                      <Badge variant={ROLE_VARIANT[member.role] ?? "neutral"} size="sm">{ROLE_LABELS[member.role] ?? member.role}</Badge>
                    </div>
                    <p className="truncate text-[13px] text-neutral-500">{member.email}</p>
                  </div>
                </div>
                {member.role !== "owner" && (
                  <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setRemoveTarget(member)}>
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* add member dialog */}
      <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) { setEmail(""); setAddError("") } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add team member</DialogTitle>
            <DialogDescription>Search for an existing Bizzy user and assign a role.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <UserSearchInput value={email} onChange={setEmail} onSelect={(u) => setEmail(u.email)} autoFocus />
              </div>
              <Select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="cohost">Co-host</option>
                <option value="crew">Crew</option>
              </Select>
            </div>
            {addError && <p className="text-xs text-red-600">{addError}</p>}
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => { setShowAdd(false); setEmail(""); setAddError("") }}>Cancel</Button>
              <Button type="submit" disabled={adding || !email.trim()}>
                {adding && <Loader2 className="animate-spin" />} Add
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* remove confirm */}
      <Dialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove team member?</DialogTitle>
            <DialogDescription>{removeTarget?.full_name || removeTarget?.email} will lose access to this event.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRemoveTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleRemove}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
