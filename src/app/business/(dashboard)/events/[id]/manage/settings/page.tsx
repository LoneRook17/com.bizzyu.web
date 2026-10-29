"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Copy, Pencil, Users } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { isWeeklyCoverProduct, programIdFromOwnedEvent, weeklyCoverNightEditHref } from "@/lib/business/door-access"
import { createFromTemplateHref } from "@/lib/business/create-from-template"
import { weeklyCoverNightNeedsPendingCancel } from "@/lib/business/weekly-cover-visibility"
import { manageBase } from "@/lib/business/manage-tabs"
import { useManageEvent } from "@/lib/business/manage-event-context"
import { Badge } from "@/components/business/v2/ui/badge"
import { Button } from "@/components/business/v2/ui/button"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { ActionList, ActionRow } from "@/components/business/v2/ManageActionList"
import { ManageSubheader } from "@/components/business/v2/events/ManageSubheader"
import { CancelEventModal } from "@/components/business/v2/events/CancelEventModal"

/**
 * BETA shell: the Settings tab — what the old hub's "Event setup" tiles did,
 * as a tight action list, plus the danger zone that used to sit at the
 * bottom of the hub.
 *
 * WC FLAW 3 — the generic-edit fork survives the move. "Edit event" writes
 * through PUT /business/events/:id; a WC night must never reach it. The WC
 * branch keeps the night-override editor (weeklyCoverNightEditHref), and a
 * night already stamped customized still goes there — never a green named-
 * Event editor. Only a WC night with no resolvable program keeps the generic
 * rows (there is no series to protect).
 */
export default function V2ManageSettingsPage() {
  const { id, event, seriesActive, loading } = useManageEvent()
  const router = useRouter()
  const { user } = useAuth()
  const [showCancel, setShowCancel] = useState(false)
  const canEdit = user?.business_role === "owner" || user?.business_role === "manager"
  const base = manageBase(id)

  if (loading && !event) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-32 rounded-[10px]" />
      </div>
    )
  }
  if (!event) return null

  const isDoorAccess = isWeeklyCoverProduct(event)
  const accent = isDoorAccess ? "access" : "event"
  const wcProgramId = programIdFromOwnedEvent(event)
  const wcNightEdit = weeklyCoverNightEditHref(event)
  const isPastEvent = new Date(event.end_date_time) < new Date()
  const cancellationStatus = event.cancellation_status || "none"
  const pendingCancel = weeklyCoverNightNeedsPendingCancel(event, seriesActive)

  // Luke (2026-08-29): the WC night mirrors green's setup row. Edit night
  // keeps door hours and closing; program/weekday editing lives on the
  // program page. Tickets are the Tickets tab for both kinds.
  const rows =
    wcNightEdit != null && wcProgramId != null
      ? [
          { href: wcNightEdit, icon: Pencil, title: "Edit night", subtitle: "Door hours, or close this night only", show: canEdit && seriesActive },
          { href: `${base}/team`, icon: Users, title: "Managers & co-hosts", subtitle: "Add a teammate with a Bizzy account for this night", show: true },
        ]
      : [
          { href: `/business/events/${id}/edit`, icon: Pencil, title: "Edit event", subtitle: "Details, date, location, artwork, and tickets", show: canEdit },
          { href: `${base}/team`, icon: Users, title: "Managers & co-hosts", subtitle: "Add a teammate with a Bizzy account", show: true },
          { href: createFromTemplateHref(event), icon: Copy, title: "Use as template", subtitle: "Start a new event from this one", show: canEdit },
        ]

  return (
    <>
      <ManageSubheader eventId={id} title="Settings" subtitle="Details, who can help run it, and cancellation." />

      <ActionList>
        {rows.filter((r) => r.show).map((r) => (
          <ActionRow key={r.href} href={r.href} icon={r.icon} title={r.title} subtitle={r.subtitle} accent={accent} />
        ))}
      </ActionList>

      {/* cancellation banners */}
      {(cancellationStatus === "pending" || pendingCancel) && (
        <div className="rounded-[10px] border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <div className="flex items-center gap-2">
            <Badge variant="warning">Cancellation pending</Badge>
            <span className="text-sm text-amber-700 dark:text-amber-400">
              {cancellationStatus === "pending"
                ? "Awaiting admin review"
                : "This series was cancelled. This night stays until admin refunds complete."}
            </span>
          </div>
          {event.cancellation_reason && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">Reason: {event.cancellation_reason}</p>}
        </div>
      )}
      {cancellationStatus === "denied" && (
        <div className="rounded-[10px] border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
          <Badge variant="danger">Cancellation denied</Badge>
          {event.cancellation_denial_reason && <p className="mt-2 text-xs text-red-600 dark:text-red-400">Reason: {event.cancellation_denial_reason}</p>}
        </div>
      )}

      {/* danger zone */}
      {canEdit && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Danger zone</h2>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-red-200 bg-red-50/30 px-4 py-3 dark:border-red-900 dark:bg-red-950/30">
            <p className="text-[13px] text-neutral-600 dark:text-neutral-400">
              {isPastEvent && event.status !== "cancelled"
                ? "Cannot cancel. Event has already ended."
                : "Cancelling refunds every ticket holder. This cannot be undone."}
            </p>
            {event.status !== "cancelled" && cancellationStatus === "none" && !pendingCancel && !isPastEvent && (
              <Button
                variant="secondary"
                className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
                onClick={() => setShowCancel(true)}
              >
                Cancel event
              </Button>
            )}
          </div>
        </section>
      )}

      <CancelEventModal
        open={showCancel}
        onOpenChange={setShowCancel}
        eventId={Number(id)}
        eventName={event.name}
        onCancelled={() => router.push("/business/events")}
      />
    </>
  )
}
