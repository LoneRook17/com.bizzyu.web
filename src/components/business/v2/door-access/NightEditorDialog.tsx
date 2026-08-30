"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2, X } from "lucide-react"
import { ACCESS_ACCENT, ACCESS_INK } from "@/lib/business/door-access"
import {
  allEnabledTiers21Plus,
  applyIncludesCover,
  cloneNightDraft,
  defaultTierName,
  emptyTier,
  parsePrice,
  setTierCustomDescription,
  surgeStepsToWire,
  tierHasCustomDescription,
  trimMoney,
  validateNightDraft,
  type NightDraft,
  type NightTierDraft,
  type NightTierKind,
} from "@/lib/business/weekly-cover-nights"
import { AccessInfoTip } from "@/components/business/v2/door-access/AccessInfoTip"
import { AccessPillToggle } from "@/components/business/v2/door-access/AccessPillToggle"
import { Button } from "@/components/business/v2/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/business/v2/ui/dialog"
import { TimeField } from "@/components/business/v2/ui/date-time-field"
import { Input, Select, Textarea } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { ImageUpload } from "@/components/business/v2/events/ImageUpload"

/**
 * Flutter weekday Prices editor (e.g. Wednesday Prices).
 *
 * Dark cards, pink Save, pill toggles. Scan Window is From / Until plus
 * same-night / next-morning. Custom description is off by default; on fills
 * the default template into What they get. Persist path is still
 * weekday_edits.tiers[].description.
 */

const OFFSET_OPTIONS = [
  { value: -1, label: "the day before" },
  { value: 0, label: "same night" },
  { value: 1, label: "next morning" },
  { value: 2, label: "2 days after" },
]

const SURGE_INFO = "Price goes up after a set number of tickets sell."
const SCAN_WINDOW_INFO =
  "Limits when this ticket can be scanned. Guests can still buy earlier. Leave this off if they can get in all night."
const CUSTOM_DESC_INFO = "What guests see on the ticket. Off shows no description."

function OffsetSelect({ value, onChange, idPrefix }: { value: number; onChange: (v: number) => void; idPrefix: string }) {
  const options = OFFSET_OPTIONS.some((o) => o.value === value)
    ? OFFSET_OPTIONS
    : [...OFFSET_OPTIONS, { value, label: `${value > 0 ? "+" : ""}${value} days` }].sort((a, b) => a.value - b.value)
  return (
    <Select id={idPrefix} value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </Select>
  )
}

