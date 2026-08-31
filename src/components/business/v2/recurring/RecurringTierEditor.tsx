"use client"

import { Plus, Trash2, X } from "lucide-react"
import { parsePrice, trimMoney, type SurgeStepDraft } from "@/lib/business/weekly-cover-nights"
import {
  EMPTY_RECURRING_TIER,
  templateToTierRows,
  tierRowsToTemplate,
  type RecurringTierRow,
} from "@/lib/business/recurring-tier-rows"
import { useWeeklyCoverAccent } from "@/components/business/v2/door-access/WeeklyCoverAccent"
import { Button } from "@/components/business/v2/ui/button"
import { TimeField } from "@/components/business/v2/ui/date-time-field"
import { Input, Select, Textarea } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { ScanWindowExamples, ScanWindowInfo, ScanWindowToggle } from "@/components/business/v2/events/ScanWindowSection"
import { TICKET_DESCRIPTION_MAX } from "@/components/business/v2/events/TicketTierForm"
import { cn } from "@/lib/v2/utils"

/**
 * Ticket-tier editor for a series template. Mirrors the event form's
 * TicketTierForm, except sales/scan windows are RELATIVE to each night: a
 * time of day plus "day before / same night / next morning" instead of absolute
 * datetimes (core computes the real datetimes when it stamps each night).
 */

// Pure model + converters live in lib/business/recurring-tier-rows (testable
// without JSX); re-exported here so existing imports keep working.
export { EMPTY_RECURRING_TIER, templateToTierRows, tierRowsToTemplate, type RecurringTierRow }

const OFFSET_OPTIONS = [
  { value: -1, label: "the day before" },
  { value: 0, label: "same night" },
  { value: 1, label: "next morning" },
  { value: 2, label: "2 days after" },
]

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

const SURGE_INFO = "Price goes up after a set number of tickets sell."
const AGE_INFO = "Buyers see a 21+ badge on this ticket."

