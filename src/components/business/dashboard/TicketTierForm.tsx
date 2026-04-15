"use client"

import { TICKET_TYPES } from "@/lib/business/constants"
import type { TicketTier } from "@/lib/business/types"

interface TicketTierFormProps {
  tiers: TicketTier[]
  onChange: (tiers: TicketTier[]) => void
}

const EMPTY_TIER: TicketTier = {
  name: "",
  price_usd: 0,
  quantity: 0,
  max_per_person: 0,
  ticket_type: "paid",
}

const TICKET_TYPE_LABELS: Record<string, string> = {
  paid: "Paid",
  free: "Free",
  guest: "Guest",
}

export default function TicketTierForm({ tiers, onChange }: TicketTierFormProps) {
  const updateTier = (index: number, field: keyof TicketTier, value: string | number) => {
    const updated = [...tiers]
    updated[index] = { ...updated[index], [field]: value }
    // If ticket_type is free, reset price
    if (field === "ticket_type" && value === "free") {
      updated[index].price_usd = 0
    }
    onChange(updated)
  }

  const addTier = () => {
    onChange([...tiers, { ...EMPTY_TIER }])
  }

  const removeTier = (index: number) => {
    onChange(tiers.filter((_, i) => i !== index))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Ticket Tiers</label>
      <div className="space-y-3">
        {tiers.map((tier, i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs text-gray-500 mb-1">Name</label>
                <input
                  type="text"
                  value={tier.name}
                  onChange={(e) => updateTier(i, "name", e.target.value)}
                  placeholder="e.g. GA, VIP"
                  className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Type</label>
                <select
                  value={tier.ticket_type}
                  onChange={(e) => updateTier(i, "ticket_type", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
                >
                  {TICKET_TYPES.map((t) => (
                    <option key={t} value={t}>{TICKET_TYPE_LABELS[t] || t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Price ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tier.price_usd}
                  onChange={(e) => updateTier(i, "price_usd", e.target.value === "" ? "" as any : parseFloat(e.target.value))}
                  onBlur={() => { if (tier.price_usd === "" as any || isNaN(tier.price_usd)) updateTier(i, "price_usd", 0) }}
                  disabled={tier.ticket_type === "free"}
                  className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Quantity <span className="text-gray-400 font-normal">(0 = unlimited)</span></label>
                <input
                  type="number"
                  min="0"
                  value={tier.quantity}
                  onChange={(e) => updateTier(i, "quantity", e.target.value === "" ? "" as any : parseInt(e.target.value))}
                  onBlur={() => { if (tier.quantity === "" as any || isNaN(tier.quantity)) updateTier(i, "quantity", 0) }}
                  placeholder="0 = unlimited"
                  className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Max per person:</label>
                <input
                  type="number"
                  min="0"
                  value={tier.max_per_person ?? 0}
                  onChange={(e) => updateTier(i, "max_per_person", e.target.value === "" ? "" as any : parseInt(e.target.value))}
                  onBlur={() => { if (tier.max_per_person === "" as any || isNaN(tier.max_per_person ?? 0)) updateTier(i, "max_per_person", 0) }}
                  placeholder="0 = unlimited"
                  className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <span className="text-xs text-gray-400">(0 = unlimited)</span>
              </div>
              {tiers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTier(i)}
                  className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addTier}
        className="mt-2 text-sm font-medium text-primary hover:underline cursor-pointer"
      >
        + Add Ticket Tier
      </button>
    </div>
  )
}
