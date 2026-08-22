"use client"

import { use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { AlertTriangle, ArrowLeft, Loader2, RotateCcw, Zap } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import {
  applyNightHours,
  buildNightHoursPayload,
  buildNightOverridePayload,
  clearNightOverride,
  draftFromNight,
  draftHasOverrides,
  fetchDoorAccessNight,
  fmtNightDate,
  fmtWindow,
  fromTimeInput,
  nightChips,
  nightHasEventTickets,
  nightIsEditable,
  programHref,
  resetNightHours,
  saveNightOverride,
  toTimeInput,
  ACCESS_BUTTON_VARIANT,
  WEEKLY_ACCESS_SECTION_LABEL,
  validateNightDraft,
  type DoorAccessNight,
  type DoorAccessProgram,
  type NightDraft,
} from "@/lib/business/door-access"
import { cn } from "@/lib/v2/utils"
import { NightTicketsEditor } from "@/components/business/v2/door-access/NightTicketsEditor"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Badge } from "@/components/business/v2/ui/badge"
import { Button } from "@/components/business/v2/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/business/v2/ui/card"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { Input } from "@/components/business/v2/ui/input"
import { Skeleton } from "@/components/business/v2/ui/skeleton"

/**
 * The per-night override editor (D-F10.2).
 *
 * ONE night departs from the program template here: tickets, hours, or closed,
 * without restating the program and without evicting the night from series-wide
 * edits.
 *
 * WHY THIS IS NOT THE EVENT EDIT PAGE. PUT /business/events/:id stamps
 * series_customized_at, which permanently detaches the night from the program.
 * Ticket edits on a stamped night use /business/events/:id/tickets instead, so
 * the night stays on the program. A night that HAS been customized elsewhere
 * is read-only here (nightIsEditable) rather than silently written to.
 *
 * Tickets use the Events → Manage Tickets editor. A stamped night writes through
 * that night's event ticket APIs (name, description, scan window, hide, sold
 * out). Unstamped nights keep the same card and persist price, quantity, and
 * hide through the override endpoint, which is the only write path before an
 * event exists. Hours are always visible. Matching the program window (or
 * Reset to program default) sends null so the night tracks the template.
 * Closed this night is a labeled switch.
 */
export default function DoorAccessNightPage({
  params,
}: {
  params: Promise<{ id: string; date: string }>
}) {
  const { id, date } = use(params)
  const programId = Number(id)
  const { user } = useAuth()

  const [program, setProgram] = useState<DoorAccessProgram | null>(null)
  const [night, setNight] = useState<DoorAccessNight | null>(null)
  const [draft, setDraft] = useState<NightDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [restampWarning, setRestampWarning] = useState<string | null>(null)

  const canEdit = user?.business_role === "owner" || user?.business_role === "manager"

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchDoorAccessNight(programId, date)
      setProgram(data.program)
      setNight(data.night)
      setDraft(draftFromNight(data.night, data.program))
    } catch {
      setError("Could not load this night.")
    } finally {
      setLoading(false)
    }
  }, [programId, date])

  useEffect(() => {
    load()
  }, [load])

  /** Adopt whatever the server says the night is now. Never the local guess. */
  const adopt = (result: { night: DoorAccessNight; restamp_error: string | null }) => {
    setNight(result.night)
    if (program) setDraft(draftFromNight(result.night, program))
    setRestampWarning(result.restamp_error)
  }

  const handleSave = async () => {
    if (!draft || !night) return
    const problems = validateNightDraft(draft)
    if (problems.length > 0) {
      setSaveError(problems.join(" "))
      return
    }
    setSaving(true)
    setSaveError(null)
    setNotice(null)
    setRestampWarning(null)
    try {
      const payload = nightHasEventTickets(night)
        ? buildNightHoursPayload(draft)
        : buildNightOverridePayload(draft)
      const result = await saveNightOverride(programId, date, payload)
      adopt(result)
      setNotice("Saved.")
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save this night.")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setSaving(true)
    setSaveError(null)
    setNotice(null)
    setRestampWarning(null)
    try {
      const result = await clearNightOverride(programId, date)
      adopt(result)
      setNotice("This night is back on the program's defaults.")
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not reset this night.")
    } finally {
      setSaving(false)
    }
  }

  if (loading && !night) {
    return (
      <>
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-[180px] rounded-xl" />
        <Skeleton className="h-[280px] rounded-xl" />
      </>
    )
  }

  if (error || !night || !program || !draft) {
    return (
      <>
        <BackLink programId={programId} />
        <EmptyState
          icon={Zap}
          title="Night not found"
          description={error ?? "That night isn't on this program's schedule."}
        />
      </>
    )
  }

  const editable = canEdit && nightIsEditable(night)
  const chips = nightChips(night)

  return (
    <>
      <BackLink programId={programId} />

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            {fmtNightDate(night.occurrence_date, { withYear: true })}
            {chips.map((chip) => (
              <Badge key={chip.label} variant={chip.variant}>
                {chip.label}
              </Badge>
            ))}
          </span>
        }
        description={`${program.name || WEEKLY_ACCESS_SECTION_LABEL} · ${fmtWindow(night.start_time, night.end_time)}`}
        actions={
          editable ? (
            <div className="flex items-center gap-2">
              {night.has_override && (
                <Button variant="access-secondary" onClick={handleReset} disabled={saving}>
                  <RotateCcw className="size-4" /> Reset to defaults
                </Button>
              )}
              <Button variant={ACCESS_BUTTON_VARIANT} onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Saving…
                  </>
                ) : (
                  "Save night"
                )}
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Why this night can't be edited here. Stated, never a dead form. */}
      {!nightIsEditable(night) && (
        <Notice tone="warning">
          {night.status === "cancelled"
            ? "This night is cancelled. Cancelled nights can't be re-priced."
            : "This night was edited directly as an event, so it no longer follows the program. Change it on its event page. Edits made here wouldn't show up there."}
        </Notice>
      )}

      {/* Unstamped is not an error state. Overrides key off the DATE, which is
          what lets a host price a holiday weeks before the night exists. */}
      {editable && !night.is_stamped && (
        <Notice tone="info">
          This night hasn&apos;t been generated yet. You can still price it. The settings apply
          automatically when it&apos;s created.
        </Notice>
      )}

      {!canEdit && <Notice tone="info">Only owners and managers can change a night.</Notice>}

      {saveError && <Notice tone="danger">{saveError}</Notice>}
      {/* A restamp failure is a WARNING: the override IS saved. */}
      {restampWarning && <Notice tone="warning">{restampWarning}</Notice>}
      {notice && !saveError && <Notice tone="success">{notice}</Notice>}

      {night.passes_sold > 0 && (
        <Notice tone="info">
          {night.passes_sold.toLocaleString("en-US")} pass
          {night.passes_sold === 1 ? " has" : "es have"} already sold for this night. Changing a
          price only affects sales from now on.
        </Notice>
      )}

      <HoursCard draft={draft} setDraft={setDraft} program={program} editable={editable} />

      <NightTicketsEditor
        programId={programId}
        date={date}
        program={program}
        night={night}
        draft={draft}
        setProgram={setProgram}
        editable={editable}
        onOverrideSaved={adopt}
      />

      {editable && draftHasOverrides(draft) && (
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
          This night differs from the program defaults. Reset a field to follow the program
          again.
        </p>
      )}
    </>
  )
}

