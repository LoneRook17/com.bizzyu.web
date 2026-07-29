"use client"

import { useState } from "react"
import { Info, Plus, Trash2 } from "lucide-react"
import { TICKET_TYPES } from "@/lib/business/constants"
import type { TicketTier } from "@/lib/business/types"
import { Button } from "@/components/business/v2/ui/button"
import { Input, Select, Textarea } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
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
}

// Matches the mobile app's ticket-description field (optional, 64-char cap).
export const TICKET_DESCRIPTION_MAX = 64

const TICKET_TYPE_LABELS: Record<string, string> = {
  paid: "Paid",
  free: "Free",
}

function ValidTimeInfo() {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="What does the redeemable / scan window do?"
        className="inline-flex size-4 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        <Info className="size-2.5" />
      </button>
      {open && (
        <span className="absolute left-5 top-0 z-20 w-72 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400 shadow-lg">
          <strong className="mb-1 block text-neutral-800 dark:text-neutral-200">Redeemable / scan window (optional)</strong>
          Sets when this ticket can be <strong>scanned in at the door</strong>. It can still be{" "}
          <strong>bought beforehand</strong>, sales just <strong>close when the window ends</strong>.
        </span>
      )}
    </span>
  )
}

// Scan-window inputs behind a reveal toggle, matching the mobile app: off for a
// new ticket, on (values pre-filled) when the tier already has a window, and
// turning it off clears both fields — so an off tier submits the same
// valid_from/valid_until as an untouched one.
function ScanWindowSection({
  tier,
  onUpdate,
  onClear,
}: {
  tier: TicketTier
  onUpdate: (field: "valid_from" | "valid_until", value: string) => void
  onClear: () => void
}) {
  const hasWindow = !!(tier.valid_from || tier.valid_until)
  const [manuallyOpened, setManuallyOpened] = useState(hasWindow)
  const open = manuallyOpened || hasWindow

  return (
    <>
      <div className="mt-3 flex items-center gap-1.5">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={open}
            onChange={(e) => {
              setManuallyOpened(e.target.checked)
              if (!e.target.checked) onClear()
            }}
            className="size-4 rounded border-neutral-300 dark:border-neutral-700 text-[#05EB54] focus:ring-[#05EB54]"
          />
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Scan window</span>
        </label>
        <span className="text-xs font-normal text-neutral-400 dark:text-neutral-500">(optional)</span>
        <ValidTimeInfo />
      </div>
      {open && (
        <>
          <div className="mt-1 grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Valid from</Label>
              <Input
                type="datetime-local"
                value={(tier.valid_from ?? "").replace(" ", "T").slice(0, 16)}
                onChange={(e) => onUpdate("valid_from", e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Valid until</Label>
              <Input
                type="datetime-local"
                value={(tier.valid_until ?? "").replace(" ", "T").slice(0, 16)}
                onChange={(e) => onUpdate("valid_until", e.target.value)}
              />
            </div>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
            When this ticket can be scanned at the door. It can still be bought beforehand, sales just close when the window ends. Leave blank for no limit.
          </p>
        </>
      )}
    </>
  )
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
            tier={tier}
            onUpdate={(field, value) => updateTier(i, field, value)}
            onClear={() => clearTierWindow(i)}
          />

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
