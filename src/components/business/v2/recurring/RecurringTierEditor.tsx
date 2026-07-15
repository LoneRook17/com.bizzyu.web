"use client"

import { useState } from "react"
import { Info, Plus, Trash2 } from "lucide-react"
import type { RecurringTemplateTicket } from "@/lib/business/types"
import { Button } from "@/components/business/v2/ui/button"
import { Input, Select, Textarea } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { TICKET_DESCRIPTION_MAX } from "@/components/business/v2/events/TicketTierForm"
import { cn } from "@/lib/v2/utils"

/**
 * Ticket-tier editor for a series template. Mirrors the event form's
 * TicketTierForm, except sales/scan windows are RELATIVE to each night: a
 * time of day plus "day before / night of / day after" instead of absolute
 * datetimes (core computes the real datetimes when it stamps each night).
 */

export interface RecurringTierRow {
  name: string
  description: string
  ticket_type: "paid" | "free"
  priceInput: string
  quantityInput: string
  maxPerPersonInput: string
  valid_from_time: string // "HH:MM" or ""
  valid_until_time: string
  valid_from_day_offset: number
  valid_until_day_offset: number
}

export const EMPTY_RECURRING_TIER: RecurringTierRow = {
  name: "",
  description: "",
  ticket_type: "paid",
  priceInput: "0",
  quantityInput: "0",
  maxPerPersonInput: "0",
  valid_from_time: "",
  valid_until_time: "",
  valid_from_day_offset: 0,
  valid_until_day_offset: 0,
}

export function templateToTierRows(template: RecurringTemplateTicket[]): RecurringTierRow[] {
  return [...template]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((t) => ({
      name: t.name,
      description: t.description ?? "",
      ticket_type: t.ticket_type,
      priceInput: String(t.price_usd ?? 0),
      quantityInput: String(t.quantity ?? 0),
      maxPerPersonInput: String(t.max_per_person ?? 0),
      valid_from_time: t.valid_from_time?.slice(0, 5) ?? "",
      valid_until_time: t.valid_until_time?.slice(0, 5) ?? "",
      valid_from_day_offset: t.valid_from_day_offset ?? 0,
      valid_until_day_offset: t.valid_until_day_offset ?? 0,
    }))
}

export function tierRowsToTemplate(rows: RecurringTierRow[]): RecurringTemplateTicket[] {
  return rows.map((r, i) => ({
    name: r.name.trim(),
    description: r.description.trim() || null,
    price_usd: r.ticket_type === "free" ? 0 : parseFloat(r.priceInput) || 0,
    quantity: parseInt(r.quantityInput) || 0,
    max_per_person: parseInt(r.maxPerPersonInput) || 0,
    ticket_type: r.ticket_type,
    is_hidden: 0,
    sort_order: i + 1,
    valid_from_time: r.valid_from_time || null,
    valid_until_time: r.valid_until_time || null,
    valid_from_day_offset: r.valid_from_time ? r.valid_from_day_offset : 0,
    valid_until_day_offset: r.valid_until_time ? r.valid_until_day_offset : 0,
  }))
}

const OFFSET_OPTIONS = [
  { value: -1, label: "the day before" },
  { value: 0, label: "the night of" },
  { value: 1, label: "the day after" },
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

function WindowInfo() {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="What does the scan window do?"
        className="inline-flex size-4 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        <Info className="size-2.5" />
      </button>
      {open && (
        <span className="absolute left-5 top-0 z-20 w-72 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400 shadow-lg">
          <strong className="mb-1 block text-neutral-800 dark:text-neutral-200">Scan window (optional)</strong>
          When this ticket can be <strong>scanned at the door</strong>, set relative to each night — e.g. from 9 PM
          the night of until 2 AM the day after. Tickets can still be <strong>bought beforehand</strong>; sales close
          when the window ends. Leave blank for no limit.
        </span>
      )}
    </span>
  )
}

export function RecurringTierEditor({
  tiers,
  onChange,
}: {
  tiers: RecurringTierRow[]
  onChange: (tiers: RecurringTierRow[]) => void
}) {
  const update = (index: number, patch: Partial<RecurringTierRow>) => {
    const next = [...tiers]
    next[index] = { ...next[index], ...patch }
    if (patch.ticket_type === "free") next[index].priceInput = "0"
    onChange(next)
  }

  const addTier = () => onChange([...tiers, { ...EMPTY_RECURRING_TIER }])
  const removeTier = (index: number) => onChange(tiers.filter((_, i) => i !== index))

  return (
    <div className="space-y-3">
      {tiers.map((tier, i) => (
        <div key={i} className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/50 p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Name</Label>
              <Input value={tier.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="e.g. GA, VIP" />
            </div>
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

          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Scan window — relative to each night</span>
            <span className="text-xs font-normal text-neutral-400 dark:text-neutral-500">(optional)</span>
            <WindowInfo />
          </div>
          <div className="mt-1 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">From</Label>
              <Input type="time" value={tier.valid_from_time} onChange={(e) => update(i, { valid_from_time: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">&nbsp;</Label>
              <OffsetSelect idPrefix={`from_offset_${i}`} value={tier.valid_from_day_offset} onChange={(v) => update(i, { valid_from_day_offset: v })} />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Until</Label>
              <Input type="time" value={tier.valid_until_time} onChange={(e) => update(i, { valid_until_time: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">&nbsp;</Label>
              <OffsetSelect idPrefix={`until_offset_${i}`} value={tier.valid_until_day_offset} onChange={(v) => update(i, { valid_until_day_offset: v })} />
            </div>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
            Example: doors at 9 PM &ldquo;the night of&rdquo; until 2 AM &ldquo;the day after&rdquo;. Applies to every night in the series.
          </p>

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