export function RecurringTierEditor({
  tiers,
  onChange,
  allowAdd = true,
  allowRemove = true,
  showIdentityFields = true,
  showSurge = false,
  show21Plus = false,
}: {
  tiers: RecurringTierRow[]
  onChange: (tiers: RecurringTierRow[]) => void
  allowAdd?: boolean
  allowRemove?: boolean
  /** Named event series keep Name + Description. Weekly Cover does not. */
  showIdentityFields?: boolean
  /**
   * RC create/edit only. The WC night page reuses this editor through its own
   * draft adapter, which has no surge state; surfacing the control there
   * would render a dead checkbox, so it stays opt-in.
   */
  showSurge?: boolean
  /**
   * WC night page only for now: the one caller whose draft adapter carries
   * the flag through to the night-override PUT. Same dead-checkbox logic as
   * showSurge, so it only surfaces where the value actually persists.
   */
  show21Plus?: boolean
}) {
  const update = (index: number, patch: Partial<RecurringTierRow>) => {
    const next = [...tiers]
    next[index] = { ...next[index], ...patch }
    if (patch.ticket_type === "free") next[index].priceInput = "0"
    onChange(next)
  }

  const toggleSurge = (index: number, on: boolean) => {
    const row = tiers[index]
    const base = parsePrice(row.priceInput)
    update(index, {
      surge_enabled: on,
      surge:
        on && (row.surge ?? []).length === 0
          ? [{ afterSoldInput: "10", priceInput: trimMoney(base > 0 ? base + 5 : 15) }]
          : row.surge ?? [],
    })
  }

  const addSurgeStep = (index: number) => {
    const row = tiers[index]
    const rungs = row.surge ?? []
    const last = rungs[rungs.length - 1]
    const lastPrice = last ? parsePrice(last.priceInput) : parsePrice(row.priceInput)
    const lastThreshold = last ? parseInt(last.afterSoldInput, 10) || 0 : 0
    update(index, {
      surge: [
        ...rungs,
        {
          afterSoldInput: String(lastThreshold > 0 ? lastThreshold + 10 : 10),
          priceInput: trimMoney(lastPrice > 0 ? lastPrice + 5 : 15),
        },
      ],
    })
  }

  const patchSurgeStep = (index: number, stepIndex: number, patch: Partial<SurgeStepDraft>) => {
    const rungs = [...(tiers[index].surge ?? [])]
    rungs[stepIndex] = { ...rungs[stepIndex], ...patch }
    update(index, { surge: rungs })
  }

  const removeSurgeStep = (index: number, stepIndex: number) => {
    update(index, { surge: (tiers[index].surge ?? []).filter((_, s) => s !== stepIndex) })
  }

  const addTier = () => onChange([...tiers, { ...EMPTY_RECURRING_TIER }])
  const removeTier = (index: number) => onChange(tiers.filter((_, i) => i !== index))
  const weekly = useWeeklyCoverAccent()

  return (
    <div className="space-y-3">
      {tiers.map((tier, i) => (
        <div key={i} className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/50 p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {showIdentityFields ? (
              <div className="col-span-2 md:col-span-1">
                <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Name</Label>
                <Input value={tier.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="e.g. GA, VIP" />
              </div>
            ) : null}
            <div>
              <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Type</Label>
              <Select value={tier.ticket_type} onChange={(e) => update(i, { ticket_type: e.target.value as "paid" | "free" })}>
                <option value="paid">Paid</option>
                <option value="free">Free</option>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Price ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={tier.priceInput}
                disabled={tier.ticket_type === "free"}
                onChange={(e) => update(i, { priceInput: e.target.value })}
                onBlur={() => { if (tier.priceInput === "" || isNaN(parseFloat(tier.priceInput))) update(i, { priceInput: "0" }) }}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">
                Quantity per night <span className="font-normal text-neutral-400 dark:text-neutral-500">(0 = ∞)</span>
              </Label>
              <Input
                type="number"
                min="0"
                value={tier.quantityInput}
                placeholder="0 = unlimited"
                onChange={(e) => update(i, { quantityInput: e.target.value })}
                onBlur={() => { if (tier.quantityInput === "" || isNaN(parseInt(tier.quantityInput))) update(i, { quantityInput: "0" }) }}
              />
            </div>
          </div>

          {showIdentityFields ? (
            <div className="mt-3">
              <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">
                Description <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span>
              </Label>
              <Textarea
                value={tier.description}
                onChange={(e) => update(i, { description: e.target.value })}
                rows={2}
                maxLength={TICKET_DESCRIPTION_MAX}
                placeholder="What's included in this tier? e.g. Includes a free drink"
              />
              <p className="mt-1 text-right text-[11px] text-neutral-400 dark:text-neutral-500">
                {tier.description.length}/{TICKET_DESCRIPTION_MAX}
              </p>
            </div>
          ) : null}

          <ScanWindowToggle
            info={<ScanWindowInfo weekly />}
            hasWindow={!!(tier.valid_from_time || tier.valid_until_time)}
            onClear={() => update(i, { valid_from_time: "", valid_until_time: "", valid_from_day_offset: 0, valid_until_day_offset: 0 })}
          >
            <div className="mt-1 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">From</Label>
                <TimeField value={tier.valid_from_time} onChange={(next) => update(i, { valid_from_time: next })} />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">&nbsp;</Label>
                <OffsetSelect idPrefix={`from_offset_${i}`} value={tier.valid_from_day_offset} onChange={(v) => update(i, { valid_from_day_offset: v })} />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Until</Label>
            <TimeField value={tier.valid_until_time} onChange={(next) => update(i, { valid_until_time: next })} />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">&nbsp;</Label>
                <OffsetSelect idPrefix={`until_offset_${i}`} value={tier.valid_until_day_offset} onChange={(v) => update(i, { valid_until_day_offset: v })} />
              </div>
            </div>
            <ScanWindowExamples weekly />
          </ScanWindowToggle>

          {showSurge && (
            /* Always visible and clickable (Luke, 2026-08-29); never hidden
               or disabled waiting for a price. Save validation refuses
               nonsense (surge on a free tier / no paid price) inline. */
            <div className="mt-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!tier.surge_enabled}
                  onChange={(e) => toggleSurge(i, e.target.checked)}
                  className="size-4 rounded border-neutral-300 dark:border-neutral-700"
                />
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Surge pricing</span>
                <span className="text-[11px] text-neutral-400 dark:text-neutral-500">{SURGE_INFO}</span>
              </label>

              {tier.surge_enabled && (
                <div className="mt-2 rounded-xl bg-neutral-100 p-3 dark:bg-neutral-800/70">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Price jumps
                  </p>
                  <div className="flex flex-col gap-2">
                    {(tier.surge ?? []).map((step, s) => (
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
                          className="mb-1.5 rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addSurgeStep(i)}
                    className="mt-2 text-[13px] font-semibold text-neutral-700 hover:underline dark:text-neutral-300"
                  >
                    Add another price jump
                  </button>
                </div>
              )}
            </div>
          )}

          {show21Plus && (
            <div className="mt-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!tier.is_21_plus}
                  onChange={(e) => update(i, { is_21_plus: e.target.checked })}
                  className="size-4 rounded border-neutral-300 dark:border-neutral-700"
                />
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">21+ only</span>
                <span className="text-[11px] text-neutral-400 dark:text-neutral-500">{AGE_INFO}</span>
              </label>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-neutral-600 dark:text-neutral-400">Max per person</Label>
              <Input
                type="number"
                min="0"
                className={cn("h-8 w-20 text-xs")}
                value={tier.maxPerPersonInput}
                placeholder="0 = ∞"
                onChange={(e) => update(i, { maxPerPersonInput: e.target.value })}
                onBlur={() => { if (tier.maxPerPersonInput === "" || isNaN(parseInt(tier.maxPerPersonInput))) update(i, { maxPerPersonInput: "0" }) }}
              />
              <span className="text-xs text-neutral-400 dark:text-neutral-500">(0 = unlimited)</span>
            </div>
            {allowRemove && tiers.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => removeTier(i)} className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-400">
                <Trash2 className="size-3.5" /> Remove
              </Button>
            )}
          </div>
        </div>
      ))}

      {allowAdd && (
        <Button type="button" variant={weekly ? "access-secondary" : "secondary"} size="sm" onClick={addTier}>
          <Plus /> Add ticket tier
        </Button>
      )}
    </div>
  )
}
