"use client"

import { useCallback, useEffect, useState } from "react"
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
  type SurgeEntityType,
  type StepInput,
} from "@/lib/business/surge-validation"

/**
 * Surge card (S3, D10/D11) — the per-item surge configurator on the event page
 * and the line-skip-night page. Owner + manager only (D18); the engine + oracle
 * live in the Node services (this only talks to `/business/surge`).
 *
 * Covers: ladder editor with strictly-increasing validation (D8), a LOUD
 * multiplier preview so a fat-fingered "$10 → $100" is obvious (D8 mitigation),
 * live-edit with the fire-on-save confirmation dialog (D7), manual price
 * override (D2), and the fire history + surge revenue attribution (D13).
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
}: {
  entityType: SurgeEntityType
  entityId: number
  role: string | null | undefined
  label?: string
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
    void load()
  }, [load])

  if (!editable) return null // D18: staff never see the configurator
  if (loading) return <div className="rounded-lg border p-4 text-sm text-gray-500">Loading surge…</div>

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
        const v = await surgeApi.createLadder(entityType, entityId, { base_price_cents: baseCents, steps: inputs })
        setView(v)
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

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Surge Pricing{label ? ` — ${label}` : ""}</h3>
          <p className="text-xs text-gray-500">The price steps up automatically as passes sell. Never drops on its own.</p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-gray-400">Current price</div>
          <div className="text-lg font-bold text-gray-900">{fmtCents(currentPrice ?? baseCents)}</div>
          {view?.current_sold_count != null && <div className="text-xs text-gray-500">{view.current_sold_count} sold</div>}
        </div>
      </header>

      {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-gray-600">Base price</span>
        <span className="font-medium">{fmtCents(baseCents)}</span>
      </div>

      {/* Ladder editor */}
      <div className="space-y-2">
        {draft.map((s, i) => {
          const cents = centsFromDollars(s.price)
          const mult = Number.isFinite(cents) ? stepMultiplier(baseCents, cents) : 0
          const loud = mult >= 3
          const fired = view?.steps?.[i]?.fired_at != null
          return (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
              <span className="text-sm text-gray-500">When</span>
              <input
                type="number" min={1} value={s.threshold} onChange={(e) => setStep(i, "threshold", e.target.value)}
                className="w-20 rounded border px-2 py-1 text-sm" placeholder="N" aria-label={`Step ${i + 1} threshold`}
              />
              <span className="text-sm text-gray-500">sold → charge $</span>
              <input
                type="number" min="0" step="0.01" value={s.price} onChange={(e) => setStep(i, "price", e.target.value)}
                className="w-24 rounded border px-2 py-1 text-sm" placeholder="0.00" aria-label={`Step ${i + 1} price`}
              />
              <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${loud ? "bg-amber-100 text-amber-800" : "text-gray-400"}`}>
                {mult > 0 ? `${mult}×` : ""}{loud ? " ⚠" : ""}
              </span>
              {fired && <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">fired</span>}
              <button onClick={() => removeStep(i)} className="ml-auto text-xs text-red-500 hover:underline" type="button">remove</button>
            </div>
          )
        })}
      </div>

      <button onClick={addStep} type="button" className="mt-2 text-sm font-medium text-blue-600 hover:underline">+ Add step</button>

      {validationError && <div className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{validationError}</div>}

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => save(false)} disabled={busy || !!validationError} type="button"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {ladder ? "Save ladder" : "Create ladder"}
        </button>
        {ladder && (
          <button onClick={toggleActive} disabled={busy} type="button" className="rounded-md border px-3 py-2 text-sm">
            {ladder.is_active ? "Disable" : "Enable"}
          </button>
        )}
      </div>

      {/* Manual override (D2) */}
      {ladder && (
        <div className="mt-4 border-t pt-4">
          <div className="mb-1 text-sm font-medium text-gray-700">Manual price override</div>
          <p className="mb-2 text-xs text-gray-500">Set any price now — the only way to lower below a fired step. Persists until you clear it.</p>
          <div className="flex items-center gap-2">
            <span className="text-sm">$</span>
            <input
              type="number" min="0" step="0.01" value={overrideDollars} onChange={(e) => setOverrideDollars(e.target.value)}
              className="w-28 rounded border px-2 py-1 text-sm" placeholder="e.g. 12.00" aria-label="Override price"
            />
            <button onClick={() => applyOverride(false)} disabled={busy} type="button" className="rounded-md border px-3 py-1.5 text-sm">Set</button>
            {ladder.manual_override_cents != null && (
              <button onClick={() => applyOverride(true)} disabled={busy} type="button" className="text-sm text-red-500 hover:underline">Clear</button>
            )}
          </div>
        </div>
      )}

      {/* Fire history + revenue attribution (D13) */}
      {history && history.fired_steps.length > 0 && (
        <div className="mt-4 border-t pt-4">
          <div className="mb-2 text-sm font-medium text-gray-700">Fire history</div>
          <ul className="space-y-1 text-sm">
            {history.fired_steps.map((f) => (
              <li key={f.step_index} className="flex items-center justify-between">
                <span className="text-gray-600">
                  Step at {f.threshold_sold} sold → {fmtCents(f.price_cents)}
                  {f.fired_at ? ` · fired ${f.fired_at}` : ""}
                </span>
                <span className="font-medium text-green-700">+{fmtCents(f.surge_over_base_cents)} over base</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fire-on-save confirmation dialog (D7) */}
      {confirmFire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h4 className="text-base font-semibold text-gray-900">Fire steps now?</h4>
            <p className="mt-2 text-sm text-gray-600">
              These step(s) are already at or below the current sold count and will fire <strong>immediately</strong> on save — the price jumps right away:
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {confirmFire.map((s, i) => (
                <li key={i} className="rounded bg-amber-50 px-2 py-1 text-amber-800">
                  When {s.threshold_sold} sold → {fmtCents(s.price_cents)} ({stepMultiplier(baseCents, s.price_cents)}×)
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirmFire(null)} type="button" className="rounded-md border px-3 py-2 text-sm">Cancel</button>
              <button onClick={() => save(true)} disabled={busy} type="button" className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Fire &amp; save</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default SurgeCard
