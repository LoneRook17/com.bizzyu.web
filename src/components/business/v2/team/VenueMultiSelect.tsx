"use client"

import { useState } from "react"
import { Check, ChevronDown, Globe } from "lucide-react"
import { cn } from "@/lib/v2/utils"
import type { Venue } from "@/lib/business/types"
import { venueScopeLabel, type MemberVenueScope } from "@/lib/business/team-venues"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/business/v2/ui/dropdown-menu"

interface VenueMultiSelectProps {
  /** Current member scope, so the trigger label reflects committed state. */
  member: MemberVenueScope
  /** The business's venues, already in hand from the venue context. */
  venues: Venue[]
  /** Current selected ids (effective set). */
  value: number[]
  /** Fires once on close when the draft differs — an empty array = clear to global. */
  onCommit: (venueIds: number[]) => void
  disabled?: boolean
}

function sameSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  const sb = new Set(b)
  return a.every((x) => sb.has(x))
}

/**
 * TM-B2 venue-SET editor: a checkbox dropdown over the business's venues.
 * "All venues (global)" clears the set (empty = global). Selecting/deselecting
 * individual venues builds a set. Commits once on close so a single PUT lands.
 */
export default function VenueMultiSelect({ member, venues, value, onCommit, disabled }: VenueMultiSelectProps) {
  const [draft, setDraft] = useState<number[]>(value)

  const handleOpenChange = (open: boolean) => {
    if (open) {
      // Re-seed from the committed value each time it opens.
      setDraft(value)
      return
    }
    if (!sameSet(draft, value)) onCommit([...draft].sort((a, b) => a - b))
  }

  const toggle = (venueId: number) => {
    setDraft((prev) => (prev.includes(venueId) ? prev.filter((v) => v !== venueId) : [...prev, venueId]))
  }

  const clearToGlobal = () => setDraft([])

  const isGlobal = draft.length === 0

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        disabled={disabled}
        title="Venue assignment"
        className={cn(
          "flex h-8 min-w-0 flex-1 items-center justify-between gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 text-xs text-neutral-700 dark:text-neutral-300 outline-none transition-colors hover:border-neutral-400 dark:hover:border-neutral-600 focus-visible:ring-2 focus-visible:ring-[#05EB54]/40 disabled:opacity-50 sm:w-[160px] sm:flex-none",
        )}
      >
        <span className="truncate">{venueScopeLabel(member, venues)}</span>
        <ChevronDown className="size-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[13rem]">
        <DropdownMenuLabel>Venue access</DropdownMenuLabel>

        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); clearToGlobal() }}>
          <Globe />
          <span className="flex-1">All venues (global)</span>
          {isGlobal && <Check className="text-[#05EB54]" />}
        </DropdownMenuItem>

        {venues.length > 0 && <DropdownMenuSeparator />}

        {venues.map((v) => {
          const active = draft.includes(v.id)
          return (
            <DropdownMenuItem key={v.id} onSelect={(e) => { e.preventDefault(); toggle(v.id) }}>
              <span className={cn("flex-1 truncate", active && "font-medium text-neutral-900 dark:text-neutral-100")}>{v.name}</span>
              {active && <Check className="text-[#05EB54]" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
