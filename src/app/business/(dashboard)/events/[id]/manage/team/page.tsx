"use client"

import { Fragment, useState, useEffect, use } from "react"
import Link from "next/link"
import { ArrowRight, DoorOpen, Loader2, Plus, Users } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { isWeeklyCoverProduct } from "@/lib/business/door-access"
import type { EventDetail, EventTeamMember } from "@/lib/business/types"
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
import { WeeklyCoverAccent } from "@/components/business/v2/door-access/WeeklyCoverAccent"

const ROLE_LABELS: Record<string, string> = { owner: "Owner", cohost: "Co-host", crew: "Crew", promoter: "Promoter" }
const ROLE_VARIANT: Record<string, NonNullable<BadgeProps["variant"]>> = {
  owner: "brand", cohost: "info", crew: "success", promoter: "warning",
}
// On a Weekly Cover night the green family (brand/success) becomes the access
// pink. Owner and crew were the same green on events, so they share pink here.
const WC_ROLE_VARIANT: Record<string, NonNullable<BadgeProps["variant"]>> = {
  owner: "access", cohost: "info", crew: "access", promoter: "warning",
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
  const [ready, setReady] = useState(false)
  const [pink, setPink] = useState(false)

  const fetchMembers = () => {
    apiClient
      .get<{ members: EventTeamMember[] }>(`/business/events/${id}/team`)
      .then((data) => setMembers(data.members))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load team"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchMembers() }, [id])

  // #119 pattern: one event read decides the accent, nothing else. A WC night
  // renders this page pink, with night-scoped copy and NO door-code reframe —
  // a Weekly Cover night has no such code (its manage page hides
  // DoorCodeCard), and team access granted here covers this night only
  // (services enforces per-night visibility).
  useEffect(() => {
    let cancelled = false
    apiClient
      .get<EventDetail>(`/business/events/${id}`)
      .then((event) => {
        if (cancelled) return
        setPink(isWeeklyCoverProduct(event))
        setReady(true)
      })
      // On a failed read, render the default (green) page: the members fetch
      // owns the visible error state, so the host sees the real failure.
      .catch(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [id])

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

  if (loading || !ready) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  const AccentScope = pink ? WeeklyCoverAccent : Fragment
  const roleVariant = pink ? WC_ROLE_VARIANT : ROLE_VARIANT

  return (
    <AccentScope>
      <ManageSubheader
        eventId={id}
        title="Managers & co-hosts"
        subtitle={pink
          ? "Teammates with a Bizzy account and dashboard access to this night (co-hosts and crew)."
          : "Teammates with a Bizzy account and dashboard access (co-hosts and crew)."}
        actions={<Button onClick={() => setShowAdd(true)}><Plus /> Add teammate</Button>}
      />

      {pink ? (
        /* WC: a Weekly Cover night has no scan code to hand out, so the green
           reframe would dead-end. Instead, say what adding someone does:
           access to THIS night only. */
        <div className="flex items-start gap-3 rounded-xl border border-access/40 bg-access/10 p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-access/10 text-access">
            <Users className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Teammates you add here get access to this night only.
            </p>
            <p className="mt-0.5 text-[13px] text-neutral-600 dark:text-neutral-400">
              They’ll see and help run <span className="font-medium text-neutral-800 dark:text-neutral-200">this night</span> in their dashboard, not the rest of your Weekly Cover schedule.
            </p>
          </div>
        </div>
      ) : (
        /* Door-staff intent lands here by habit. Redirect it: door staff don't
           need an account — they need the door code. This is the reframe. */
        <Link
          href={`/business/events/${id}/manage`}
          className="group flex items-start gap-3 rounded-xl border border-[#05EB54]/30 bg-green-50/50 p-4 transition-colors hover:border-[#05EB54]/60 dark:border-green-900/50 dark:bg-green-950/20"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#05EB54]/15 text-[#05EB54]">
            <DoorOpen className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Just need someone scanning tickets tonight?
            </p>
            <p className="mt-0.5 text-[13px] text-neutral-600 dark:text-neutral-400">
              Door staff don’t need an account or an invite. Share your event’s <span className="font-medium text-neutral-800 dark:text-neutral-200">door code</span> instead. Add teammates here only if they need dashboard access.
            </p>
          </div>
          <ArrowRight className="mt-1 size-4 shrink-0 text-[#05EB54] transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title={pink ? "No managers or co-hosts on this night yet" : "No managers or co-hosts yet"}
          description={pink
            ? "Add a teammate who needs a Bizzy account and dashboard access to this night."
            : "Add a teammate who needs a Bizzy account and dashboard access. For door staff who just scan tickets, use the door code instead."}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarFallback>{initials(member.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{member.full_name || "Unknown"}</p>
                      <Badge variant={roleVariant[member.role] ?? "neutral"} size="sm">{ROLE_LABELS[member.role] ?? member.role}</Badge>
                    </div>
                    <p className="truncate text-[13px] text-neutral-500 dark:text-neutral-400">{member.email}</p>
                  </div>
                </div>
                {member.role !== "owner" && (
                  <Button variant="ghost" size="sm" className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-400" onClick={() => setRemoveTarget(member)}>
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
            <DialogTitle>{pink ? "Add a manager or co-host for this night" : "Add a manager or co-host"}</DialogTitle>
            <DialogDescription>{pink
              ? "For teammates who need dashboard access to this night. Search for an existing Bizzy user and assign a role. Access covers this night only, not the rest of your schedule."
              : "For teammates who need dashboard access. Search for an existing Bizzy user and assign a role. (Door staff who only scan tickets don’t need this. Use the door code.)"}</DialogDescription>
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
            {addError && <p className="text-xs text-red-600 dark:text-red-400">{addError}</p>}
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
            <DialogDescription>{removeTarget?.full_name || removeTarget?.email} {pink ? "will lose access to this night." : "will lose access to this event."}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRemoveTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleRemove}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AccentScope>
  )
}
