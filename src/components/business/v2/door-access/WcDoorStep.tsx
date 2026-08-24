"use client"

import { Camera } from "lucide-react"
import { cn } from "@/lib/v2/utils"
import { ACCESS_ACCENT, ACCESS_INK } from "@/lib/business/door-access"
import { trimMoney } from "@/lib/business/weekly-cover-nights"
import { WEEKLY_COVER_CHECKBOX_CLASS, WEEKLY_COVER_RADIO_CLASS } from "@/components/business/v2/door-access/WeeklyCoverAccent"
import { Input } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"

/**
 * Flutter extras step, minus everything the app does not ask: no promo codes,
 * stock alerts, or follower blast. Camera check-in is a fact of the product,
 * not a toggle — the host just reads what the door will do.
 */
export function WcDoorStep({
  promotionEnabled,
  onPromotionEnabled,
  commissionType,
  onCommissionType,
  promotionValueInput,
  onPromotionValueInput,
  promoToggleDisabled,
  promoDisabledReason,
  cheapestPaid,
  commissionError,
}: {
  promotionEnabled: boolean
  onPromotionEnabled: (on: boolean) => void
  commissionType: "percent" | "fixed"
  onCommissionType: (next: "percent" | "fixed") => void
  promotionValueInput: string
  onPromotionValueInput: (next: string) => void
  promoToggleDisabled: boolean
  promoDisabledReason: string
  cheapestPaid: number | null
  commissionError?: string
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          At the door
        </h2>
        <p className="mt-1 text-[15px] text-neutral-600 dark:text-neutral-400">
          Guests scan with any phone camera and tap Check In. No staff login.
        </p>
      </div>

      <div
        className="flex items-start gap-3 rounded-xl px-4 py-3"
        style={{ backgroundColor: `${ACCESS_ACCENT}14`, border: `1px solid ${ACCESS_ACCENT}40` }}
      >
        <span
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: ACCESS_ACCENT, color: ACCESS_INK }}
        >
          <Camera className="size-4" />
        </span>
        <span className="min-w-0 text-[13.5px] leading-snug text-neutral-700 dark:text-neutral-300">
          Any phone camera opens the pass. Staff do not need the Bizzy scanner
          app or a login.
        </span>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Promoter</h3>
        <p className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
          Promoters share the program link and earn this on every pass they sell.
        </p>

        <label
          className={cn(
            "mt-3 flex w-fit items-center gap-2",
            promoToggleDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          )}
          title={promoToggleDisabled ? promoDisabledReason : undefined}
        >
          <input
            type="checkbox"
            checked={promotionEnabled}
            disabled={promoToggleDisabled}
            onChange={(e) => onPromotionEnabled(e.target.checked)}
            className={WEEKLY_COVER_CHECKBOX_CLASS}
          />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">Enable promoter program</span>
        </label>
        {promoToggleDisabled ? (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{promoDisabledReason}</p>
        ) : null}

        {promotionEnabled && !promoToggleDisabled ? (
          <div className="mt-4 space-y-3">
            <div>
              <p className="mb-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">Commission</p>
              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="da_commission_type"
                    checked={commissionType === "percent"}
                    onChange={() => onCommissionType("percent")}
                    className={WEEKLY_COVER_RADIO_CLASS}
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">Percent</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="da_commission_type"
                    checked={commissionType === "fixed"}
                    onChange={() => onCommissionType("fixed")}
                    className={WEEKLY_COVER_RADIO_CLASS}
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">Fixed</span>
                </label>
              </div>
            </div>
            <div>
              <Label htmlFor="da_commission_value" className="mb-1.5 block">
                {commissionType === "percent" ? "Percent" : "Amount ($)"}
              </Label>
              <Input
                id="da_commission_value"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                className="w-40"
                placeholder={commissionType === "percent" ? "e.g. 10" : "e.g. 5.00"}
                value={promotionValueInput}
                onChange={(e) => onPromotionValueInput(e.target.value)}
              />
              {commissionType === "fixed" && cheapestPaid != null ? (
                <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                  Up to ${trimMoney(cheapestPaid / 2)}, half your cheapest paid price.
                </p>
              ) : null}
              {commissionError ? (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{commissionError}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