function BackLink({ programId }: { programId: number }) {
  return (
    <Link
      href={programHref(programId)}
      className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-neutral-500 transition-colors hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
    >
      <ArrowLeft className="size-4" />
      Back to program
    </Link>
  )
}

function Notice({
  tone,
  children,
}: {
  tone: "info" | "warning" | "danger" | "success"
  children: React.ReactNode
}) {
  const tones = {
    info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
    warning:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    danger: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
    success:
      "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300",
  }
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] ${tones[tone]}`}>
      {tone === "warning" && <AlertTriangle className="mt-px size-4 shrink-0" />}
      <div>{children}</div>
    </div>
  )
}

function HoursCard({
  draft,
  setDraft,
  program,
  editable,
}: {
  draft: NightDraft
  setDraft: (d: NightDraft) => void
  program: DoorAccessProgram
  editable: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Door hours</CardTitle>
        <span className="text-[13px] text-neutral-500 dark:text-neutral-400">
          Program default: {fmtWindow(program.start_time, program.end_time)}
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">Hours for this night</p>
          {draft.inherit_times ? (
            <span className="text-[12px] text-neutral-400 dark:text-neutral-500">Program default</span>
          ) : editable ? (
            <button
              type="button"
              onClick={() => setDraft(resetNightHours(draft, program.start_time, program.end_time))}
              className="text-[12px] font-medium text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              Reset to program default
            </button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:max-w-md">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
              Opens
            </span>
            <Input
              type="time"
              value={toTimeInput(draft.start_time)}
              disabled={!editable}
              onChange={(e) =>
                setDraft(
                  applyNightHours(
                    draft,
                    fromTimeInput(e.target.value),
                    draft.end_time,
                    program.start_time,
                    program.end_time
                  )
                )
              }
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
              Closes
            </span>
            <Input
              type="time"
              value={toTimeInput(draft.end_time)}
              disabled={!editable}
              onChange={(e) =>
                setDraft(
                  applyNightHours(
                    draft,
                    draft.start_time,
                    fromTimeInput(e.target.value),
                    program.start_time,
                    program.end_time
                  )
                )
              }
            />
          </label>
        </div>

        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3",
            draft.is_closed
              ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
              : "border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/40"
          )}
        >
          <label htmlFor="closed-this-night" className="min-w-0 cursor-pointer">
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Closed this night
            </p>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
              Stops sales for this date only. The rest of the program keeps running.
            </p>
          </label>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "text-sm font-semibold",
                draft.is_closed
                  ? "text-red-700 dark:text-red-300"
                  : "text-neutral-500 dark:text-neutral-400"
              )}
            >
              {draft.is_closed ? "On" : "Off"}
            </span>
            <SwitchPrimitive.Root
              id="closed-this-night"
              checked={draft.is_closed}
              disabled={!editable}
              onCheckedChange={(closed) => setDraft({ ...draft, is_closed: closed })}
              aria-label="Closed this night"
              className={cn(
                "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-access focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
                draft.is_closed ? "bg-red-600" : "bg-neutral-300 dark:bg-neutral-600"
              )}
            >
              <SwitchPrimitive.Thumb
                className={cn(
                  "pointer-events-none block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform",
                  draft.is_closed ? "translate-x-5" : "translate-x-0"
                )}
              />
            </SwitchPrimitive.Root>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

