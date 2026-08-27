"use client"

import { useMemo, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from "lucide-react"
import {
  joinDateTimeLocal,
  monthCells,
  parseDateTimeLocal,
  shiftMonth,
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
  const [open, setOpen] = useState(false)
  const parsed = parseDateTimeLocal(value)
  const date = parsed?.date ?? value.slice(0, 10)
  const time = parsed?.time ?? value.slice(11, 16)

  return (
    <div className={cn("relative", className)}>
      <div className="flex gap-2">
        <Input
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          placeholder="YYYY-MM-DDTHH:MM"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen((o) => !o)} aria-label="Open date and time picker">
          <CalendarDays className="size-4" />
        </Button>
      </div>
      {open && (
        <div className="absolute z-30 mt-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <CalendarGrid
            value={date}
            onPick={(next) => onChange(joinDateTimeLocal(next, time || "00:00"))}
          />
          <div className="mt-3">
            <Input
              type="time"
              value={time}
              onChange={(e) => onChange(joinDateTimeLocal(date || new Date().toLocaleDateString("en-CA"), e.target.value))}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function DateField({
  id,
  value,
  onChange,
  className,
}: {
  id?: string
  value: string
  onChange: (next: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className={cn("relative", className)}>
      <div className="flex gap-2">
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          placeholder="YYYY-MM-DD"
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
              setOpen(false)
            }}
          />
        </div>
      )}
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
  return (
    <div className={cn("relative", className)}>
      <div className="flex gap-2">
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          placeholder="HH:MM"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={() => setOpen((o) => !o)} aria-label="Open time picker">
          <Clock className="size-4" />
        </Button>
      </div>
      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <Input type="time" value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
      )}
    </div>
  )
}
