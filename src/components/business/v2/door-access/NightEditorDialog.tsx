"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2, X } from "lucide-react"
import { cn } from "@/lib/v2/utils"
import {
  cloneNightDraft,
  defaultTierDescription,
  defaultTierName,
  emptyTier,
  parsePrice,
  surgeStepsToWire,
  trimMoney,
  validateNightDraft,
  type NightDraft,
  type NightTierDraft,
  type NightTierKind,
} from "@/lib/business/weekly-cover-nights"
import { Button } from "@/components/business/v2/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/business/v2/ui/dialog"
import { Input, Textarea, Select } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { ImageUpload } from "@/components/business/v2/events/ImageUpload"
import { ScanWindowExamples, ScanWindowInfo, ScanWindowToggle } from "@/components/business/v2/events/ScanWindowSection"
import { TICKET_DESCRIPTION_MAX } from "@/components/business/v2/events/TicketTierForm"
import { WEEKLY_COVER_CHECKBOX_CLASS } from "@/components/business/v2/door-access/WeeklyCoverAccent"

/**
 * The per-night editor — one weekday template, or one game-day date.
 *
 * Both callers push the same editor; the only difference is where the result
 * lands (`weekdayEdits[iso]` vs `dateEdits[date]`) and whether a Closed toggle
 * and a Reset are offered. That is deliberate: a host setting Friday and a host
 * setting Halloween are doing the same thing at different scopes, and two
 * editors would drift apart.
 *
 * Everything here is local state committed on Save. Cancel throws the copy away,
 * so a half-edited night can never leak into the draft.
 */

