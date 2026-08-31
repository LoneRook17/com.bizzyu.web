"use client"

// The held-money history list. One component, two placements: Home hero and
// Settings → Payments, both via EscrowPanel. Organization only: a collapsed
// History toggle, then event groups that expand to the same order rows.

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import {
  centsUsd,
  signedCentsUsd,
  fmtEntryTimestamp,
  entryLabel,
  entryStatusBadge,
  groupEscrowEntriesByEvent,
  type EscrowEventGroup,
  type EscrowLedgerEntry,
} from "@/lib/business/escrow"
import { cn } from "@/lib/v2/utils"
import { Badge } from "@/components/business/v2/ui/badge"

function LedgerRow({ entry, withBorder }: { entry: EscrowLedgerEntry; withBorder: boolean }) {
  const label = entryLabel(entry)
  const badge = entryStatusBadge(entry)
  return (
    <div className={cn("flex items-center gap-3 px-5 py-3", withBorder && "border-t border-neutral-100 dark:border-neutral-800")}>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{label.title}</span>
          {badge && <Badge variant={badge.variant} size="sm">{badge.label}</Badge>}
        </span>
        <span className="block truncate text-[13px] text-neutral-500 dark:text-neutral-400">
          {label.reference ? `${label.reference} · ` : ""}{fmtEntryTimestamp(entry.created_at)}
        </span>
      </span>
      <span className={cn(
        "shrink-0 text-sm font-semibold tabular-nums",
        entry.amount_cents > 0 ? "text-green-600 dark:text-green-400" : "text-neutral-900 dark:text-neutral-100",
      )}>
        {signedCentsUsd(entry.amount_cents)}
      </span>
    </div>
  )
}

function EventGroup({ group }: { group: EscrowEventGroup }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t border-neutral-100 dark:border-neutral-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 px-5 py-3 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
      >
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-neutral-400 transition-transform dark:text-neutral-500",
            open && "rotate-180",
          )}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {group.eventName}
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
          {centsUsd(group.totalCents)}
        </span>
      </button>
      {open && (
        <div className="border-t border-neutral-100 dark:border-neutral-800">
          {group.entries.map((entry, i) => (
            <LedgerRow key={entry.id} entry={entry} withBorder={i > 0} />
          ))}
        </div>
      )}
    </div>
  )
}

/** Held history: collapsed History (N) toggle, then event groups, then orders. */
export default function EscrowHistory({ entries }: { entries: EscrowLedgerEntry[] }) {
  const [open, setOpen] = useState(false)
  if (entries.length === 0) return null
  const groups = groupEscrowEntriesByEvent(entries)

  return (
    <div className="border-t border-neutral-100 dark:border-neutral-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 px-5 py-3 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
      >
        <span className="min-w-0 flex-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
          History ({entries.length})
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-neutral-400 transition-transform dark:text-neutral-500",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div>
          {groups.map((group) => (
            <EventGroup key={group.key} group={group} />
          ))}
        </div>
      )}
    </div>
  )
}
