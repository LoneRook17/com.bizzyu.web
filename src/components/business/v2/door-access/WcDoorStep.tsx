"use client"

import { ACCESS_ACCENT } from "@/lib/business/door-access"
import { promoterExtrasVisible } from "@/lib/business/create-publish"
import { trimMoney } from "@/lib/business/weekly-cover-nights"
import type { WcPromoDraft } from "@/lib/business/wc-create-promo"
import { AccessInfoTip } from "@/components/business/v2/door-access/AccessInfoTip"
import { AccessPillToggle } from "@/components/business/v2/door-access/AccessPillToggle"
import { WcPromoCodesDraft } from "@/components/business/v2/door-access/WcPromoCodesDraft"
import { WEEKLY_COVER_RADIO_CLASS } from "@/components/business/v2/door-access/WeeklyCoverAccent"
import { Input } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"

/**
 * Flutter extras step: At the door, promoter toggle, program-scoped promo
 * codes. Scan Window lives on the weekday ticket step. Less body text; (i)
 * for leftover help.
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
  promoDrafts,
  onPromoDrafts,
  promoDraftsError,
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
  promoDrafts: WcPromoDraft[]
  onPromoDrafts: (next: WcPromoDraft[]) => void
  promoDraftsError?: string
}) {
  const showPromoterExtras = promoterExtrasVisible(promotionEnabled, promoToggleDisabled)
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-1.5">
          <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            At the door
          </h2>
          <AccessInfoTip label="How does door check-in work?">
            Any phone camera opens the pass. Staff do not need the Bizzy scanner app or a login.
          </AccessInfoTip>
        </div>
        <p className="mt-1 text-[15px] text-neutral-600 dark:text-neutral-400">
          Guests scan with any phone camera and tap Check In.
        </p>
      </div>

      <div>
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Promoter</h3>
          {showPromoterExtras ? (
            <AccessInfoTip label="What is the promoter program?">
              Promoters share the program link and earn this on every pass they sell.
            </AccessInfoTip>
          ) : null}
        </div>

        <div className="mt-3 max-w-md rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <AccessPillToggle
            id="wc-promoter"
            checked={promotionEnabled}
            disabled={promoToggleDisabled}
            onCheckedChange={onPromotionEnabled}
            label="Enable promoter program"
          />
        </div>
        {promoToggleDisabled ? (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{promoDisabledReason}</p>
        ) : null}

        {showPromoterExtras ? (
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

      <div className="border-t border-neutral-200 pt-5 dark:border-neutral-800" style={{ borderColor: `${ACCESS_ACCENT}22` }}>
        <WcPromoCodesDraft drafts={promoDrafts} onChange={onPromoDrafts} error={promoDraftsError} />
      </div>
    </div>
  )
}
