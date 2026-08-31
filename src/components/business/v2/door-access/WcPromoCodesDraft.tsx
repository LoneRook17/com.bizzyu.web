"use client"

import { Plus, Trash2 } from "lucide-react"
import {
  emptyWcPromoDraft,
  validateWcPromoDraft,
  type WcPromoDraft,
} from "@/lib/business/wc-create-promo"
import { AccessInfoTip } from "@/components/business/v2/door-access/AccessInfoTip"
import { Button } from "@/components/business/v2/ui/button"
import { Input, Select } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"

/**
 * Flutter WC create last-step promo codes. Program-scoped only: same payload
 * PromoCodesPanel posts to POST /business/door-access/:id/promo-codes after
 * Publish mints the series. Create holds drafts; no new promo model.
 */
export function WcPromoCodesDraft({
  drafts,
  onChange,
  error,
  addButtonVariant = "access-secondary",
  infoLabel = "What are program promo codes?",
  infoText = "These apply to every night of this Weekly Cover, not the whole venue.",
}: {
  drafts: WcPromoDraft[]
  onChange: (next: WcPromoDraft[]) => void
  error?: string
  addButtonVariant?: "access-secondary" | "secondary"
  infoLabel?: string
  infoText?: string
}) {
  const patch = (index: number, next: Partial<WcPromoDraft>) => {
    const copy = [...drafts]
    copy[index] = { ...copy[index], ...next }
    onChange(copy)
  }

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Promo codes</h3>
        <AccessInfoTip label={infoLabel}>
          {infoText}
        </AccessInfoTip>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {drafts.map((draft, i) => {
          const problem = draft.code.trim() || draft.discount_value ? validateWcPromoDraft(draft) : null
          return (
            <div
              key={draft.localId}
              className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 dark:border-neutral-800 dark:bg-neutral-900/40"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
                  Code {i + 1}
                </p>
                <button
                  type="button"
                  onClick={() => onChange(drafts.filter((_, j) => j !== i))}
                  aria-label={`Remove promo code ${i + 1}`}
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div>
                  <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Code</Label>
                  <Input
                    value={draft.code}
                    onChange={(e) => patch(i, { code: e.target.value.toUpperCase() })}
                    placeholder="COVER10"
                    autoCapitalize="characters"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Type</Label>
                  <Select
                    value={draft.discount_type}
                    onChange={(e) => patch(i, { discount_type: e.target.value as "percentage" | "flat" })}
                  >
                    <option value="percentage">Percent</option>
                    <option value="flat">Flat $</option>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">
                    {draft.discount_type === "percentage" ? "Percent" : "Amount ($)"}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={draft.discount_value}
                    onChange={(e) => patch(i, { discount_value: e.target.value })}
                    placeholder={draft.discount_type === "percentage" ? "10" : "5"}
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Max uses</Label>
                  <Input
                    type="number"
                    min="1"
                    value={draft.max_redemptions}
                    onChange={(e) => patch(i, { max_redemptions: e.target.value })}
                    placeholder="Unlimited"
                  />
                </div>
              </div>
              {problem ? <p className="mt-2 text-xs text-red-600 dark:text-red-400">{problem}</p> : null}
            </div>
          )
        })}
      </div>

      <Button
        type="button"
        variant={addButtonVariant}
        size="sm"
        className="mt-3"
        onClick={() => onChange([...drafts, emptyWcPromoDraft(`draft-${drafts.length + 1}-${drafts.length}`)])}
      >
        <Plus /> Add a code
      </Button>
      {error ? <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  )
}
