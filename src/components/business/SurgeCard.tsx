"use client"

import { useCallback, useEffect, useState } from "react"
import { Flame, Plus, Trash2, TriangleAlert } from "lucide-react"
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
 * Covers: the ladder editor with strictly-increasing validation (D8), a LOUD
 * multiplier badge so a fat-fingered "$10 → $100" is impossible to miss (D8
 * mitigation), live edit with the fire-on-save confirmation dialog (D7), manual
 * price override (D2), and fire history + surge revenue attribution (D13).
 *
 * Styling follows the v2 dashboard system (Card/Button/Badge/Input/Dialog,
 * neutral palette, dark-mode pairs) because it renders INSIDE those pages —
 * the earlier standalone styling read as a foreign element bolted on.
 */

type DraftStep = { threshold: string; price: string } // dollars, as typed

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
  const [baseCents, setBaseCents] = useState<number>(0)
  const [overrideDollars, setOverrideDollars] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmFire, setConfirmFire] = useState<StepInput[] | null>(null)

  const editable = canConfigureSurge(role)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const v = await surgeApi.get(entityType, entityId)
      setView(v)
      const base = v.ladder?.base_price_cents ?? v.entity_default_base_cents ?? 0
      setBaseCents(base)
      setDraft(
        (v.steps ?? []).map((s) => ({ threshold: String(s.threshold_sold), price: dollars(s.price_cents) })),
      )
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
  const validationError = validateLadderSteps(baseCents, inputs)
  const ladder = view?.ladder ?? null
  const currentPrice = view?.current_price_cents ?? null

  const addStep = () => setDraft((d) => [...d, { threshold: "", price: "" }])
  const removeStep = (i: number) => setDraft((d) => d.filter((_, idx) => idx !== i))
  const setStep = (i: number, key: keyof DraftStep, val: string) =>
    setDraft((d) => d.map((s, idx) => (idx === i ? { ...s, [key]: val } : s)))

  async function save(confirm = false) {
    if (validationError) return
    setBusy(true)
    setError(null)
    try {
      if (!ladder) {
        await surgeApi.createLadder(entityType, entityId, { base_price_cents: baseCents, steps: inputs })
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

  async function toggleActive() {
    if (!ladder) return
    setBusy(true)
    try {
      await surgeApi.setActive(ladder.id, !ladder.is_active)
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

  return (
    <>
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Flame className="size-4 shrink-0 text-[#05EB54]" />
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Surge pricing{label ? ` — ${label}` : ""}
                </h3>
                {ladder && (
                  <Badge variant={ladder.is_active ? "success" : "neutral"} size="sm">
                    {ladder.is_active ? "Active" : "Disabled"}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
                The price steps up automatically as passes sell. It never drops on its own.
              </p>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Current price</div>
              <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{fmtCents(currentPrice ?? baseCents)}</div>
              {view?.current_sold_count != null && (
                <div className="text-[13px] text-neutral-500 dark:text-neutral-400">{view.current_sold_count} sold</div>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3 text-[13px] dark:border-neutral-800">
            <span className="text-neutral-500 dark:text-neutral-400">Base price</span>
            <span className="font-medium text-neutral-900 dark:text-neutral-100">{fmtCents(baseCents)}</span>
          </div>

          {/* Ladder editor */}
          <div className="mt-3 space-y-2">
            {draft.map((s, i) => {
              const cents = centsFromDollars(s.price)
              const mult = Number.isFinite(cents) ? stepMultiplier(baseCents, cents) : 0
              const loud = mult >= LOUD_MULTIPLIER
              const fired = view?.steps?.[i]?.fired_at != null
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
                    aria-label={`Remove step ${i + 1}`}
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
            <Plus className="size-3.5" /> Add step
          </button>

          {/* LOUD multiplier warning (D8). The per-step badge above marks WHICH
              row is extreme; this states the consequence in words, because a
              small "10×" chip is easy to skim past when you are about to
              multiply what every remaining buyer pays. */}
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
            <Button onClick={() => save(false)} disabled={busy || !!validationError} size="sm">
              {ladder ? "Save ladder" : "Create ladder"}
            </Button>
            {ladder && (
              <Button onClick={toggleActive} disabled={busy} variant="secondary" size="sm">
                {ladder.is_active ? "Disable" : "Enable"}
              </Button>
            )}
          </div>

          {/* Manual override (D2) */}
          {ladder && (
            <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
              <div className="text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">Manual price override</div>
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
                <Button onClick={() => applyOverride(false)} disabled={busy} variant="secondary" size="sm">Set</Button>
                {ladder.manual_override_cents != null && (
                  <button
                    onClick={() => applyOverride(true)} disabled={busy} type="button"
                    className="text-[13px] font-medium text-red-600 hover:underline dark:text-red-400"
                  >
                    Clear override
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Fire history + revenue attribution (D13) */}
          {history && history.fired_steps.length > 0 && (
            <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
              <div className="mb-2 text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">Fire history</div>
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

      {/* Fire-on-save confirmation dialog (D7). These steps are already at or
          below the current sold count, so saving fires them IMMEDIATELY — the
          price jumps for the next buyer. Never save straight through. */}
      <Dialog open={confirmFire !== null} onOpenChange={(o) => !o && setConfirmFire(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fire these steps now?</DialogTitle>
            <DialogDescription>
              These step(s) are already at or below the current sold count and will fire{" "}
              <strong>immediately</strong> on save — the price jumps right away for the next buyer.
            </DialogDescription>
          </DialogHeader>
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
            <Button variant="secondary" onClick={() => setConfirmFire(null)} disabled={busy}>Cancel</Button>
            <Button onClick={() => save(true)} disabled={busy}>Fire &amp; save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default SurgeCard
