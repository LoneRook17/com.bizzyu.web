"use client"

import { useState, type ReactNode } from "react"
import { Info } from "lucide-react"
import { Input } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"

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

// Reveal toggle for a ticket's scan window, matching the mobile app: off for a
// new ticket, on when the ticket already has a window (data always wins — an
// existing window can never be silently hidden), and turning it off calls
// onClear so an off ticket submits the same window fields as an untouched one.
export function ScanWindowToggle({
  label = "Scan window",
  info,
  hasWindow,
  onClear,
  children,
}: {
  label?: string
  info?: ReactNode
  hasWindow: boolean
  onClear: () => void
  children: ReactNode
}) {
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
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{label}</span>
        </label>
        <span className="text-xs font-normal text-neutral-400 dark:text-neutral-500">(optional)</span>
        {info}
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
    <ScanWindowToggle hasWindow={!!(valid_from || valid_until)} info={<ValidTimeInfo />} onClear={onClear}>
      <div className="mt-1 grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Valid from</Label>
          <Input
            type="datetime-local"
            value={(valid_from ?? "").replace(" ", "T").slice(0, 16)}
            onChange={(e) => onUpdate("valid_from", e.target.value)}
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Valid until</Label>
          <Input
            type="datetime-local"
            value={(valid_until ?? "").replace(" ", "T").slice(0, 16)}
            onChange={(e) => onUpdate("valid_until", e.target.value)}
          />
        </div>
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
        When this ticket can be scanned at the door. It can still be bought beforehand, sales just close when the window ends. Leave blank for no limit.
      </p>
    </ScanWindowToggle>
  )
}
