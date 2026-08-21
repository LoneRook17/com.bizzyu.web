"use client"

import { Input, Select } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"

interface StockAlertsFieldsProps {
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  thresholdType: "percent" | "count"
  onThresholdTypeChange: (type: "percent" | "count") => void
  thresholdInput: string
  onThresholdInputChange: (value: string) => void
  notifyTeam: boolean
  onNotifyTeamChange: (notify: boolean) => void
  error?: string
  idPrefix?: string
}

/**
 * Stock alerts — sold-out notification, plus an optional low-stock warning.
 *
 * Extracted verbatim from EventForm so the same control can sit in BOTH places
 * 5.0 wants it: step 2 of creation, and Manage sales on the management page
 * (F11 — "Manage Tickets absorbs … Stock Alerts"). Presentational only; the
 * caller owns the state and the `lowstockInputToStored` validation, so create
 * and post-create editing can never drift apart.
 */
export function StockAlertsFields({
  enabled,
  onEnabledChange,
  thresholdType,
  onThresholdTypeChange,
  thresholdInput,
  onThresholdInputChange,
  notifyTeam,
  onNotifyTeamChange,
  error,
  idPrefix = "",
}: StockAlertsFieldsProps) {
  const typeId = `${idPrefix}lowstock_threshold_type`
  const valueId = `${idPrefix}lowstock_threshold_value`

  return (
    <>
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="size-4 rounded border-neutral-300 dark:border-neutral-700 text-[#05EB54] focus:ring-[#05EB54]"
        />
        <span className="text-sm text-neutral-700 dark:text-neutral-300">Notify me when a ticket tier sells out</span>
      </label>

      {enabled && (
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Also warn me when it&apos;s running low</p>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">Optional — leave blank to only be notified on sell-out.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor={typeId} className="mb-1.5 block">Warn on</Label>
              <Select
                id={typeId}
                value={thresholdType}
                onChange={(e) => onThresholdTypeChange(e.target.value as "percent" | "count")}
              >
                <option value="percent">Percent left</option>
                <option value="count">Tickets left</option>
              </Select>
            </div>
            <div>
              <Label htmlFor={valueId} className="mb-1.5 block">
                Threshold {thresholdType === "percent" ? "(%)" : "(tickets)"}
              </Label>
              <Input
                id={valueId}
                type="number"
                inputMode="numeric"
                step="1"
                min="1"
                max={thresholdType === "percent" ? "100" : undefined}
                className="w-40"
                placeholder={thresholdType === "percent" ? "e.g. 10" : "e.g. 20"}
                value={thresholdInput}
                onChange={(e) => onThresholdInputChange(e.target.value)}
              />
              {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={notifyTeam}
              onChange={(e) => onNotifyTeamChange(e.target.checked)}
              className="size-4 rounded border-neutral-300 dark:border-neutral-700 text-[#05EB54] focus:ring-[#05EB54]"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Also notify business team</span>
          </label>
        </div>
      )}
    </>
  )
}
