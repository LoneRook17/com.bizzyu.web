"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Loader2, Lock, Minus, Plus } from "lucide-react"
import Link from "next/link"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { Button } from "@/components/business/v2/ui/button"
import { Input } from "@/components/business/v2/ui/input"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { cn } from "@/lib/v2/utils"
import {
  NO_TIP_NOTE,
  TIP_PRESETS_MAX,
  TIP_PRESETS_MIN,
  draftFromConfig,
  isTippingDirty,
  presetsOnModeSwitch,
  tippingConnectLock,
  tippingErrorMessage,
  tippingLoadErrorMessage,
  validateTippingDraft,
  type TipPresetMode,
  type TippingConfig,
  type TippingDraft,
  type TippingResponse,
} from "@/lib/business/tipping"

const MODE_OPTIONS: { value: TipPresetMode; label: string; hint: string }[] = [
  { value: "flat", label: "Flat amounts", hint: "Dollar buttons, e.g. $1 · $2 · $5" },
  { value: "percent", label: "Percent", hint: "Of the order total, e.g. 15% · 18% · 20%" },
]

/** Accessible on/off switch in the dashboard's green. */
function Switch({
  checked,
  onChange,
  disabled,
  label,
  description,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  label: string
  description?: string
}) {
  return (
    <label className={cn("flex items-start justify-between gap-4", disabled ? "cursor-not-allowed" : "cursor-pointer")}>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#05EB54]/40",
          checked ? "bg-[#05EB54]" : "bg-neutral-300 dark:bg-neutral-700",
          disabled && "opacity-60"
        )}
      >
        <span
          className={cn(
            "inline-block size-5 transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
    </label>
  )
}

/**
 * Settings → Tipping (Slice 1). Saves businesses.tipping_config via
 * GET/PUT /business/tipping. The door does not read this until Slice 2 —
 * card chrome is provided by the settings page.
 */
