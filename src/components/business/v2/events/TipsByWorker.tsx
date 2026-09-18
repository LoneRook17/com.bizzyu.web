"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import type { EventAnalytics } from "@/lib/business/types"
import { TIPS_BY_WORKER_TITLE, tipCountLabel, tipsByWorker } from "@/lib/business/event-tips"

// Tips by worker: sits inside the Tips tile. One row per worker (same
// attribution as Door Performance) with their tips total. Every row starts
// COLLAPSED, expanding it lists that worker's individual tip transactions.
// Renders nothing when the API sent no workers (no tips yet, or an older
// services deploy), so the tile just shows the amount + info note.

const TONES = {
  v2: {
    title: "text-xs font-medium text-neutral-500 dark:text-neutral-400",
    list: "divide-y divide-neutral-100 dark:divide-neutral-800 border-t border-neutral-100 dark:border-neutral-800",
    row: "hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
    name: "text-neutral-900 dark:text-neutral-100",
    meta: "text-neutral-500 dark:text-neutral-400",
    amount: "text-neutral-900 dark:text-neutral-100",
    tx: "text-neutral-600 dark:text-neutral-400",
  },
  legacy: {
    title: "text-xs font-medium text-gray-500",
    list: "divide-y divide-gray-100 border-t border-gray-100",
    row: "hover:bg-gray-50",
    name: "text-ink",
    meta: "text-gray-500",
    amount: "text-ink",
    tx: "text-gray-600",
  },
} as const

function usd2(val: number) {
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtTime(iso: string | null) {
  if (!iso) return "-"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "-"
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

export function TipsByWorker({ data, tone = "v2" }: { data: EventAnalytics; tone?: keyof typeof TONES }) {
  const workers = tipsByWorker(data)
  // Collapsed by default: nothing is open until the user expands a worker.
  const [open, setOpen] = useState<Record<string, boolean>>({})
  if (workers.length === 0) return null
  const c = TONES[tone]

  return (
    <div className="mt-4">
      <p className={`mb-2 ${c.title}`}>{TIPS_BY_WORKER_TITLE}</p>
      <ul className={c.list}>
        {workers.map((w) => {
          const expanded = open[w.key] === true
          const panelId = `tips-worker-${w.key.replace(/[^a-zA-Z0-9_-]/g, "_")}`
          return (
            <li key={w.key}>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen((prev) => ({ ...prev, [w.key]: !expanded }))}
                className={`flex w-full items-center gap-3 rounded-md px-1 py-2.5 text-left text-sm ${c.row}`}
              >
                <ChevronDown className={`size-4 shrink-0 transition-transform ${c.meta} ${expanded ? "" : "-rotate-90"}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate font-medium ${c.name}`}>{w.name}</span>
                  <span className={`block text-xs ${c.meta}`}>
                    {tipCountLabel(w.transactions.length)}
                    {w.scannerLabel ? `, ${w.scannerLabel}` : ""}
                  </span>
                </span>
                <span className={`font-medium tabular-nums ${c.amount}`}>{usd2(w.total)}</span>
              </button>
              {expanded && (
                <ul id={panelId} className="pb-2 pl-8 pr-1">
                  {w.transactions.map((t, idx) => (
                    <li key={t.orderId ?? idx} className={`flex items-baseline gap-3 py-1 text-xs ${c.tx}`}>
                      <span className="whitespace-nowrap">{fmtTime(t.createdAt)}</span>
                      <span className={`min-w-0 flex-1 truncate ${c.meta}`}>
                        {[t.doorUsd !== null ? `on ${usd2(t.doorUsd)} door sale` : null, t.statusLabel]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                      <span className={`font-medium tabular-nums ${c.amount}`}>{usd2(t.tipUsd)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
