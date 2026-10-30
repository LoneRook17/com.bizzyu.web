"use client"

import { useMemo, useState, useSyncExternalStore } from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from "lucide-react"
import {
  clockFace,
  fmtFieldDate,
  parseClockEntry,
  sundayMonthCells,
  withPeriod,
  type Period,
} from "@/lib/business/clock-entry"
import { cn } from "@/lib/v2/utils"

/**
 * BETA biz-dash visual polish, Create event (mock 04). Two controls the Create
 * modal uses in place of the shared DateTimeField:
 *
 *   • ClockField — type HH:MM, pick AM / PM inline. No wheel, no popover.
 *   • DatePickerField — a centered date button; the calendar anchors under it
 *     on desktop and rises as a bottom sheet on a phone. Selection is a
 *     neutral fill, never a second green.
 *
 * Both are 44px and keep the plain value shapes the draft already carries
 * (`HH:MM` 24h, `YYYY-MM-DD`). The shared DateTimeField (EventForm, deals,
 * scan windows, Weekly Cover) is untouched.
 */

const FIELD =
  "flex h-11 w-full items-center rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 transition-colors dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
const FOCUS =
  "focus-within:border-[#0A8038] focus-within:ring-2 focus-within:ring-[#05EB54]/25 dark:focus-within:border-[#05EB54]/60"

export function ClockField({
  id,
  value,
  onChange,
  label,
  placeholder = "07:00",
  defaultPeriod = "PM",
}: {
  id?: string
  /** `HH:MM`, 24-hour. "" when empty. */
  value: string
  onChange: (next: string) => void
  /** Accessible name for the text box ("Start time"). */
  label: string
  placeholder?: string
  /** Which half of the day an empty field starts on. */
  defaultPeriod?: Period
}) {
  const face = clockFace(value)
  const [text, setText] = useState(face?.text ?? "")
  const [period, setPeriod] = useState<Period>(face?.period ?? defaultPeriod)

  // An outside change (Ends auto-filling from Starts) re-seeds the face;
  // adjusted during render, not in an effect, so there is no extra paint.
  const [seen, setSeen] = useState(value)
  if (value !== seen) {
    setSeen(value)
    const next = clockFace(value)
    if (next) {
      if (parseClockEntry(text, next.period)?.value !== value) setText(next.text)
      setPeriod(next.period)
    }
  }

  const type = (raw: string) => {
    const cleaned = raw.replace(/[^\d:]/g, "").slice(0, 5)
    setText(cleaned)
    if (!cleaned) {
      onChange("")
      return
    }
    const parsed = parseClockEntry(cleaned, period)
    if (parsed) {
      setPeriod(parsed.period)
      if (parsed.value !== value) onChange(parsed.value)
    }
  }

  const pick = (next: Period) => {
    setPeriod(next)
    if (value) onChange(withPeriod(value, next))
  }

  return (
    <div className={cn(FIELD, FOCUS, "pl-3 pr-1")}>
      <Clock aria-hidden className="size-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={label}
        placeholder={placeholder}
        value={text}
        onChange={(e) => type(e.target.value)}
        onBlur={() => {
          const f = clockFace(value)
          if (f) setText(f.text)
        }}
        className="h-full min-w-0 flex-1 bg-transparent text-center text-[15px] font-medium tabular-nums outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
      />
      <span aria-hidden className="mx-1 h-6 w-px bg-neutral-200 dark:bg-neutral-800" />
      <div role="group" aria-label={`${label} AM or PM`} className="flex items-center gap-0.5">
        {(["AM", "PM"] as const).map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={period === p}
            onClick={() => pick(p)}
            className={cn(
              "h-9 w-11 rounded-md text-[13px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#05EB54]/40",
              period === p
                ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-50"
                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-neutral-200",
            )}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}

const DESKTOP_QUERY = "(min-width: 640px)"

function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(DESKTOP_QUERY)
      mq.addEventListener("change", notify)
      return () => mq.removeEventListener("change", notify)
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true,
  )
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function MonthCalendar({
  value,
  onPick,
  onClear,
}: {
  value: string
  onPick: (iso: string) => void
  onClear: () => void
}) {
  const today = todayIso()
  const seed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : today
  const [cursor, setCursor] = useState({ year: Number(seed.slice(0, 4)), month: Number(seed.slice(5, 7)) - 1 })
  const cells = useMemo(() => sundayMonthCells(cursor.year, cursor.month), [cursor])
  const label = new Date(cursor.year, cursor.month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })
  const shift = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })

  return (
    <div className="w-full sm:w-[272px]">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{label}</p>
        <div className="flex items-center gap-0.5">
          <button type="button" aria-label="Previous month" onClick={() => shift(-1)} className="flex size-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" aria-label="Next month" onClick={() => shift(1)} className="flex size-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1" role="grid" aria-label={label}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="pb-1 text-center text-[11px] font-medium text-neutral-400 dark:text-neutral-500">{d}</div>
        ))}
        {cells.map((iso, i) =>
          iso == null ? (
            <div key={`b-${i}`} />
          ) : (
            <button
              key={iso}
              type="button"
              aria-pressed={iso === value}
              aria-label={fmtFieldDate(iso)}
              onClick={() => onPick(iso)}
              className={cn(
                "relative flex h-10 items-center justify-center rounded-md text-[13px] font-medium tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#05EB54]/40 sm:h-9",
                iso === value
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-950"
                  : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800",
              )}
            >
              {Number(iso.slice(8, 10))}
              {iso === today && iso !== value && (
                <span aria-hidden className="absolute bottom-1 size-1 rounded-full bg-neutral-400 dark:bg-neutral-500" />
              )}
            </button>
          ),
        )}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-neutral-200 pt-2.5 text-[12px] dark:border-neutral-800">
        <span className="text-neutral-500 dark:text-neutral-400">Today: {fmtFieldDate(today).replace(/, \d{4}$/, "").replace(/^\w+, /, "")}</span>
        <button type="button" onClick={onClear} className="font-medium text-neutral-700 hover:text-neutral-900 dark:text-neutral-200 dark:hover:text-white">
          Clear
        </button>
      </div>
    </div>
  )
}

