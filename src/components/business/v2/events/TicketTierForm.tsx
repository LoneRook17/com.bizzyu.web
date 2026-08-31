"use client"

import { Plus, Trash2, X } from "lucide-react"
import { TICKET_TYPES } from "@/lib/business/constants"
import type { TicketTier } from "@/lib/business/types"
import { nextSurgeStep, seededSurgeStep } from "@/lib/business/event-tier-surge"
import { Button } from "@/components/business/v2/ui/button"
import { Input, Select, Textarea } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { ScanWindowSection } from "@/components/business/v2/events/ScanWindowSection"
import { cn } from "@/lib/v2/utils"

interface TicketTierFormProps {
  tiers: TicketTier[]
  onChange: (tiers: TicketTier[]) => void
}

const EMPTY_TIER: TicketTier = {
  name: "",
  description: "",
  price_usd: 0,
  quantity: 0,
  max_per_person: 0,
  ticket_type: "paid",
  valid_from: "",
  valid_until: "",
  surge_enabled: false,
  surge: [],
}

// Same explanation the Weekly Cover dialog and the app use.
const SURGE_INFO = "Price goes up after a set number of tickets sell."

// Matches the mobile app's ticket-description field (optional, 64-char cap).
export const TICKET_DESCRIPTION_MAX = 64

const TICKET_TYPE_LABELS: Record<string, string> = {
  paid: "Paid",
  free: "Free",
}

export function TicketTierForm({ tiers, onChange }: TicketTierFormProps) {
  const updateTier = (index: number, field: keyof TicketTier, value: string | number) => {
    const updated = [...tiers]
    updated[index] = { ...updated[index], [field]: value }
    if (field === "ticket_type" && value === "free") {
      updated[index].price_usd = 0
    }
    onChange(updated)
  }

  const clearTierWindow = (index: number) => {
    const updated = [...tiers]
    updated[index] = { ...updated[index], valid_from: "", valid_until: "" }
    onChange(updated)
  }

  const patchTier = (index: number, patch: Partial<TicketTier>) => {
    const updated = [...tiers]
    updated[index] = { ...updated[index], ...patch }
    onChange(updated)
  }

  const toggleSurge = (index: number, on: boolean) => {
    const tier = tiers[index]
    patchTier(index, {
      surge_enabled: on,
      // Seed the first rung so the toggle never lands on an empty ladder.
      surge: on && (tier.surge ?? []).length === 0 ? [seededSurgeStep(tier)] : tier.surge,
    })
  }

  const addSurgeStep = (index: number) => {
    const tier = tiers[index]
    patchTier(index, { surge: [...(tier.surge ?? []), nextSurgeStep(tier)] })
  }

  const patchSurgeStep = (
    tierIndex: number,
    stepIndex: number,
    patch: Partial<{ afterSoldInput: string; priceInput: string }>
  ) => {
    const tier = tiers[tierIndex]
    const surge = [...(tier.surge ?? [])]
    surge[stepIndex] = { ...surge[stepIndex], ...patch }
    patchTier(tierIndex, { surge })
  }

  const removeSurgeStep = (tierIndex: number, stepIndex: number) => {
    const tier = tiers[tierIndex]
    patchTier(tierIndex, { surge: (tier.surge ?? []).filter((_, i) => i !== stepIndex) })
  }

  const addTier = () => onChange([...tiers, { ...EMPTY_TIER }])
  const removeTier = (index: number) => onChange(tiers.filter((_, i) => i !== index))

  return (
    <div className="space-y-3">
      {tiers.map((tier, i) => (
        <div key={i} className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/50 p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Name</Label>
              <Input
                value={tier.name}
                onChange={(e) => updateTier(i, "name", e.target.value)}
                placeholder="e.g. GA, VIP"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Type</Label>
              <Select value={tier.ticket_type} onChange={(e) => updateTier(i, "ticket_type", e.target.value)}>
                {TICKET_TYPES.map((t) => (
                  <option key={t} value={t}>{TICKET_TYPE_LABELS[t] ?? t}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Price ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={tier.price_usd}
                disabled={tier.ticket_type === "free"}
                onChange={(e) => updateTier(i, "price_usd", e.target.value === "" ? ("" as unknown as number) : parseFloat(e.target.value))}
                onBlur={() => {
                  if ((tier.price_usd as unknown as string) === "" || isNaN(tier.price_usd)) updateTier(i, "price_usd", 0)
                }}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">
                Quantity <span className="font-normal text-neutral-400 dark:text-neutral-500">(0 = ∞)</span>
              </Label>
              <Input
                type="number"
                min="0"
                value={tier.quantity}
                placeholder="0 = unlimited"
                onChange={(e) => updateTier(i, "quantity", e.target.value === "" ? ("" as unknown as number) : parseInt(e.target.value))}
                onBlur={() => {
                  if ((tier.quantity as unknown as string) === "" || isNaN(tier.quantity)) updateTier(i, "quantity", 0)
                }}
              />
            </div>
          </div>

          <div className="mt-3">
            <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">
              Description <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span>
            </Label>
            <Textarea
              value={tier.description ?? ""}
              onChange={(e) => updateTier(i, "description", e.target.value)}
              rows={2}
              maxLength={TICKET_DESCRIPTION_MAX}
              placeholder="What's included in this tier? e.g. Includes a free drink"
            />
            <p className="mt-1 text-right text-[11px] text-neutral-400 dark:text-neutral-500">
              {(tier.description ?? "").length}/{TICKET_DESCRIPTION_MAX}
            </p>
          </div>

          <ScanWindowSection
            valid_from={tier.valid_from}
            valid_until={tier.valid_until}
            onUpdate={(field, value) => updateTier(i, field, value)}
            onClear={() => clearTierWindow(i)}
          />

          {/* Always visible and clickable (Luke, 2026-08-29) — never hidden or
              disabled waiting for a price. Save validation refuses nonsense
              (surge on a free tier / no paid price) with inline copy instead. */}
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

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-neutral-600 dark:text-neutral-400">Max per person</Label>
              <Input
                type="number"
                min="0"
                className={cn("h-8 w-20 text-xs")}
                value={tier.max_per_person ?? 0}
                placeholder="0 = ∞"
                onChange={(e) => updateTier(i, "max_per_person", e.target.value === "" ? ("" as unknown as number) : parseInt(e.target.value))}
                onBlur={() => {
                  if ((tier.max_per_person as unknown as string) === "" || isNaN(tier.max_per_person ?? 0)) updateTier(i, "max_per_person", 0)
                }}
              />
              <span className="text-xs text-neutral-400 dark:text-neutral-500">(0 = unlimited)</span>
            </div>
            {tiers.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => removeTier(i)} className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-400">
                <Trash2 className="size-3.5" /> Remove
              </Button>
            )}
          </div>
        </div>
      ))}

      <Button type="button" variant="secondary" size="sm" onClick={addTier}>
        <Plus /> Add ticket tier
      </Button>
    </div>
  )
}
