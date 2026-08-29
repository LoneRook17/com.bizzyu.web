"use client"

import { use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { AlertTriangle, ArrowLeft, Loader2, RotateCcw, Zap } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import {
  applyNightHours,
  buildNightSavePayload,
  clearNightOverride,
  draftFromNight,
  draftHasOverrides,
  loadDoorAccessNightForPath,
  nightDraftIsDirty,
  fmtNightDate,
  fmtWindow,
  fromTimeInput,
  nightChips,
  nightIsEditable,
  nightSaveFeedback,
  NIGHT_CUSTOM_HELPER,
  NIGHT_CUSTOMIZED_NOTICE,
  NIGHT_UNSAVED_TITLE,
  nightHref,
  programHref,
  resetNightHours,
  saveNightOverride,
  toTimeInput,
  weeklyCoverNightCancelEventId,
  ACCESS_BUTTON_VARIANT,
  WEEKLY_ACCESS_SECTION_LABEL,
  validateNightDraft,
  type DoorAccessNight,
  type DoorAccessProgram,
  type NightDraft,
  type NightOverrideResult,
} from "@/lib/business/door-access"
import { cn } from "@/lib/v2/utils"
import { NightLeaveGuard } from "@/components/business/v2/door-access/NightLeaveGuard"
import { NightTicketsEditor } from "@/components/business/v2/door-access/NightTicketsEditor"
import { CancelEventModal } from "@/components/business/v2/events/CancelEventModal"
import { weeklyCoverNightNeedsPendingCancel } from "@/lib/business/weekly-cover-visibility"
import { shouldTreatDraftAsLive } from "@/lib/business/live-after-approve"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Badge } from "@/components/business/v2/ui/badge"
import { Button } from "@/components/business/v2/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/business/v2/ui/card"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { TimeField } from "@/components/business/v2/ui/date-time-field"
import { Skeleton } from "@/components/business/v2/ui/skeleton"

/**
 * The per-night override editor (D-F10.2).
 *
 * ONE night becomes Custom here: tickets, hours, or closed, for this date
 * only. Changing the whole series later does not alter that Custom night.
 *
 * WHY THIS IS NOT THE EVENT EDIT PAGE. PUT /business/events/:id and
 * PUT /business/events/:id/tickets stamp series_customized_at. Save night
 * writes door_access_tier_overrides (hours, ticket price/qty, hide, sold_out,
 * sort_order). Ticket rows on this page draft only. Leaving without Save
 * night prompts (beforeunload + in-app confirm). A night that is already
 * Custom EDITS HERE TOO, never a green Event. Only a cancelled night is
 * read-only (nightIsEditable).
 *
 * Hours are always visible. Matching the program window (or Reset to program
 * default) sends null so the night tracks the template. Closed this night is
 * a labeled switch.
 */
