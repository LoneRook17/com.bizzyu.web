"use client"

import { useCallback, useEffect, useState } from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { Flame, Loader2, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react"
import {
  surgeApi,
  type SurgeLadderView,
  type FireHistory,
} from "@/lib/business/surge"
import {
  validateLadderSteps,
  stepMultiplier,
  fmtCents,
  canConfigureSurge,
  LOUD_MULTIPLIER,
  type SurgeEntityType,
  type StepInput,
} from "@/lib/business/surge-validation"
import {
  SURGE_LABELS,
  UNSAVED_NAV_PROMPT,
  fireDialogCopy,
  isDirty as draftIsDirty,
  needsOffConfirm,
  offConfirmCopy,
  priceLine,
  saveButtonState,
  shouldPromptOnLeave,
  stepsToDraft,
  type DraftStep,
} from "@/lib/business/surge-card-state"
import { cn } from "@/lib/v2/utils"
import { Card, CardContent } from "@/components/business/v2/ui/card"
import { Badge } from "@/components/business/v2/ui/badge"
import { Button } from "@/components/business/v2/ui/button"
import { Input } from "@/components/business/v2/ui/input"
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/business/v2/ui/dialog"

/**
 * Surge card (S3, D10/D11) — the per-item surge configurator, rendered on the
 * event manage page (once per paid tier) and on the line-skip night panel. The
 * engine and the price oracle live in the Node services; this only talks to
 * `/business/surge`.
 *
 * Owner + manager only (D18), and the gate is VISIBILITY, not just failure: a
 * staff session renders nothing at all rather than a card whose every button
 * 403s. Mirrors requireBusinessRole('owner','manager') on all seven services
 * routes.
 *
 * ── The rework ──────────────────────────────────────────────────────────────
 * The card carried two states you could not see — "is my draft saved?" and "is
 * surge live?" — and gave them one shared row of buttons, so "Save ladder" next
 * to "Disable" made you guess which one a click was about to change. They are
 * now separate surfaces with separate answers on screen:
 *
 *   · the SWITCH, top-right, always visible, is the only place surge goes on
 *     or off, and it always states which it is ("Surge: On" / "Surge: Off");
 *   · the DRAFT lifecycle is read-only → "Edit steps" → dirty chip → "Save
 *     changes" / "Discard", and a clean card says "Saved ✓" instead of
 *     offering a button whose effect you cannot predict;
 *   · the PRICE LINE answers the actual question ("what does a customer pay
 *     right now, and why") in one line, derived from the fields the card was
 *     already given.
 *
 * The two irreversible-feeling flips confirm first: turning surge OFF once
 * steps have fired, and saving steps that fire immediately (D7 — semantics
 * unchanged; the dialog only gained the truth about the off case).
 *
 * Everything else is as it was: strictly-increasing validation (D8), the LOUD
 * multiplier badge (D8 mitigation), manual price override (D2), and fire
 * history with surge revenue attribution (D13).
 */

function centsFromDollars(s: string): number {
  const n = Number(s)
  if (!Number.isFinite(n)) return NaN
  return Math.round(n * 100)
}
function draftToInputs(draft: DraftStep[]): StepInput[] {
  return draft.map((d) => ({ threshold_sold: Math.trunc(Number(d.threshold)), price_cents: centsFromDollars(d.price) }))
}
function dollars(cents: number): string {
  return (cents / 100).toFixed(2)
}

export function SurgeCard({
  entityType,
  entityId,
  role,
  label,
  className,
}: {
  entityType: SurgeEntityType
  entityId: number
  role: string | null | undefined
  label?: string
  className?: string
}) {
  const [view, setView] = useState<SurgeLadderView | null>(null)
  const [history, setHistory] = useState<FireHistory | null>(null)
  const [draft, setDraft] = useState<DraftStep[]>([])
  const [saved, setSaved] = useState<DraftStep[]>([]) // last known server truth
  const [editing, setEditing] = useState(false)
  const [baseCents, setBaseCents] = useState<number>(0)
  const [overrideDollars, setOverrideDollars] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmFire, setConfirmFire] = useState<StepInput[] | null>(null)
  const [confirmOff, setConfirmOff] = useState(false)

  const editable = canConfigureSurge(role)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const v = await surgeApi.get(entityType, entityId)
      setView(v)
      const base = v.ladder?.base_price_cents ?? v.entity_default_base_cents ?? 0
      setBaseCents(base)
      const fresh = stepsToDraft(v.steps)
      setDraft(fresh)
      setSaved(fresh)
      setEditing(false) // a fresh load is, by definition, not a draft in progress
      setOverrideDollars(v.ladder?.manual_override_cents != null ? dollars(v.ladder.manual_override_cents) : "")
      if (v.ladder) {
        try {
          setHistory(await surgeApi.history(v.ladder.id))
        } catch {
          setHistory(null)
        }
      } else {
        setHistory(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load surge settings")
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    if (!editable) return // never fire the fetch for a role the server would 403
    void load()
  }, [load, editable])

  const dirty = draftIsDirty(draft, saved)
  const guard = shouldPromptOnLeave(dirty, editing)

  /**
   * Leaving with an unsaved draft prompts. Two exits to cover, because the
   * dashboard is a single-page app: a real browser navigation (reload, close,
   * external link) via beforeunload, and an in-app link click, which never
   * touches beforeunload — caught on the capture phase so the router never
   * sees the click if the operator backs out.
   */
  useEffect(() => {
    if (!guard) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = UNSAVED_NAV_PROMPT
      return UNSAVED_NAV_PROMPT
    }
    const onClickCapture = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null
      if (!anchor || anchor.target === "_blank") return
      const href = anchor.getAttribute("href") ?? ""
      if (href.startsWith("#")) return
      if (window.confirm(UNSAVED_NAV_PROMPT)) return
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    document.addEventListener("click", onClickCapture, true)
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      document.removeEventListener("click", onClickCapture, true)
    }
  }, [guard])

  // D18: a non-owner/manager never sees this surface at all.
  if (!editable) return null

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="h-5 w-40 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
          <div className="mt-3 h-16 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
        </CardContent>
      </Card>
    )
  }

  const inputs = draftToInputs(draft)
  const validationError = editing ? validateLadderSteps(baseCents, inputs) : null
  const ladder = view?.ladder ?? null
  const isActive = Boolean(ladder?.is_active)
  const serverSteps = view?.steps ?? []

  const price = priceLine({
    hasLadder: Boolean(ladder),
    isActive,
    baseCents,
    overrideCents: ladder?.manual_override_cents ?? null,
    steps: serverSteps,
    serverPriceCents: view?.current_price_cents ?? null,
  })
  const saveBtn = saveButtonState({ dirty, validationError, busy })

  const addStep = () => setDraft((d) => [...d, { threshold: "", price: "" }])
  const removeStep = (i: number) => setDraft((d) => d.filter((_, idx) => idx !== i))
  const setStep = (i: number, key: keyof DraftStep, val: string) =>
    setDraft((d) => d.map((s, idx) => (idx === i ? { ...s, [key]: val } : s)))
  const discard = () => {
    setDraft(saved)
    setEditing(false)
    setError(null)
  }

  async function save(confirm = false) {
    if (validationError) return
    setBusy(true)
    setError(null)
    try {
      if (!ladder) {
        await surgeApi.createLadder(entityType, entityId, { base_price_cents: baseCents, steps: inputs })
        setConfirmFire(null)
        await load()
      } else {
        const r = await surgeApi.saveSteps(ladder.id, inputs, confirm)
        if (r.requiresConfirmation) {
          setConfirmFire(r.preview.already_passed_steps)
          return
        }
        setConfirmFire(null)
        await load()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setBusy(false)
    }
  }

  async function applyOverride(clear = false) {
    if (!ladder) return
    setBusy(true)
    setError(null)
    try {
      const cents = clear ? null : centsFromDollars(overrideDollars)
      if (cents !== null && (!Number.isInteger(cents) || cents < 0)) {
        setError("Override must be a valid dollar amount")
        return
      }
      await surgeApi.setOverride(ladder.id, cents)
      if (clear) setOverrideDollars("")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Override failed")
    } finally {
      setBusy(false)
    }
  }

  /** The switch's only job. Off-with-fired routes through the confirm first. */
  async function setActive(next: boolean) {
    if (!ladder) return
    if (needsOffConfirm(next, serverSteps)) {
      setConfirmOff(true)
      return
    }
    setConfirmOff(false)
    setBusy(true)
    try {
      await surgeApi.setActive(ladder.id, next)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Toggle failed")
    } finally {
      setBusy(false)
    }
  }

  async function confirmTurnOff() {
    if (!ladder) return
    setConfirmOff(false)
    setBusy(true)
    try {
      await surgeApi.setActive(ladder.id, false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Toggle failed")
    } finally {
      setBusy(false)
    }
  }

  // The loudest thing on the card: the largest jump the operator has typed.
  const peakMultiplier = inputs.reduce((max, s) => {
    const m = Number.isFinite(s.price_cents) ? stepMultiplier(baseCents, s.price_cents) : 0
    return m > max ? m : max
  }, 0)
  const offCopy = offConfirmCopy(baseCents)
  const fireCopy = fireDialogCopy(isActive, baseCents)

  return (
    <>
      <Card className={className}>
        <CardContent className="p-4">
          {/* Header: what this is, and the one control that decides whether it
              is live. The switch sits apart from every draft control on the
              card precisely because it is not part of the draft. */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Flame className="size-4 shrink-0 text-[#05EB54]" />
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Surge pricing{label ? ` — ${label}` : ""}
                </h3>
              </div>
              <p className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
                The price steps up automatically as passes sell. It never drops on its own.
              </p>
            </div>
            <SurgeSwitch
              checked={isActive}
              disabled={busy || !ladder}
              busy={busy}
              hint={!ladder ? "Save your first step to turn surge on" : undefined}
              onChange={(v) => void setActive(v)}
            />
          </div>

          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}

          {/* The question the operator actually came here with. */}
          <div className="mt-3 flex flex-wrap items-end justify-between gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900/60">
            <div className="min-w-0">
              <div className="text-[13px] text-neutral-500 dark:text-neutral-400">Customers pay</div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {fmtCents(price.amountCents)}
                </span>
                <span className="text-[13px] text-neutral-500 dark:text-neutral-400">{price.reason}</span>
              </div>
            </div>
            <div className="text-right text-[13px] text-neutral-500 dark:text-neutral-400">
              <div>Base {fmtCents(baseCents)}</div>
              {view?.current_sold_count != null && <div>{view.current_sold_count} sold</div>}
            </div>
          </div>

          {/* ── Steps: read-only by default, explicit edit mode ─────────── */}
          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">Steps</span>
              {editing && dirty && (
                <Badge variant="warning" size="sm">{SURGE_LABELS.dirtyChip}</Badge>
              )}
            </div>
            {!editing && (
              <Button onClick={() => setEditing(true)} disabled={busy} variant="secondary" size="sm">
                <Pencil className="size-3.5" /> {SURGE_LABELS.editSteps}
              </Button>
            )}
          </div>

          {editing ? (
            <>
              <div className="mt-2 space-y-2">
                {draft.map((s, i) => {
                  const cents = centsFromDollars(s.price)
                  const mult = Number.isFinite(cents) ? stepMultiplier(baseCents, cents) : 0
                  const loud = mult >= LOUD_MULTIPLIER
                  const fired = serverSteps[i]?.fired_at != null
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2",
                        loud
                          ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
                          : "border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60",
                      )}
                    >
                      <span className="text-[13px] text-neutral-500 dark:text-neutral-400">When</span>
                      <Input
                        type="number" min={1} value={s.threshold}
                        onChange={(e) => setStep(i, "threshold", e.target.value)}
                        className="w-20" placeholder="N" aria-label={`Step ${i + 1} threshold`}
                      />
                      <span className="text-[13px] text-neutral-500 dark:text-neutral-400">sold → charge $</span>
                      <Input
                        type="number" min="0" step="0.01" value={s.price}
                        onChange={(e) => setStep(i, "price", e.target.value)}
                        className="w-24" placeholder="0.00" aria-label={`Step ${i + 1} price`}
                      />
                      {mult > 0 && (
                        <Badge variant={loud ? "warning" : "neutral"} size="sm">
                          {loud && <TriangleAlert className="mr-1 inline size-3" />}
                          {mult}×
                        </Badge>
                      )}
                      {fired && <Badge variant="success" size="sm">Fired</Badge>}
                      <button
                        onClick={() => removeStep(i)} type="button"
                        aria-label={`${SURGE_LABELS.removeStep} ${i + 1}`}
                        title={SURGE_LABELS.removeStep}
                        className="ml-auto text-neutral-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  )
                })}
              </div>

              <button
                onClick={addStep} type="button"
                className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[#05EB54] hover:underline"
              >
                <Plus className="size-3.5" /> {SURGE_LABELS.addStep}
              </button>

              {/* LOUD multiplier warning (D8). The per-step badge above marks
                  WHICH row is extreme; this states the consequence in words,
                  because a small "10×" chip is easy to skim past when you are
                  about to multiply what every remaining buyer pays. */}
              {peakMultiplier >= LOUD_MULTIPLIER && !validationError && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/40">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="text-[13px] text-amber-800 dark:text-amber-300">
                    <span className="font-semibold">That is a {peakMultiplier}× price increase.</span>{" "}
                    At the top step a buyer pays {fmtCents(Math.max(...inputs.map((s) => s.price_cents)))} instead of{" "}
                    {fmtCents(baseCents)}. Double-check the decimal point before saving.
                  </div>
                </div>
              )}

              {validationError && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                  {validationError}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button onClick={() => save(false)} disabled={saveBtn.disabled} size="sm">
                  {busy && <Loader2 className="size-3.5 animate-spin" />} {saveBtn.label}
                </Button>
                <Button onClick={discard} disabled={busy} variant="secondary" size="sm">
                  {SURGE_LABELS.discard}
                </Button>
                {dirty && !isActive && (
                  <span className="text-[13px] text-neutral-500 dark:text-neutral-400">
                    Surge is off — saving stores the ladder without changing what customers pay.
                  </span>
                )}
              </div>
            </>
          ) : (
            <ReadOnlySteps steps={serverSteps} baseCents={baseCents} />
          )}

          {/* Manual override (D2) */}
          {ladder && (
            <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
              <div className="text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">{SURGE_LABELS.override}</div>
              <p className="mt-0.5 mb-2 text-[13px] text-neutral-500 dark:text-neutral-400">
                Set any price now — the only way to go below a step that already fired. Persists until you clear it.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] text-neutral-500 dark:text-neutral-400">$</span>
                <Input
                  type="number" min="0" step="0.01" value={overrideDollars}
                  onChange={(e) => setOverrideDollars(e.target.value)}
                  className="w-28" placeholder="e.g. 12.00" aria-label="Override price"
                />
                <Button onClick={() => applyOverride(false)} disabled={busy} variant="secondary" size="sm">{SURGE_LABELS.set}</Button>
                {ladder.manual_override_cents != null && (
                  <button
                    onClick={() => applyOverride(true)} disabled={busy} type="button"
                    className="text-[13px] font-medium text-red-600 hover:underline dark:text-red-400"
                  >
                    {SURGE_LABELS.clearOverride}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Fire history + revenue attribution (D13) */}
          {history && history.fired_steps.length > 0 && (
            <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
              <div className="mb-2 text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">{SURGE_LABELS.fireHistory}</div>
              <ul className="space-y-1.5">
                {history.fired_steps.map((f) => (
                  <li key={f.step_index} className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                    <span className="text-neutral-600 dark:text-neutral-400">
                      {f.threshold_sold} sold → {fmtCents(f.price_cents)}
                      {f.fired_at ? ` · ${f.fired_at}` : ""}
                      {f.fired_source ? ` · ${f.fired_source}` : ""}
                    </span>
                    <span className="font-medium text-green-700 dark:text-green-400">
                      +{fmtCents(f.surge_over_base_cents)} over base
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Turning surge off after steps have fired changes what the next buyer
          is charged, so it asks first — and says what the new price will be
          rather than leaving the operator to work it out. */}
      <Dialog open={confirmOff} onOpenChange={(o) => !o && setConfirmOff(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{offCopy.title}</DialogTitle>
            <DialogDescription>{offCopy.body}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOff(false)} disabled={busy}>{SURGE_LABELS.keepOn}</Button>
            <Button variant="danger" onClick={() => void confirmTurnOff()} disabled={busy}>{SURGE_LABELS.turnOff}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fire-on-save confirmation dialog (D7). These steps are already at or
          below the current sold count, so saving fires them IMMEDIATELY. Never
          save straight through. Semantics are unchanged by the rework; with the
          ladder off the dialog now also says what off actually means. */}
      <Dialog open={confirmFire !== null} onOpenChange={(o) => !o && setConfirmFire(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{fireCopy.title}</DialogTitle>
            <DialogDescription>{fireCopy.body}</DialogDescription>
          </DialogHeader>
          {fireCopy.offNote && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[13px] text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-300">
              {fireCopy.offNote}
            </div>
          )}
          <ul className="space-y-1.5">
            {(confirmFire ?? []).map((s, i) => {
              const m = stepMultiplier(baseCents, s.price_cents)
              return (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                >
                  <span>{s.threshold_sold} sold → {fmtCents(s.price_cents)}</span>
                  <Badge variant="warning" size="sm">
                    {m >= LOUD_MULTIPLIER && <TriangleAlert className="mr-1 inline size-3" />}
                    {m}×
                  </Badge>
                </li>
              )
            })}
          </ul>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmFire(null)} disabled={busy}>{SURGE_LABELS.cancel}</Button>
            <Button onClick={() => save(true)} disabled={busy}>{SURGE_LABELS.fireAndSave}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * The status switch. Always visible, always labelled with the state it is in —
 * the old Enable/Disable pair named the ACTION, which reads as the current
 * state to anyone scanning ("Disable" looked like "this is disabled").
 */
function SurgeSwitch({
  checked, disabled, busy, hint, onChange,
}: {
  checked: boolean
  disabled?: boolean
  busy?: boolean
  hint?: string
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-[13px] font-semibold",
            checked ? "text-green-700 dark:text-green-400" : "text-neutral-500 dark:text-neutral-400",
          )}
        >
          {checked ? SURGE_LABELS.switchOn : SURGE_LABELS.switchOff}
        </span>
        <SwitchPrimitive.Root
          checked={checked}
          disabled={disabled}
          onCheckedChange={onChange}
          aria-label={SURGE_LABELS.switchName}
          className={cn(
            "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#05EB54] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
            checked ? "bg-[#05EB54]" : "bg-neutral-200 dark:bg-neutral-700",
          )}
        >
          <SwitchPrimitive.Thumb
            className={cn(
              "pointer-events-none block size-4 rounded-full bg-white shadow-sm ring-0 transition-transform",
              checked ? "translate-x-4" : "translate-x-0",
            )}
          />
        </SwitchPrimitive.Root>
        {busy && <Loader2 className="size-3.5 animate-spin text-neutral-400" aria-hidden />}
      </div>
      {hint && <span className="text-[11px] text-neutral-400 dark:text-neutral-500">{hint}</span>}
    </div>
  )
}

/** The default face of the card: the saved ladder, stated, with nothing on it
 *  that can be changed by accident. */
function ReadOnlySteps({ steps, baseCents }: { steps: Array<{ threshold_sold: number; price_cents: number; fired_at?: string | null }>; baseCents: number }) {
  if (steps.length === 0) {
    return (
      <p className="mt-2 rounded-lg border border-dashed border-neutral-200 px-3 py-3 text-[13px] text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
        No surge steps yet. {SURGE_LABELS.editSteps} to add the first one — customers pay {fmtCents(baseCents)} until a step fires.
      </p>
    )
  }
  return (
    <ul className="mt-2 space-y-1.5">
      {steps.map((s, i) => {
        const mult = stepMultiplier(baseCents, s.price_cents)
        return (
          <li
            key={i}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[13px] dark:border-neutral-800 dark:bg-neutral-900/60"
          >
            <span className="text-neutral-600 dark:text-neutral-300">
              When <span className="font-medium text-neutral-900 dark:text-neutral-100">{s.threshold_sold}</span> sold →{" "}
              <span className="font-medium text-neutral-900 dark:text-neutral-100">{fmtCents(s.price_cents)}</span>
            </span>
            {mult > 0 && (
              <Badge variant={mult >= LOUD_MULTIPLIER ? "warning" : "neutral"} size="sm">
                {mult >= LOUD_MULTIPLIER && <TriangleAlert className="mr-1 inline size-3" />}
                {mult}×
              </Badge>
            )}
            {s.fired_at ? (
              <Badge variant="success" size="sm">Fired</Badge>
            ) : (
              <span className="text-neutral-400 dark:text-neutral-500">not fired yet</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default SurgeCard
