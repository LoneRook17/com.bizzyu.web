"use client"

import { useState } from "react"
import { Pencil, Plus, Ticket } from "lucide-react"
import type { TicketTier } from "@/lib/business/types"
import { usd } from "@/lib/v2/utils"
import { Button } from "@/components/business/v2/ui/button"
import { Sheet, SheetContent } from "@/components/business/v2/ui/sheet"
import { TicketTierForm } from "./TicketTierForm"

/**
 * BETA shell: drawer chrome around the EXISTING tier editor.
 *
 * The editor's Tickets step shows a compact read-only list of tiers (name ·
 * price · quantity) and one button that opens TicketTierForm in a right-side
 * drawer. The form is untouched — same component, same `tiers`/`onChange`
 * contract against the parent form's state — so every rule it carries
 * (surge ladders, scan windows, 21+, max per person) rides along unchanged.
 */
export function TicketsDrawer({
  tiers,
  onChange,
  eventIs21Plus,
  error,
}: {
  tiers: TicketTier[]
  onChange: (tiers: TicketTier[]) => void
  eventIs21Plus?: boolean
  error?: string
}) {
  const [open, setOpen] = useState(false)
  const hasTiers = tiers.length > 0

  return (
    <div className="flex flex-col gap-3">
      {hasTiers ? (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {tiers.map((t, i) => {
            const price = t.ticket_type === "free" || !(Number(t.price_usd) > 0) ? "Free" : usd(Number(t.price_usd))
            const qty = t.quantity ? t.quantity.toLocaleString("en-US") : "Unlimited"
            return (
              <button
                key={`${t.ticket_id ?? "new"}-${i}`}
                type="button"
                onClick={() => setOpen(true)}
                className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
              >
                <Ticket className="size-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {t.name || "Untitled ticket"}
                  </span>
                  <span className="block text-[13px] text-neutral-500 dark:text-neutral-400">
                    {price} · {qty}
                    {t.surge_enabled ? " · Surge" : ""}
                    {t.valid_from || t.valid_until ? " · Scan window" : ""}
                  </span>
                </span>
                <Pencil className="size-3.5 shrink-0 text-neutral-300 dark:text-neutral-600" />
              </button>
            )
          })}
        </div>
      ) : (
        <p className="rounded-[10px] border border-dashed border-neutral-300 px-3 py-4 text-center text-[13px] text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          No tickets yet. Add at least one tier to sell.
        </p>
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div>
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
          {hasTiers ? <><Pencil /> Edit tickets</> : <><Plus /> Add ticket</>}
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          title="Tickets"
          description="Tiers, prices, quantities, scan windows, and surge."
          footer={
            <Button type="button" onClick={() => setOpen(false)}>
              Done
            </Button>
          }
        >
          <TicketTierForm tiers={tiers} onChange={onChange} eventIs21Plus={eventIs21Plus} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