export function DatePickerField({
  id,
  value,
  onChange,
  label,
  placeholder = "Pick a date",
}: {
  id?: string
  /** `YYYY-MM-DD`. "" when empty. */
  value: string
  onChange: (next: string) => void
  /** Accessible name ("Start date"); the sheet title on a phone. */
  label: string
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const desktop = useIsDesktop()
  const pick = (iso: string) => {
    onChange(iso)
    setOpen(false)
  }
  const clear = () => {
    onChange("")
    setOpen(false)
  }

  const trigger = (
    <button
      id={id}
      type="button"
      aria-label={value ? `${label}: ${fmtFieldDate(value)}` : label}
      onClick={desktop ? undefined : () => setOpen(true)}
      className={cn(FIELD, "relative justify-center px-3 outline-none focus-visible:border-[#0A8038] focus-visible:ring-2 focus-visible:ring-[#05EB54]/25 data-[state=open]:border-[#0A8038] dark:focus-visible:border-[#05EB54]/60 dark:data-[state=open]:border-[#05EB54]/60")}
    >
      <CalendarDays aria-hidden className="absolute left-3 size-4 text-neutral-400 dark:text-neutral-500" />
      <span className={cn("truncate text-[15px] font-medium", !value && "font-normal text-neutral-400 dark:text-neutral-600")}>
        {value ? fmtFieldDate(value) : placeholder}
      </span>
    </button>
  )

  if (desktop) {
    return (
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={6}
            className="z-[60] rounded-[10px] border border-neutral-200 bg-white p-3 shadow-xl outline-none dark:border-neutral-800 dark:bg-neutral-900"
          >
            <MonthCalendar value={value} onPick={pick} onClear={clear} />
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    )
  }

  return (
    <>
      {trigger}
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-neutral-950/50" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-[60] rounded-t-[14px] border-t border-neutral-200 bg-white px-4 pb-6 pt-3 outline-none dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            <DialogPrimitive.Title className="mb-3 text-base font-semibold text-neutral-900 dark:text-neutral-100">{label}</DialogPrimitive.Title>
            <MonthCalendar value={value} onPick={pick} onClear={clear} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
