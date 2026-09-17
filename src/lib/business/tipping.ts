// Tipping Slice 1 — pure logic for Settings → Tipping. Dependency-free so it
// runs under the repo's `node --test` convention (anything a test imports must
// stay .ts, no JSX).
//
// Server contract (services `feat/tipping-slice1-settings`, PR #166):
//   GET /business/tipping  → 200 { tipping: TippingConfig, configured: boolean }
//   PUT /business/tipping  { enabled, preset_mode, presets, allow_custom } (ALL required)
//     200 { message, tipping, configured: true }
//     400 validation (message is safe to show verbatim)
//     403 not owner/manager
//     503 migration 035 not applied on this environment yet
// Validation below mirrors the server exactly so a draft that passes here does
// not bounce; the server remains the authority.

export type BusinessRole = "owner" | "manager" | "staff" | "promoter"
export type TipPresetMode = "flat" | "percent"

export interface TippingConfig {
  enabled: boolean
  preset_mode: TipPresetMode
  /** 3–4 values. Dollars (≤2dp) when flat, whole percentages when percent. */
  presets: number[]
  allow_custom: boolean
}

export interface TippingResponse {
  tipping: TippingConfig
  configured: boolean
}

/** What the form edits: presets stay strings until validation. */
export interface TippingDraft {
  enabled: boolean
  preset_mode: TipPresetMode
  presets: string[]
  allow_custom: boolean
}

export const TIP_PRESETS_MIN = 3
export const TIP_PRESETS_MAX = 4
export const TIP_FLAT_MAX_USD = 100
export const TIP_PERCENT_MIN = 1
export const TIP_PERCENT_MAX = 100

export const DEFAULT_FLAT_PRESETS: readonly number[] = [1, 2, 5]
export const DEFAULT_PERCENT_PRESETS: readonly number[] = [15, 18, 20]

export const DEFAULT_TIPPING_CONFIG: Readonly<TippingConfig> = Object.freeze({
  enabled: false,
  preset_mode: "flat",
  presets: [...DEFAULT_FLAT_PRESETS],
  allow_custom: true,
})

/** Same gate as the rest of owner/manager settings (settings page `canEdit`). */
export function canEditTipping(role: BusinessRole | string | null | undefined): boolean {
  return role === "owner" || role === "manager"
}

export function defaultPresetsFor(mode: TipPresetMode): number[] {
  return [...(mode === "percent" ? DEFAULT_PERCENT_PRESETS : DEFAULT_FLAT_PRESETS)]
}

/** Human form of a stored preset: 2.5 → "2.50" (flat), 18 → "18" (percent). */
export function formatPresetInput(mode: TipPresetMode, value: number): string {
  if (mode === "flat") return Number.isInteger(value) ? String(value) : value.toFixed(2)
  return String(value)
}

export function draftFromConfig(cfg: TippingConfig): TippingDraft {
  return {
    enabled: cfg.enabled,
    preset_mode: cfg.preset_mode,
    presets: cfg.presets.map((p) => formatPresetInput(cfg.preset_mode, p)),
    allow_custom: cfg.allow_custom,
  }
}

/**
 * Presets to show after the operator flips flat ↔ percent. Untouched defaults
 * swap to the other mode's defaults; anything they typed is kept (and will
 * show per-field errors if it no longer fits — e.g. "2.50" in percent mode).
 */
export function presetsOnModeSwitch(current: string[], from: TipPresetMode, to: TipPresetMode): string[] {
  if (from === to) return current
  const fromDefaults = defaultPresetsFor(from).map((p) => formatPresetInput(from, p))
  const untouched = current.length === fromDefaults.length && current.every((v, i) => v.trim() === fromDefaults[i])
  return untouched ? defaultPresetsFor(to).map((p) => formatPresetInput(to, p)) : current
}

export interface TippingValidation {
  /** Per-preset message by index; absent = fine. */
  presetErrors: (string | null)[]
  /** Whole-list message (count / uniqueness) or null. */
  listError: string | null
  /** Non-null only when everything passes — the exact PUT body. */
  config: TippingConfig | null
}

function parsePreset(mode: TipPresetMode, raw: string): { value?: number; error?: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { error: "Required" }
  if (!/^-?\d*\.?\d+$/.test(trimmed)) return { error: "Numbers only" }
  const n = Number(trimmed)
  if (!Number.isFinite(n)) return { error: "Numbers only" }
  if (mode === "flat") {
    if (n <= 0) return { error: "Must be more than $0" }
    if (n > TIP_FLAT_MAX_USD) return { error: `Max $${TIP_FLAT_MAX_USD}` }
    if (Math.abs(Math.round(n * 100) - n * 100) > 1e-9) return { error: "Cents only (2 decimals)" }
    return { value: Math.round(n * 100) / 100 }
  }
  if (!Number.isInteger(n)) return { error: "Whole numbers only" }
  if (n < TIP_PERCENT_MIN || n > TIP_PERCENT_MAX) return { error: `${TIP_PERCENT_MIN}-${TIP_PERCENT_MAX}%` }
  return { value: n }
}

/** Mirrors services `validateTippingConfigInput`; see the contract note above. */
export function validateTippingDraft(draft: TippingDraft): TippingValidation {
  const presetErrors: (string | null)[] = draft.presets.map(() => null)
  let listError: string | null = null

  if (draft.presets.length < TIP_PRESETS_MIN || draft.presets.length > TIP_PRESETS_MAX) {
    listError = `Add ${TIP_PRESETS_MIN} to ${TIP_PRESETS_MAX} preset amounts.`
  }

  const values: number[] = []
  draft.presets.forEach((raw, i) => {
    const r = parsePreset(draft.preset_mode, raw)
    if (r.error) presetErrors[i] = r.error
    else values.push(r.value!)
  })

  const anyFieldError = presetErrors.some(Boolean)
  if (!anyFieldError && !listError && new Set(values).size !== values.length) {
    listError = "Each preset must be different."
    // Flag the later duplicate(s) so the operator sees which one to change.
    const seen = new Set<number>()
    values.forEach((v, i) => {
      if (seen.has(v)) presetErrors[i] = "Duplicate"
      seen.add(v)
    })
  }

  const ok = !anyFieldError && !listError
  return {
    presetErrors,
    listError,
    config: ok
      ? { enabled: draft.enabled, preset_mode: draft.preset_mode, presets: values, allow_custom: draft.allow_custom }
      : null,
  }
}

/** True when the draft differs from what the server last confirmed. */
export function isTippingDirty(saved: TippingConfig, draft: TippingDraft): boolean {
  const v = validateTippingDraft(draft).config
  // An invalid draft is "dirty" in the sense that it is not the saved state —
  // callers decide whether Save is enabled via validation, not this flag.
  if (!v) return true
  return (
    v.enabled !== saved.enabled ||
    v.allow_custom !== saved.allow_custom ||
    v.preset_mode !== saved.preset_mode ||
    v.presets.length !== saved.presets.length ||
    v.presets.some((p, i) => p !== saved.presets[i])
  )
}

/** Maps a PUT failure onto operator-facing copy. */
export function tippingErrorMessage(status: number, serverMessage?: string): string {
  switch (status) {
    case 400:
      return serverMessage?.trim() || "Those tip amounts can't be saved. Check them and try again."
    case 403:
      return "Only owners and managers can change tipping settings."
    case 503:
      return "Tipping settings aren't available on this environment yet."
    default:
      return "Couldn't save. Please try again."
  }
}

/** Fixed copy: "No tip" is always on and never stored — the door shows it regardless. */
export const NO_TIP_NOTE = "Guests always see a No tip option. It can't be turned off."
