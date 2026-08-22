"use client"

import { use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, Loader2, RotateCcw, Zap } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import {
  buildNightOverridePayload,
  clearNightOverride,
  draftFromNight,
  draftHasOverrides,
  fetchDoorAccessNight,
  fmtNightDate,
  fmtQuantity,
  fmtWindow,
  nightChips,
  nightIsEditable,
  programHref,
  saveNightOverride,
  WEEKLY_ACCESS_SECTION_LABEL,
  usdPrice,
  validateNightDraft,
  type DoorAccessNight,
  type DoorAccessProgram,
  type NightDraft,
} from "@/lib/business/door-access"
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
 * ONE night departs from the program template here — price, capacity, hours,
 * or closed entirely — without restating the program and without evicting the
 * night from series-wide edits.
 *
 * WHY THIS IS NOT THE EVENT EDIT PAGE. PUT /business/events/:id stamps
 * series_customized_at, which permanently detaches the night from the program:
 * it stops receiving template updates forever. That is the opposite of what
 * "$40 on New Year's Eve" means, so per-night money runs through the
 * override endpoints instead, and a night that HAS been customized elsewhere
 * is read-only here (nightIsEditable) rather than silently written to.
 *
 * INHERIT IS A REAL STATE, not "same value as the template". Every field can
 * be pinned or released, and releasing sends null so the night tracks the
 * template again the next time it moves. Rendering a released field as the
 * template's current number and saving that would freeze the night at today's
 * price — the bug this whole draft model exists to prevent.
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

  /** Adopt whatever the server says the night is now — never the local guess. */
  const adopt = (result: { night: DoorAccessNight; restamp_error: string | null }) => {
    setNight(result.night)
    if (program) setDraft(draftFromNight(result.night, program))
    setRestampWarning(result.restamp_error)
  }

  const handleSave = async () => {
    if (!draft) return
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
      const result = await saveNightOverride(programId, date, buildNightOverridePayload(draft))
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
                <Button variant="secondary" onClick={handleReset} disabled={saving}>
                  <RotateCcw className="size-4" /> Reset to defaults
                </Button>
              )}
              <Button onClick={handleSave} disabled={saving}>
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

      {/* Why this night can't be edited here — stated, never a dead form. */}
      {!nightIsEditable(night) && (
        <Notice tone="warning">
          {night.status === "cancelled"
            ? "This night is cancelled. Cancelled nights can't be re-priced."
            : "This night was edited directly as an event, so it no longer follows the program. Change it on its event page — edits made here wouldn't show up there."}
        </Notice>
      )}

      {/* Unstamped is not an error state — overrides key off the DATE, which is
          what lets a host price a holiday weeks before the night exists. */}
      {editable && !night.is_stamped && (
        <Notice tone="info">
          This night hasn&apos;t been generated yet. You can still price it — the settings apply
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

      <TiersCard draft={draft} setDraft={setDraft} night={night} editable={editable} />

      {editable && draftHasOverrides(draft) && (
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
          This night differs from the program defaults. Anything set to{" "}
          <span className="font-medium">Use default</span> keeps following the program.
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

/** Inherit ⇄ override switch. The same control for every field, so "Use default" always means null. */
function InheritToggle({
  inheriting,
  onChange,
  disabled,
}: {
  inheriting: boolean
  onChange: (inherit: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant={inheriting ? "subtle" : "ghost"}
        onClick={() => onChange(true)}
        disabled={disabled}
      >
        Use default
      </Button>
      <Button
        size="sm"
        variant={!inheriting ? "subtle" : "ghost"}
        onClick={() => onChange(false)}
        disabled={disabled}
      >
        Override
      </Button>
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
          <InheritToggle
            inheriting={draft.inherit_times}
            onChange={(inherit) => setDraft({ ...draft, inherit_times: inherit })}
            disabled={!editable}
          />
        </div>

        {!draft.inherit_times && (
          <div className="grid gap-3 sm:grid-cols-2 sm:max-w-md">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
                Opens
              </span>
              <Input
                type="time"
                value={draft.start_time.slice(0, 5)}
                disabled={!editable}
                onChange={(e) => setDraft({ ...draft, start_time: `${e.target.value}:00` })}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
                Closes
              </span>
              <Input
                type="time"
                value={draft.end_time.slice(0, 5)}
                disabled={!editable}
                onChange={(e) => setDraft({ ...draft, end_time: `${e.target.value}:00` })}
              />
            </label>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <div>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">Closed this night</p>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
              Stops sales for this date only. The rest of the program keeps running.
            </p>
          </div>
          <Button
            size="sm"
            variant={draft.is_closed ? "danger" : "secondary"}
            disabled={!editable}
            onClick={() => setDraft({ ...draft, is_closed: !draft.is_closed })}
          >
            {draft.is_closed ? "Closed" : "Open"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function TiersCard({
  draft,
  setDraft,
  night,
  editable,
}: {
  draft: NightDraft
  setDraft: (d: NightDraft) => void
  night: DoorAccessNight
  editable: boolean
}) {
  const patch = (index: number, next: Partial<NightDraft["tiers"][number]>) => {
    const tiers = draft.tiers.map((tier, i) => (i === index ? { ...tier, ...next } : tier))
    setDraft({ ...draft, tiers })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tiers this night</CardTitle>
        <span className="text-[13px] text-neutral-500 dark:text-neutral-400">
          Program defaults unless overridden
        </span>
      </CardHeader>
      <CardContent className="pt-0">
        {draft.tiers.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            This program has no tiers.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {draft.tiers.map((tier, index) => {
              const source = night.tiers.find((t) => t.tier_key === tier.tier_key)
              return (
                <div key={tier.tier_key} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {source?.name || tier.tier_key}
                      </p>
                      <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                        Default {usdPrice(source?.template_price_usd ?? null)} ·{" "}
                        {fmtQuantity(source?.template_quantity ?? 0)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={tier.is_disabled ? "danger" : "secondary"}
                      disabled={!editable}
                      onClick={() => patch(index, { is_disabled: !tier.is_disabled })}
                    >
                      {tier.is_disabled ? "Off tonight" : "On sale"}
                    </Button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FieldOverride
                      label="Price"
                      inheriting={tier.inherit_price}
                      onInherit={(inherit) => patch(index, { inherit_price: inherit })}
                      editable={editable && !tier.is_disabled}
                    >
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={tier.price_usd ?? ""}
                        disabled={!editable || tier.is_disabled}
                        onChange={(e) =>
                          patch(index, {
                            price_usd: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    </FieldOverride>

                    <FieldOverride
                      label="Capacity"
                      hint="0 = unlimited"
                      inheriting={tier.inherit_quantity}
                      onInherit={(inherit) => patch(index, { inherit_quantity: inherit })}
                      editable={editable && !tier.is_disabled}
                    >
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        value={tier.quantity ?? ""}
                        disabled={!editable || tier.is_disabled}
                        onChange={(e) =>
                          patch(index, {
                            quantity: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    </FieldOverride>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function FieldOverride({
  label,
  hint,
  inheriting,
  onInherit,
  editable,
  children,
}: {
  label: string
  hint?: string
  inheriting: boolean
  onInherit: (inherit: boolean) => void
  editable: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
          {label}
          {hint && (
            <span className="ml-1.5 font-normal text-neutral-400 dark:text-neutral-500">{hint}</span>
          )}
        </span>
        <InheritToggle inheriting={inheriting} onChange={onInherit} disabled={!editable} />
      </div>
      {!inheriting && children}
    </div>
  )
}