export default function TippingSettings({
  disabled,
  onGoToPayments,
  refreshKey,
}: {
  disabled?: boolean
  /**
   * Stripe Connect lock CTA. The Payments tab lives on the same settings page,
   * so the parent switches tabs in place; without it the overlay falls back to
   * a plain link to the same path.
   */
  onGoToPayments?: () => void
  /**
   * Re-read /business/tipping when this changes (e.g. the profile's Connect
   * flag after a Stripe return) so the lock clears without a redeploy or a
   * hard refresh. Every mount reloads anyway.
   */
  refreshKey?: string | number | boolean | null
}) {
  const [saved, setSaved] = useState<TippingConfig | null>(null)
  const [draft, setDraft] = useState<TippingDraft | null>(null)
  const [response, setResponse] = useState<TippingResponse | null>(null)
  const [loadError, setLoadError] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [justSaved, setJustSaved] = useState(false)

  const load = useCallback(async () => {
    setLoadError("")
    try {
      const data = await apiClient.get<TippingResponse>("/business/tipping")
      setResponse(data)
      setSaved(data.tipping)
      setDraft(draftFromConfig(data.tipping))
    } catch (e) {
      setLoadError(tippingLoadErrorMessage(e instanceof ApiError ? e.status : 0))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  // Product lock: no usable Stripe Connect ⇒ the WHOLE section is locked, not
  // just the toggle. The API enforces the same rule (PUT → 409), and the door
  // fails tip money closed — this overlay is the explanation, not the gate.
  const lock = tippingConnectLock(response)

  if (loadError) {
    // A 403 is a role fact, not a failure — the settings page hides this tab
    // for those roles, but if it mounts anyway say so calmly, not in red.
    const calm = loadError === tippingLoadErrorMessage(403)
    return (
      <p className={cn("text-sm", calm ? "text-neutral-500 dark:text-neutral-400" : "text-red-600 dark:text-red-400")}>
        {loadError}
      </p>
    )
  }
  if (!saved || !draft) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-2/3 rounded-md" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-10 w-1/2 rounded-md" />
      </div>
    )
  }

  const validation = validateTippingDraft(draft)
  const dirty = isTippingDirty(saved, draft)
  const canSave = !disabled && !lock.locked && !saving && dirty && validation.config !== null
  const unit = draft.preset_mode === "flat" ? "$" : "%"

  const update = (patch: Partial<TippingDraft>) => {
    setJustSaved(false)
    setError("")
    setDraft((d) => (d ? { ...d, ...patch } : d))
  }

  const setMode = (mode: TipPresetMode) => {
    if (mode === draft.preset_mode) return
    update({ preset_mode: mode, presets: presetsOnModeSwitch(draft.presets, draft.preset_mode, mode) })
  }

  const setPreset = (i: number, value: string) => {
    const presets = [...draft.presets]
    presets[i] = value
    update({ presets })
  }

  const addPreset = () => {
    if (draft.presets.length >= TIP_PRESETS_MAX) return
    update({ presets: [...draft.presets, ""] })
  }

  const removePreset = (i: number) => {
    if (draft.presets.length <= TIP_PRESETS_MIN) return
    update({ presets: draft.presets.filter((_, idx) => idx !== i) })
  }

  const save = async () => {
    if (!canSave || !validation.config) return
    setSaving(true)
    setError("")
    try {
      const res = await apiClient.put<{ tipping: TippingConfig }>("/business/tipping", validation.config)
      setSaved(res.tipping)
      setDraft(draftFromConfig(res.tipping))
      setJustSaved(true)
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0
      const serverMessage = e instanceof ApiError ? String(e.body?.message ?? e.message) : undefined
      setError(tippingErrorMessage(status, serverMessage))
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setDraft(draftFromConfig(saved))
    setError("")
    setJustSaved(false)
  }

  return (
    <div className="relative">
      {lock.locked && (
        <div
          role="region"
          aria-label={lock.title}
          data-testid="tipping-connect-lock"
          className="absolute inset-0 z-10 -m-2 flex items-start justify-center rounded-xl bg-white/85 p-4 backdrop-blur-[2px] dark:bg-neutral-950/85"
        >
          <div className="mt-6 w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                <Lock className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{lock.title}</p>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{lock.body}</p>
                {onGoToPayments ? (
                  <Button type="button" size="sm" className="mt-3" onClick={onGoToPayments}>
                    {lock.cta}
                  </Button>
                ) : (
                  <Button asChild size="sm" className="mt-3">
                    <Link href={lock.setupPath}>{lock.cta}</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    <div className={cn("flex flex-col gap-6", lock.locked && "pointer-events-none select-none opacity-60")} aria-hidden={lock.locked || undefined} {...(lock.locked ? { inert: true } : {})}>
      <Switch
        label="Ask guests for a tip"
        description="When on, the door shows tip buttons before payment. Off means guests are never asked."
        checked={draft.enabled}
        onChange={(enabled) => update({ enabled })}
        disabled={disabled}
      />

      <div className={cn("flex flex-col gap-6", !draft.enabled && "opacity-70")}>
        {/* Mode */}
        <div>
          <p className="mb-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">Preset style</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {MODE_OPTIONS.map((opt) => {
              const active = draft.preset_mode === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => setMode(opt.value)}
                  aria-pressed={active}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#05EB54]/40",
                    active
                      ? "border-[#05EB54] bg-green-50/60 dark:bg-green-950/30"
                      : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/40",
                    disabled && "cursor-not-allowed opacity-60"
                  )}
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {opt.label}
                      {active && <Check className="size-3.5 text-[#05EB54]" />}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-neutral-500 dark:text-neutral-400">{opt.hint}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Presets */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Preset amounts{" "}
              <span className="font-normal text-neutral-500 dark:text-neutral-400">
                ({TIP_PRESETS_MIN}-{TIP_PRESETS_MAX})
              </span>
            </p>
            {draft.presets.length < TIP_PRESETS_MAX && (
              <Button type="button" variant="ghost" size="sm" onClick={addPreset} disabled={disabled}>
                <Plus /> Add preset
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {draft.presets.map((value, i) => {
              const fieldError = validation.presetErrors[i]
              return (
                <div key={i}>
                  <div className="relative">
                    {unit === "$" && (
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-neutral-500">$</span>
                    )}
                    <Input
                      inputMode="decimal"
                      aria-label={`Preset ${i + 1}`}
                      aria-invalid={!!fieldError}
                      value={value}
                      disabled={disabled}
                      onChange={(e) => setPreset(i, e.target.value)}
                      className={cn(
                        unit === "$" ? "pl-7" : "pr-7",
                        draft.presets.length > TIP_PRESETS_MIN && "pr-9",
                        fieldError && "border-red-400 focus-visible:ring-red-300 dark:border-red-700"
                      )}
                    />
                    {unit === "%" && (
                      <span
                        className={cn(
                          "pointer-events-none absolute inset-y-0 flex items-center text-sm text-neutral-500",
                          draft.presets.length > TIP_PRESETS_MIN ? "right-9" : "right-3"
                        )}
                      >
                        %
                      </span>
                    )}
                    {draft.presets.length > TIP_PRESETS_MIN && (
                      <button
                        type="button"
                        aria-label={`Remove preset ${i + 1}`}
                        disabled={disabled}
                        onClick={() => removePreset(i)}
                        className="absolute inset-y-0 right-1 my-auto flex size-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                      >
                        <Minus className="size-4" />
                      </button>
                    )}
                  </div>
                  {fieldError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldError}</p>}
                </div>
              )
            })}
          </div>
          {validation.listError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{validation.listError}</p>}
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{NO_TIP_NOTE}</p>
        </div>

        <Switch
          label="Allow a custom amount"
          description="Adds a “Custom” button so guests can type their own tip."
          checked={draft.allow_custom}
          onChange={(allow_custom) => update({ allow_custom })}
          disabled={disabled}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <Button type="button" onClick={save} disabled={!canSave}>
          {saving ? (
            <>
              <Loader2 className="animate-spin" /> Saving…
            </>
          ) : (
            "Save tipping settings"
          )}
        </Button>
        {dirty && !saving && (
          <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={disabled}>
            Discard changes
          </Button>
        )}
        {justSaved && !dirty && (
          <span className="inline-flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
            <Check className="size-4" /> Saved
          </span>
        )}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {disabled && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Only owners and managers can change tipping settings.</p>
        )}
      </div>
    </div>
    </div>
  )
}