export function NightEditorDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  initial,
  venueName,
  dayName,
  saveLabel,
  showClosedToggle = false,
  onReset,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle: string
  initial: NightDraft
  venueName?: string
  dayName?: string
  saveLabel: string
  showClosedToggle?: boolean
  onReset?: () => void
  onSave: (draft: NightDraft) => void
}) {
  const [draft, setDraft] = useState<NightDraft>(() => cloneNightDraft(initial))
  const [errors, setErrors] = useState<string[]>([])
  const [scanOpen, setScanOpen] = useState<Record<number, boolean>>({})

  useEffect(() => {
    if (!open) return
    const next = cloneNightDraft(initial)
    setDraft(next)
    setErrors([])
    const opened: Record<number, boolean> = {}
    next.tiers.forEach((tier, i) => {
      if (tier.valid_from_time || tier.valid_until_time) opened[i] = true
    })
    setScanOpen(opened)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, title])

  const patch = (next: Partial<NightDraft>) => setDraft((d) => ({ ...d, ...next }))

  const patchTier = (index: number, next: Partial<NightTierDraft>) =>
    setDraft((d) => {
      const tiers = [...d.tiers]
      tiers[index] = { ...tiers[index], ...next }
      return { ...d, tiers }
    })

  const addTier = (kind: NightTierKind) =>
    setDraft((d) => ({ ...d, tiers: [...d.tiers, emptyTier(kind, { venueName, dayName })] }))

  const removeTier = (index: number) =>
    setDraft((d) => ({ ...d, tiers: d.tiers.filter((_, i) => i !== index) }))

  const addSurgeStep = (index: number) =>
    setDraft((d) => {
      const tiers = [...d.tiers]
      const tier = { ...tiers[index] }
      const last = tier.surge.length > 0 ? parsePrice(tier.surge[tier.surge.length - 1].priceInput) : parsePrice(tier.priceInput)
      const previousThreshold =
        tier.surge.length > 0 ? parseInt(tier.surge[tier.surge.length - 1].afterSoldInput, 10) || 0 : 0
      tier.surge = [
        ...tier.surge,
        {
          afterSoldInput: String(previousThreshold > 0 ? previousThreshold + 10 : 10),
          priceInput: trimMoney(last > 0 ? last + 5 : 15),
        },
      ]
      tiers[index] = tier
      return { ...d, tiers }
    })

  const patchSurgeStep = (tierIndex: number, stepIndex: number, next: Partial<{ afterSoldInput: string; priceInput: string }>) =>
    setDraft((d) => {
      const tiers = [...d.tiers]
      const tier = { ...tiers[tierIndex] }
      const surge = [...tier.surge]
      surge[stepIndex] = { ...surge[stepIndex], ...next }
      tier.surge = surge
      tiers[tierIndex] = tier
      return { ...d, tiers }
    })

  const removeSurgeStep = (tierIndex: number, stepIndex: number) =>
    setDraft((d) => {
      const tiers = [...d.tiers]
      const tier = { ...tiers[tierIndex] }
      tier.surge = tier.surge.filter((_, i) => i !== stepIndex)
      tiers[tierIndex] = tier
      return { ...d, tiers }
    })

  const toggleSurge = (index: number, on: boolean) =>
    setDraft((d) => {
      const tiers = [...d.tiers]
      const tier = { ...tiers[index], surge_enabled: on }
      if (on && tier.surge.length === 0) {
        const base = parsePrice(tier.priceInput)
        tier.surge = [{ afterSoldInput: "10", priceInput: trimMoney(base > 0 ? base + 5 : 15) }]
      }
      tiers[index] = tier
      return { ...d, tiers }
    })

  const toggleIncludesCover = (index: number, on: boolean) =>
    setDraft((d) => {
      const tiers = [...d.tiers]
      tiers[index] = applyIncludesCover(tiers[index], on)
      return { ...d, tiers }
    })

  const toggleCustomDescription = (index: number, on: boolean) =>
    setDraft((d) => {
      const tiers = [...d.tiers]
      tiers[index] = setTierCustomDescription(tiers[index], on)
      return { ...d, tiers }
    })

  const toggleScanWindow = (index: number, on: boolean) => {
    setScanOpen((prev) => ({ ...prev, [index]: on }))
    if (!on) {
      patchTier(index, {
        valid_from_time: "",
        valid_until_time: "",
        valid_from_day_offset: 0,
        valid_until_day_offset: 0,
      })
    }
  }

  const commit = () => {
    const problems = validateNightDraft(draft, dayName ?? "This night")
    if (problems.length > 0) {
      setErrors(problems)
      return
    }
    // O1: descriptions are the host's text as typed — nothing is re-derived
    // or injected on save.
    // Per-ticket 21+: the night flag follows the ALL rule (every enabled tier
    // 21+), never the old ANY rollup. An explicit night-level 21+ still wins.
    const is21 = draft.is21Plus || allEnabledTiers21Plus(draft.tiers)
    onSave({ ...cloneNightDraft(draft), is21Plus: is21 })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto border-neutral-800 bg-neutral-950 text-neutral-100">
        <DialogHeader>
          <DialogTitle className="text-neutral-50">{title}</DialogTitle>
          <p className="text-[13.5px] leading-snug text-neutral-400">{subtitle}</p>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {showClosedToggle && (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3">
              <AccessPillToggle
                id="wc-closed-night"
                checked={draft.isClosed}
                onCheckedChange={(on) => patch({ isClosed: on })}
                label="Closed this night"
              />
              <p className="mt-1 text-[12px] text-neutral-500">Nothing sells and nothing scans.</p>
            </div>
          )}

          {!draft.isClosed && (
            <>
              <div className="flex flex-col gap-3">
                {draft.tiers.map((tier, i) => {
                  const surgeSteps = surgeStepsToWire(tier)
                  const qtyDisplay = tier.quantityInput === "0" ? "" : tier.quantityInput
                  const customOn = tierHasCustomDescription(tier)
                  const scanOn = !!scanOpen[i] || !!(tier.valid_from_time || tier.valid_until_time)
                  return (
                    <div
                      key={i}
                      className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                            style={{ backgroundColor: ACCESS_ACCENT, color: ACCESS_INK }}
                          >
                            {tier.kind === "skip" ? "Skip the Line" : "Cover"}
                          </span>
                          {surgeSteps.length > 0 && (
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                              {surgeSteps.length} jump{surgeSteps.length === 1 ? "" : "s"}
                            </span>
                          )}
                        </span>
                        {draft.tiers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTier(i)}
                            aria-label={`Remove ${tier.name || defaultTierName(tier.kind)}`}
                            className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-red-950/40 hover:text-red-400"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="mb-1 block text-xs text-neutral-400">Price ($)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            value={tier.priceInput}
                            placeholder="0"
                            onChange={(e) => patchTier(i, { priceInput: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="mb-1 block text-xs text-neutral-400">Qty</Label>
                          <Input
                            type="number"
                            min="0"
                            value={qtyDisplay}
                            placeholder="Unlimited"
                            onChange={(e) => patchTier(i, { quantityInput: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-3">
                        <AccessPillToggle
                          id={`wc-surge-${i}`}
                          checked={tier.surge_enabled}
                          onCheckedChange={(on) => toggleSurge(i, on)}
                          label="Surge"
                          info={<AccessInfoTip label="What is Surge?">{SURGE_INFO}</AccessInfoTip>}
                        />

                        {tier.surge_enabled && (
                          <div className="rounded-xl p-3" style={{ backgroundColor: `${ACCESS_ACCENT}14` }}>
                            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider" style={{ color: ACCESS_ACCENT }}>
                              Price jumps
                            </p>
                            <div className="flex flex-col gap-2">
                              {tier.surge.map((step, s) => (
                                <div key={s} className="flex items-end gap-2">
                                  <div className="min-w-0 flex-1">
                                    <Label className="mb-1 block text-xs text-neutral-400">
                                      {s === 0 ? "After this sells" : "Then after"}
                                    </Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={step.afterSoldInput}
                                      onChange={(e) => patchSurgeStep(i, s, { afterSoldInput: e.target.value })}
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <Label className="mb-1 block text-xs text-neutral-400">
                                      Next price ($)
                                    </Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      inputMode="decimal"
                                      value={step.priceInput}
                                      onChange={(e) => patchSurgeStep(i, s, { priceInput: e.target.value })}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeSurgeStep(i, s)}
                                    aria-label={`Remove jump ${s + 1}`}
                                    className="mb-1.5 rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => addSurgeStep(i)}
                              className="mt-2 text-[13px] font-semibold hover:underline"
                              style={{ color: ACCESS_ACCENT }}
                            >
                              Add another price jump
                            </button>
                          </div>
                        )}

                        <AccessPillToggle
                          id={`wc-scan-${i}`}
                          checked={scanOn}
                          onCheckedChange={(on) => toggleScanWindow(i, on)}
                          label="Scan Window"
                          info={<AccessInfoTip label="What is Scan Window?">{SCAN_WINDOW_INFO}</AccessInfoTip>}
                        />

                        {scanOn && (
                          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <div>
                              <Label className="mb-1 block text-xs text-neutral-400">From</Label>
                              <TimeField value={tier.valid_from_time} onChange={(next) => patchTier(i, { valid_from_time: next })} />
                            </div>
                            <div>
                              <Label className="mb-1 block text-xs text-neutral-400">&nbsp;</Label>
                              <OffsetSelect idPrefix={`from_offset_${i}`} value={tier.valid_from_day_offset} onChange={(v) => patchTier(i, { valid_from_day_offset: v })} />
                            </div>
                            <div>
                              <Label className="mb-1 block text-xs text-neutral-400">Until</Label>
                              <TimeField value={tier.valid_until_time} onChange={(next) => patchTier(i, { valid_until_time: next })} />
                            </div>
                            <div>
                              <Label className="mb-1 block text-xs text-neutral-400">&nbsp;</Label>
                              <OffsetSelect idPrefix={`until_offset_${i}`} value={tier.valid_until_day_offset} onChange={(v) => patchTier(i, { valid_until_day_offset: v })} />
                            </div>
                          </div>
                        )}

                        <AccessPillToggle
                          id={`wc-21-${i}`}
                          checked={tier.is_21_plus}
                          onCheckedChange={(on) => patchTier(i, { is_21_plus: on })}
                          label="21+"
                        />

                        {tier.kind === "skip" && (
                          <AccessPillToggle
                            id={`wc-cover-included-${i}`}
                            checked={tier.includes_cover}
                            onCheckedChange={(on) => toggleIncludesCover(i, on)}
                            label="Cover included"
                          />
                        )}

                        <AccessPillToggle
                          id={`wc-custom-desc-${i}`}
                          checked={customOn}
                          onCheckedChange={(on) => toggleCustomDescription(i, on)}
                          label="Custom description"
                          info={<AccessInfoTip label="What is Custom description?">{CUSTOM_DESC_INFO}</AccessInfoTip>}
                        />

                        {customOn && (
                          <div>
                            <Label className="mb-1 block text-xs text-neutral-400">What they get</Label>
                            <Textarea
                              value={tier.description}
                              onChange={(e) => patchTier(i, { description: e.target.value })}
                              rows={3}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                <Button type="button" variant="access-secondary" size="sm" onClick={() => addTier("cover")}>
                  <Plus /> Add another Cover
                </Button>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-neutral-100">Hours</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="mb-1 block text-xs text-neutral-400">Starts</Label>
                    <TimeField value={draft.startTime} onChange={(next) => patch({ startTime: next })} />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs text-neutral-400">Ends</Label>
                    <TimeField value={draft.endTime} onChange={(next) => patch({ endTime: next })} />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-neutral-100">
                  Flyer <span className="font-normal text-neutral-500">(optional)</span>
                </h3>
                <p className="mb-2 text-[13px] text-neutral-500">
                  {draft.flyerImageUrl
                    ? "This night uses its own flyer."
                    : "Leave empty to use the venue photo."}
                </p>
                <ImageUpload
                  value={draft.flyerImageUrl}
                  onChange={(url) =>
                    patch({ flyerImageUrl: url, flyerRemoved: url === "" && initial.flyerImageUrl !== "" })
                  }
                  fallbackSrc={draft.inheritedFlyerUrl || null}
                  fallbackCaption="Venue photo. Nights use this until you add a flyer."
                />
              </div>
            </>
          )}

          {errors.length > 0 && (
            <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-400">
              <ul className="flex flex-col gap-1">
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-neutral-800 pt-4">
            {onReset ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  onReset()
                  onOpenChange(false)
                }}
              >
                Reset to weekly
              </Button>
            ) : (
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            )}
            <Button type="button" variant="access" onClick={commit}>
              {saveLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
