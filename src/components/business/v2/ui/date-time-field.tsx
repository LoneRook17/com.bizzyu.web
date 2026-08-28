"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from "lucide-react"
import {
  clock12hSlots,
  formatClock12h,
  formatDateUs,
  isIsoDateString,
  isIsoTimeString,
  joinDateTimeLocal,
  parseClock12h,
  parseDateUs,
  monthCells,
  shiftMonth,
  splitDateTimeLocal,
} from "@/lib/business/datetime-value"
import { Button } from "@/components/business/v2/ui/button"
import { Input } from "@/components/business/v2/ui/input"
import { cn } from "@/lib/v2/utils"

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"]

function CalendarGrid({
  value,
  onPick,
}: {
  value: string
  onPick: (date: string) => void
}) {
  const initial = /^\d{4}-\d{2}-\d{2}/.test(value) ? value : ""
  const start = initial
    ? { year: Number(initial.slice(0, 4)), monthIndex: Number(initial.slice(5, 7)) - 1 }
    : { year: new Date().getFullYear(), monthIndex: new Date().getMonth() }
  const [cursor, setCursor] = useState(start)
  const cells = useMemo(() => monthCells(cursor.year, cursor.monthIndex), [cursor])
  const label = new Date(cursor.year, cursor.monthIndex, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className="w-[252px]">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setCursor((c) => shiftMonth(c.year, c.monthIndex, -1))}
          className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{label}</p>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setCursor((c) => shiftMonth(c.year, c.monthIndex, 1))}
          className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((d, i) => (
          <div key={`${d}-${i}`} className="pb-1 text-center text-[10px] font-bold uppercase text-neutral-400">
            {d}
          </div>
        ))}
        {cells.map((date, i) =>
          date == null ? (
            <div key={`b-${i}`} />
          ) : (
            <button
              key={date}
              type="button"
              onClick={() => onPick(date)}
              className={cn(
                "aspect-square rounded-md text-[12px] font-medium tabular-nums",
                date === value
                  ? "bg-[#05EB54] text-white"
                  : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
              )}
            >
              {Number(date.slice(8, 10))}
            </button>
          ),
        )}
      </div>
    </div>
  )
}

export function DateTimeField({
  id,
  name,
  value,
  onChange,
  className,
}: {
  id?: string
  name?: string
  value: string
  onChange: (next: string) => void
  className?: string
}) {
  const parts = splitDateTimeLocal(value)
  const [date, setDate] = useState(parts.date)
  const [time, setTime] = useState(parts.time)
  const lastEmitted = useRef(value)

  useEffect(() => {
    if (value === lastEmitted.current) return
    lastEmitted.current = value
    const next = splitDateTimeLocal(value)
    setDate(next.date)
    setTime(next.time)
  }, [value])

  const commit = (nextDate: string, nextTime: string) => {
    let nextTimeResolved = nextTime
    if (isIsoDateString(nextDate) && !nextTimeResolved) nextTimeResolved = "00:00"
    setDate(nextDate)
    setTime(nextTimeResolved)
    if (!nextDate && !nextTimeResolved) {
      lastEmitted.current = ""
      onChange("")
      return
    }
    if (isIsoDateString(nextDate) && isIsoTimeString(nextTimeResolved)) {
      const emitted = joinDateTimeLocal(nextDate, nextTimeResolved)
      lastEmitted.current = emitted
      onChange(emitted)
    }
  }

  return (
    <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2", className)}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <div>
        <p className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">Date</p>
        <DateField id={id} value={date} onChange={(next) => commit(next, time)} />
      </div>
      <div>
        <p className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">Time</p>
        <TimeField id={id ? `${id}_time` : undefined} value={time} onChange={(next) => commit(date, next)} />
      </div>
    </div>
  )
}

export function DateField({
  id,
  value,
  onChange,
  className,
  placeholder = "8/27/2026",
}: {
  id?: string
  value: string
  onChange: (next: string) => void
  className?: string
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState(() => formatDateUs(value))

  useEffect(() => {
    const next = formatDateUs(value)
    if (next) setTyped(next)
    else if (!value) setTyped("")
  }, [value])

  const commitTyped = (raw: string) => {
    setTyped(raw)
    const parsed = parseDateUs(raw)
    if (parsed) onChange(parsed)
    else if (raw.trim() === "") onChange("")
  }

  return (
    <div className={cn("relative", className)}>
      <div className="flex gap-2">
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={typed}
          onChange={(e) => commitTyped(e.target.value)}
        />
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen((o) => !o)} aria-label="Open date picker">
          <CalendarDays className="size-4" />
        </Button>
      </div>
      {open && (
        <div className="absolute z-30 mt-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <CalendarGrid
            value={value}
            onPick={(next) => {
              onChange(next)
              setTyped(formatDateUs(next))
              setOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}

function TimeList({
  value,
  onPick,
}: {
  value: string
  onPick: (time: string) => void
}) {
  const slots = useMemo(() => clock12hSlots(), [])
  const selected = isIsoTimeString(value.slice(0, 5)) ? value.slice(0, 5) : ""
  return (
    <div className="max-h-56 overflow-y-auto">
      {slots.map((slot) => (
        <button
          key={slot}
          type="button"
          onClick={() => onPick(slot)}
          className={cn(
            "flex w-full rounded-md px-2 py-1.5 text-left text-sm tabular-nums",
            slot === selected
              ? "bg-[#05EB54] font-semibold text-white"
              : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
          )}
        >
          {formatClock12h(slot)}
        </button>
      ))}
    </div>
  )
}

export function TimeField({
  id,
  value,
  onChange,
  className,
  disabled = false,
}: {
  id?: string
  value: string
  onChange: (next: string) => void
  className?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState(() => formatClock12h(value))

  useEffect(() => {
    const next = formatClock12h(value)
    if (next) setTyped(next)
    else if (!value) setTyped("")
  }, [value])

  const commitTyped = (raw: string) => {
    setTyped(raw)
    const parsed = parseClock12h(raw)
    if (parsed) onChange(parsed)
    else if (raw.trim() === "") onChange("")
  }

  return (
    <div className={cn("relative", className)}>
      <div className="flex gap-2">
        <Input
          id={id}
          type="text"
          placeholder="7:00 PM"
          value={typed}
          disabled={disabled}
          onChange={(e) => commitTyped(e.target.value)}
        />
        <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={() => setOpen((o) => !o)} aria-label="Open time picker">
          <Clock className="size-4" />
        </Button>
      </div>
      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <TimeList
            value={value}
            onPick={(next) => {
              onChange(next)
              setTyped(formatClock12h(next))
              setOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}
