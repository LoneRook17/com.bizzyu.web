"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2, X } from "lucide-react"
import { cn } from "@/lib/v2/utils"
import { ACCESS_ACCENT, ACCESS_INK } from "@/lib/business/door-access"
import {
  applyIncludesCover,
  cloneNightDraft,
  defaultTierDescription,
  defaultTierName,
  emptyTier,
  parsePrice,
  surgeStepsToWire,
  syncSkipTierDescriptions,
  trimMoney,
  validateNightDraft,
  type NightDraft,
  type NightTierDraft,
  type NightTierKind,
} from "@/lib/business/weekly-cover-nights"
import { Button } from "@/components/business/v2/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/business/v2/ui/dialog"
import { Input } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { ImageUpload } from "@/components/business/v2/events/ImageUpload"
import { WEEKLY_COVER_CHECKBOX_CLASS } from "@/components/business/v2/door-access/WeeklyCoverAccent"

/**
 * Flutter Monday Prices editor.
 *
 * Cover price / qty (Unlimited default), Surge, 21+, Add another Cover.
 * Skip the Line with Cover included ON. Hours Starts / Ends. Optional flyer.
 * Save {day}. No VIP, no scan window, no max-per-person field (blank max
 * already serializes as 0), no stock alerts.
 */

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

  useEffect(() => {
    if (!open) return
    setDraft(cloneNightDraft(initial))
    setErrors([])
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
    setDraft((d) => {
      const tier = emptyTier(kind)
      tier.description = defaultTierDescription({
        kind,
        includesCover: tier.includes_cover,
        venueName,
        dayName,
      })
      return { ...d, tiers: [...d.tiers, tier] }
    })

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
      tiers[index] = applyIncludesCover(tiers[index], on, { venueName, dayName })
      return { ...d, tiers }
    })

  const commit = () => {
    const problems = validateNightDraft(draft, dayName ?? "This night")
    if (problems.length > 0) {
      setErrors(problems)
      return
    }
    const synced = syncSkipTierDescriptions(draft, { venueName, dayName })
    const is21 = synced.is21Plus || synced.tiers.some((t) => !t.is_disabled && t.is_21_plus)
    onSave({ ...cloneNightDraft(synced), is21Plus: is21 })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-[13.5px] leading-snug text-neutral-600 dark:text-neutral-400">{subtitle}</p>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {showClosedToggle && (
            <label className="flex w-fit cursor-pointer items-start gap-2.5 rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <input
                type="checkbox"
                checked={draft.isClosed}
                onChange={(e) => patch({ isClosed: e.target.checked })}
                className={cn(WEEKLY_COVER_CHECKBOX_CLASS, "mt-0.5")}
              />
              <span>
                <span className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  Closed this night
                </span>
                <span className="block text-[13px] text-neutral-500 dark:text-neutral-400">
                  Nothing sells and nothing scans.
                </span>
              </span>
            </label>
          )}

          {!draft.isClosed && (
            <>
              <div className="flex flex-col gap-3">
                {draft.tiers.map((tier, i) => {
                  const surgeSteps = surgeStepsToWire(tier)
                  const qtyDisplay = tier.quantityInput === "0" ? "" : tier.quantityInput
                  return (
                    <div
                      key={i}
                      className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 dark:border-neutral-800 dark:bg-neutral-800/50"
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
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                              {surgeSteps.length} jump{surgeSteps.length === 1 ? "" : "s"}
                            </span>
                          )}
                        </span>
                        {draft.tiers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTier(i)}
                            aria-label={`Remove ${tier.name || defaultTierName(tier.kind)}`}
                            className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Price ($)</Label>
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
                          <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Qty</Label>
                          <Input
                            type="number"
                            min="0"
                            value={qtyDisplay}
                            placeholder="Unlimited"
                            onChange={(e) => patchTier(i, { quantityInput: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-neutral-700 dark:text-neutral-300">
                          <input
                            type="checkbox"
                            checked={tier.surge_enabled}
                            onChange={(e) => toggleSurge(i, e.target.checked)}
                            className={WEEKLY_COVER_CHECKBOX_CLASS}
                          />
                          Surge
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-neutral-700 dark:text-neutral-300">
                          <input
                            type="checkbox"
                            checked={tier.is_21_plus}
                            onChange={(e) => patchTier(i, { is_21_plus: e.target.checked })}
                            className={WEEKLY_COVER_CHECKBOX_CLASS}
                          />
                          21+
                        </label>
                        {tier.kind === "skip" && (
                          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-neutral-700 dark:text-neutral-300">
                            <input
                              type="checkbox"
                              checked={tier.includes_cover}
                              onChange={(e) => toggleIncludesCover(i, e.target.checked)}
                              className={WEEKLY_COVER_CHECKBOX_CLASS}
                            />
                            Cover included
                          </label>
                        )}
                      </div>

                      {tier.surge_enabled && (
                        <div className="mt-3 rounded-lg p-3" style={{ backgroundColor: `${ACCESS_ACCENT}14` }}>
                          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider" style={{ color: ACCESS_ACCENT }}>
                            Price jumps
                          </p>
                          <div className="flex flex-col gap-2">
                            {tier.surge.map((step, s) => (
                              <div key={s} className="flex items-end gap-2">
                                <div className="min-w-0 flex-1">
                                  <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">
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
                                  <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">
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
                                  className="mb-1.5 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
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
                    </div>
                  )
                })}

                <Button type="button" variant="access-secondary" size="sm" onClick={() => addTier("cover")}>
                  <Plus /> Add another Cover
                </Button>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Hours</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Starts</Label>
                    <Input type="time" value={draft.startTime} onChange={(e) => patch({ startTime: e.target.value })} />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Ends</Label>
                    <Input type="time" value={draft.endTime} onChange={(e) => patch({ endTime: e.target.value })} />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Flyer <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span>
                </h3>
                <p className="mb-2 text-[13px] text-neutral-500 dark:text-neutral-400">
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
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              <ul className="flex flex-col gap-1">
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
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
