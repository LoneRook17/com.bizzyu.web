"use client"

import { useState, type ReactNode } from "react"
import { Info } from "lucide-react"
import { useProductCheckboxClass } from "@/components/business/v2/door-access/WeeklyCoverAccent"
import { DateTimeField } from "@/components/business/v2/ui/date-time-field"
import { Label } from "@/components/business/v2/ui/label"

export const SCAN_WINDOW_LABEL = "Limit when this ticket can be scanned"
export const SCAN_WINDOW_SUBTITLE =
  "Optional. For early entry (before 10 PM), late entry (after 1 AM), or a window. Tickets can still be bought earlier. Leave this off if they can get in all night."

export function ScanWindowInfo({ weekly = false }: { weekly?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="What does limit when this ticket can be scanned mean?"
        className="inline-flex size-4 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        <Info className="size-2.5" />
      </button>
      {open && (
        <span className="absolute left-5 top-0 z-20 w-72 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400 shadow-lg">
          <strong className="mb-1 block text-neutral-800 dark:text-neutral-200">{SCAN_WINDOW_LABEL}</strong>
          For early entry (before 10 PM), late entry (after 1 AM), or a window. Tickets can still be bought earlier.
          Leave this off if they can get in all night.
          {weekly ? " Applies every night in the series." : ""}
        </span>
      )}
    </span>
  )
}

export function ScanWindowExamples({ weekly = false }: { weekly?: boolean }) {
  return (
    <div className="mt-1.5 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
      <p>Before 10 PM: Until 10:00 same night</p>
      <p>After 1 AM: From 1:00 next morning</p>
      <p>9 PM to 2 AM: From 9:00 same night until 2:00 next morning</p>
      {weekly && <p className="mt-1">Applies every night in the series.</p>}
    </div>
  )
}

// Reveal toggle for a ticket's scan window, matching the mobile app: off for a
// new ticket, on when the ticket already has a window (data always wins — an
// existing window can never be silently hidden), and turning it off calls
// onClear so an off ticket submits the same window fields as an untouched one.
export function ScanWindowToggle({
  label = SCAN_WINDOW_LABEL,
  subtitle = SCAN_WINDOW_SUBTITLE,
  info,
  hasWindow,
  onClear,
  children,
}: {
  label?: string
  subtitle?: string
  info?: ReactNode
  hasWindow: boolean
  onClear: () => void
  children: ReactNode
}) {
  const [manuallyOpened, setManuallyOpened] = useState(hasWindow)
  const open = manuallyOpened || hasWindow
  const checkboxClass = useProductCheckboxClass()

  return (
    <>
      <div className="mt-3">
        <div className="flex items-center gap-1.5">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={open}
              onChange={(e) => {
                setManuallyOpened(e.target.checked)
                if (!e.target.checked) onClear()
              }}
              className={checkboxClass}
            />
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{label}</span>
          </label>
          {info}
        </div>
        {subtitle && (
          <p className="mt-1 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">{subtitle}</p>
        )}
      </div>
      {open && children}
    </>
  )
}

// Absolute valid_from/valid_until datetime inputs behind the reveal toggle.
// Used by the event ticket editor and the manage-tickets page; the recurring
// series editor composes ScanWindowToggle with its own relative fields.
export function ScanWindowSection({
  valid_from,
  valid_until,
  onUpdate,
  onClear,
}: {
  valid_from?: string | null
  valid_until?: string | null
  onUpdate: (field: "valid_from" | "valid_until", value: string) => void
  onClear: () => void
}) {
  return (
    <ScanWindowToggle hasWindow={!!(valid_from || valid_until)} info={<ScanWindowInfo />} onClear={onClear}>
      <div className="mt-1 grid grid-cols-1 gap-3">
        <div>
          <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">From</Label>
          <DateTimeField
            value={(valid_from ?? "").replace(" ", "T").slice(0, 16)}
            onChange={(next) => onUpdate("valid_from", next)}
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Until</Label>
          <DateTimeField
            value={(valid_until ?? "").replace(" ", "T").slice(0, 16)}
            onChange={(next) => onUpdate("valid_until", next)}
          />
        </div>
      </div>
      <ScanWindowExamples />
    </ScanWindowToggle>
  )
}