export default function DoorAccessNightPage({
  params,
}: {
  params: Promise<{ id: string; date: string }>
}) {
  const { id, date } = use(params)
  const programId = Number(id)
  const router = useRouter()
  const { user, isPending } = useAuth()

  const [program, setProgram] = useState<DoorAccessProgram | null>(null)
  const [night, setNight] = useState<DoorAccessNight | null>(null)
  const [draft, setDraft] = useState<NightDraft | null>(null)
  const [baseline, setBaseline] = useState<NightDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [restampWarning, setRestampWarning] = useState<string | null>(null)
  const [showCancel, setShowCancel] = useState(false)

  const canEdit = user?.business_role === "owner" || user?.business_role === "manager"

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const loaded = await loadDoorAccessNightForPath(programId, date)
      if (loaded.redirectTo != null) {
        router.replace(nightHref(loaded.redirectTo, date))
        return
      }
      if (!loaded.ok || !loaded.program || !loaded.night) {
        setError("Could not load this night.")
        return
      }
      setProgram(loaded.program)
      setNight(loaded.night)
      const next = draftFromNight(loaded.night, loaded.program)
      setDraft(next)
      setBaseline(next)
    } catch {
      setError("Could not load this night.")
    } finally {
      setLoading(false)
    }
  }, [programId, date, router])

  useEffect(() => {
    load()
  }, [load])

  /** Adopt whatever the server says the night is now. Never the local guess. */
  const adopt = (result: { night: DoorAccessNight }) => {
    setNight(result.night)
    if (!program) return
    const next = draftFromNight(result.night, program)
    setDraft(next)
    setBaseline(next)
  }

  const showSaveOutcome = (result: NightOverrideResult, liveNotice: string) => {
    adopt(result)
    const feedback = nightSaveFeedback(result)
    if (feedback.live) {
      setNotice(liveNotice)
      setRestampWarning(null)
    } else {
      setNotice(null)
      setRestampWarning(feedback.message)
    }
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
      const result = await saveNightOverride(
        programId,
        date,
        buildNightSavePayload(draft, { publish: shouldTreatDraftAsLive(isPending) }),
      )
      showSaveOutcome(result, "Saved.")
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
      showSaveOutcome(result, "This night is back on the program's defaults.")
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

  const editable = canEdit && nightIsEditable(night, program)
  const chips = nightChips(night, program.is_active)
  const dirty = !!(draft && baseline && nightDraftIsDirty(draft, baseline))
  const cancelEventId = weeklyCoverNightCancelEventId(night)
  const canCancelNight =
    canEdit &&
    cancelEventId != null &&
    !weeklyCoverNightNeedsPendingCancel(night, program.is_active)

  return (
    <>
      <NightLeaveGuard dirty={dirty} />
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
            <div className="flex items-start gap-2">
              {night.has_override && (
                <Button variant="access-secondary" onClick={handleReset} disabled={saving}>
                  <RotateCcw className="size-4" /> Reset to defaults
                </Button>
              )}
              <div className="flex flex-col items-end">
                <Button variant={ACCESS_BUTTON_VARIANT} onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    "Save night"
                  )}
                </Button>
                {dirty && (
                  <p className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
                    {NIGHT_UNSAVED_TITLE}
                  </p>
                )}
              </div>
            </div>
          ) : undefined
        }
      />

      {/* Why this night can't be edited here. Stated, never a dead form. */}
      {!nightIsEditable(night, program) && (
        <Notice tone="warning">
          {night.status === "cancelled"
            ? "This night is cancelled. Cancelled nights can't be re-priced."
            : !program.is_active && (night.passes_sold > 0 || night.paid_orders > 0)
              ? "Cancellation pending. This night stays until admin refunds complete. It is not live or editable."
              : "This program is no longer active. This night is not live or editable."}
        </Notice>
      )}

      {(night.status === "pending_approval" || isPending) && (
        <Notice tone="warning">
          This night is pending until Bizzy approves your business. It is not live and not selling.
        </Notice>
      )}

      {editable && (
        <Notice tone="info">{NIGHT_CUSTOM_HELPER}</Notice>
      )}

      {editable && night.is_customized && (
        <Notice tone="warning">{NIGHT_CUSTOMIZED_NOTICE}</Notice>
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
      {/* restamp_error / times_only_has_sales: override may be stored, prices are not live. */}
      {restampWarning && !notice && <Notice tone="warning">{restampWarning}</Notice>}
      {notice && !saveError && !restampWarning && <Notice tone="success">{notice}</Notice>}

      {night.passes_sold > 0 && (
        <Notice tone="info">
          {night.passes_sold.toLocaleString("en-US")} pass
          {night.passes_sold === 1 ? " has" : "es have"} already sold for this night. Changing a
          price only affects sales from now on.
        </Notice>
      )}

      <HoursCard draft={draft} setDraft={setDraft} program={program} editable={editable} />

      <NightTicketsEditor
        program={program}
        night={night}
        draft={draft}
        setDraft={setDraft}
        setProgram={setProgram}
        editable={editable}
      />

      {editable && draftHasOverrides(draft) && (
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
          This night differs from the program defaults. Reset a field to follow the program
          again.
        </p>
      )}

      {canCancelNight && cancelEventId != null && (
        <div className="flex justify-end">
          <Button
            variant="secondary"
            className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
            onClick={() => setShowCancel(true)}
          >
            Cancel
          </Button>
        </div>
      )}

      {canCancelNight && cancelEventId != null && (
        <CancelEventModal
          open={showCancel}
          onOpenChange={setShowCancel}
          eventId={cancelEventId}
          eventName={fmtNightDate(night.occurrence_date, { withYear: true })}
          onCancelled={() => {
            setShowCancel(false)
            router.push(programHref(programId))
          }}
        />
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
            <TimeField
              value={toTimeInput(draft.start_time)}
              disabled={!editable}
              onChange={(next) =>
                setDraft(
                  applyNightHours(
                    draft,
                    fromTimeInput(next),
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
            <TimeField
              value={toTimeInput(draft.end_time)}
              disabled={!editable}
              onChange={(next) =>
                setDraft(
                  applyNightHours(
                    draft,
                    draft.start_time,
                    fromTimeInput(next),
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