const OFFSET_OPTIONS = [
  { value: -1, label: "the day before" },
  { value: 0, label: "same night" },
  { value: 1, label: "next morning" },
  { value: 2, label: "2 days after" },
]

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
  /** Offered only when this scope already has its own values to throw away. */
  onReset?: () => void
  onSave: (draft: NightDraft) => void
}) {
  const [draft, setDraft] = useState<NightDraft>(() => cloneNightDraft(initial))
  const [errors, setErrors] = useState<string[]>([])

  // Re-seed whenever the editor is opened on a different night. Without this the
  // second day the host taps shows the first day's numbers.
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
      // Turning surge on with no rungs is a validation error the host cannot
      // see the cause of, so seed the first one.
      if (on && tier.surge.length === 0) {
        const base = parsePrice(tier.priceInput)
        tier.surge = [{ afterSoldInput: "10", priceInput: trimMoney(base > 0 ? base + 5 : 15) }]
      }
      tiers[index] = tier
      return { ...d, tiers }
    })

  const commit = () => {
    const problems = validateNightDraft(draft, dayName ?? "This night")
    if (problems.length > 0) {
      setErrors(problems)
      return
    }
    // 21+ on the night is the union of its tiers, matching the app: any 21+ way
    // in lights the badge, and clearing the last one clears the night.
    const is21 = draft.is21Plus || draft.tiers.some((t) => !t.is_disabled && t.is_21_plus)
    onSave({ ...cloneNightDraft(draft), is21Plus: is21 })
    onOpenChange(false)
  }

  const hasSkipTier = draft.tiers.some((t) => t.kind === "skip")

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
              {/* ── Prices ─────────────────────────────────────────────── */}
              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Prices</h3>
                  <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                    What each way in costs on this night. Add surge to step the price up as passes sell.
                  </p>
                </div>

                {draft.tiers.map((tier, i) => {
                  const surgeSteps = surgeStepsToWire(tier)
                  return (
                    <div
                      key={i}
                      className={cn(
                        "rounded-xl border p-4",
                        tier.is_disabled
                          ? "border-dashed border-neutral-300 bg-neutral-50/50 opacity-70 dark:border-neutral-700 dark:bg-neutral-800/30"
                          : "border-neutral-200 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-800/50"
                      )}
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-access"
                            style={{ backgroundColor: "color-mix(in srgb, var(--color-access) 14%, transparent)" }}
                          >
                            {tier.kind === "skip" ? "Skip the line" : "Cover"}
                          </span>
                          {surgeSteps.length > 0 && (
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                              {surgeSteps.length} jump{surgeSteps.length === 1 ? "" : "s"}
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-neutral-600 dark:text-neutral-400">
                            <input
                              type="checkbox"
                              checked={!tier.is_disabled}
                              onChange={(e) => patchTier(i, { is_disabled: !e.target.checked })}
                              className={WEEKLY_COVER_CHECKBOX_CLASS}
                            />
                            On
                          </label>
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
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div className="col-span-2 md:col-span-2">
                          <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Name</Label>
                          <Input
                            value={tier.name}
                            onChange={(e) => patchTier(i, { name: e.target.value })}
                            placeholder={defaultTierName(tier.kind)}
                          />
                        </div>
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
                          <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">
                            Quantity <span className="font-normal text-neutral-400 dark:text-neutral-500">(0 = ∞)</span>
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            value={tier.quantityInput}
                            placeholder="0"
                            onChange={(e) => patchTier(i, { quantityInput: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">
                          What they get{" "}
                          <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span>
                        </Label>
                        <Textarea
                          value={tier.description}
                          onChange={(e) => patchTier(i, { description: e.target.value })}
                          rows={2}
                          maxLength={TICKET_DESCRIPTION_MAX}
                          placeholder="What this gets them at the door"
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-neutral-700 dark:text-neutral-300">
                          <input
                            type="checkbox"
                            checked={tier.surge_enabled}
                            onChange={(e) => toggleSurge(i, e.target.checked)}
                            className={WEEKLY_COVER_CHECKBOX_CLASS}
                          />
                          Surge pricing
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-neutral-700 dark:text-neutral-300">
                          <input
                            type="checkbox"
                            checked={tier.is_21_plus}
                            onChange={(e) => patchTier(i, { is_21_plus: e.target.checked })}
                            className={WEEKLY_COVER_CHECKBOX_CLASS}
                          />
                          21+ only
                        </label>
                        {tier.kind === "skip" && (
                          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-neutral-700 dark:text-neutral-300">
                            <input
                              type="checkbox"
                              checked={tier.includes_cover}
                              onChange={(e) => patchTier(i, { includes_cover: e.target.checked })}
                              className={WEEKLY_COVER_CHECKBOX_CLASS}
                            />
                            Includes cover
                          </label>
                        )}
                      </div>
                      {tier.kind === "skip" && (
                        <p className="mt-1 text-[12px] text-neutral-500 dark:text-neutral-400">
                          {tier.includes_cover
                            ? "Buying this gets them in as well as past the line."
                            : "They still pay cover at the door."}
                        </p>
                      )}

                      {tier.surge_enabled && (
                        <div className="mt-3 rounded-lg border border-access/25 bg-access/[0.05] p-3">
                          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-access">
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
                            className="mt-2 text-[13px] font-semibold text-access hover:underline"
                          >
                            Add another price jump
                          </button>
                        </div>
                      )}

                      <ScanWindowToggle
                        info={<ScanWindowInfo weekly />}
                        hasWindow={!!(tier.valid_from_time || tier.valid_until_time)}
                        onClear={() =>
                          patchTier(i, {
                            valid_from_time: "",
                            valid_until_time: "",
                            valid_from_day_offset: 0,
                            valid_until_day_offset: 0,
                          })
                        }
                      >
                        <div className="mt-1 grid grid-cols-2 gap-3 md:grid-cols-4">
                          <div>
                            <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">From</Label>
                            <Input
                              type="time"
                              value={tier.valid_from_time}
                              onChange={(e) => patchTier(i, { valid_from_time: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">&nbsp;</Label>
                            <Select
                              value={tier.valid_from_day_offset}
                              onChange={(e) => patchTier(i, { valid_from_day_offset: Number(e.target.value) })}
                            >
                              {OFFSET_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div>
                            <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Until</Label>
                            <Input
                              type="time"
                              value={tier.valid_until_time}
                              onChange={(e) => patchTier(i, { valid_until_time: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">&nbsp;</Label>
                            <Select
                              value={tier.valid_until_day_offset}
                              onChange={(e) => patchTier(i, { valid_until_day_offset: Number(e.target.value) })}
                            >
                              {OFFSET_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </div>
                        <ScanWindowExamples weekly />
                      </ScanWindowToggle>

                      <div className="mt-3 flex items-center gap-2">
                        <Label className="text-xs text-neutral-600 dark:text-neutral-400">Max per person</Label>
                        <Input
                          type="number"
                          min="0"
                          className="h-8 w-20 text-xs"
                          value={tier.maxPerPersonInput}
                          placeholder="0 = ∞"
                          onChange={(e) => patchTier(i, { maxPerPersonInput: e.target.value })}
                        />
                        <span className="text-xs text-neutral-400 dark:text-neutral-500">(0 = unlimited)</span>
                      </div>
                    </div>
                  )
                })}

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="access-secondary" size="sm" onClick={() => addTier("cover")}>
                    <Plus /> Add another Cover
                  </Button>
                  <Button type="button" variant="access-secondary" size="sm" onClick={() => addTier("skip")}>
                    <Plus /> {hasSkipTier ? "Add another Skip the Line" : "Add Skip the Line"}
                  </Button>
                </div>
              </div>

              {/* ── Hours ──────────────────────────────────────────────── */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Door hours</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Doors at</Label>
                    <Input type="time" value={draft.startTime} onChange={(e) => patch({ startTime: e.target.value })} />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Last call</Label>
                    <Input type="time" value={draft.endTime} onChange={(e) => patch({ endTime: e.target.value })} />
                    <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                      Ends past midnight? It rolls into the next morning.
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Artwork ────────────────────────────────────────────── */}
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Flyer for this night{" "}
                  <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span>
                </h3>
                <p className="mb-2 text-[13px] text-neutral-500 dark:text-neutral-400">
                  {draft.flyerImageUrl
                    ? "This night uses its own flyer. Remove it to go back to the program's."
                    : "Leave this empty and the night uses the program flyer."}
                </p>
                <ImageUpload
                  value={draft.flyerImageUrl}
                  onChange={(url) =>
                    // An upload is an own flyer; clearing one that was stored is a
                    // removal, which is the only case that sends an explicit null.
                    patch({ flyerImageUrl: url, flyerRemoved: url === "" && initial.flyerImageUrl !== "" })
                  }
                  fallbackSrc={draft.inheritedFlyerUrl || null}
                  fallbackCaption="Program flyer. This night uses it until you add one."
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
