"use client"

import { useState } from "react"
import { Check, ChevronDown, Globe } from "lucide-react"
import { cn } from "@/lib/v2/utils"
import { editorCommitVenueIds, type VenueEditorModel } from "@/lib/business/team-venues"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/business/v2/ui/dropdown-menu"

interface VenueMultiSelectProps {
  /** What this editor may do: selectable venues, global allowed. */
  editor: VenueEditorModel
  /** Current committed effective ids. */
  value: number[]
  /** Parent-computed trigger label (member scope, or the live selection). */
  triggerLabel: string
  /**
   * "commit" (default, team row): buffer a draft, fire `onCommit` ONCE on close
   * when it changed — one PUT. "controlled" (invite): fire `onChange` live per
   * toggle; the parent owns `value`.
   */
  mode?: "commit" | "controlled"
  /** commit mode: the single write when the dropdown closes with a changed set. */
  onCommit?: (venueIds: number[]) => void
  /** controlled mode: the live selection on every toggle. */
  onChange?: (venueIds: number[]) => void
  disabled?: boolean
  align?: "start" | "end"
  className?: string
}

function sameSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  const sb = new Set(b)
  return a.every((x) => sb.has(x))
}

/**
 * TM-B3 (#15b) editor-scoped venue-SET editor. A checkbox dropdown over the
 * venues an editor MAY assign:
 *   • unrestricted (owner / global manager): every venue + "All venues (global)".
 *   • scoped manager: own venues only, global hidden, minimum one enforced. Per
 *     the 2026-07-27 ruling a scoped manager never sees the member's out-of-scope
 *     venues (no options, no locked chips); the server preserves them.
 * Reused by both the team row (commit-on-close) and the invite dialog (controlled).
 */
export default function VenueMultiSelect({
  editor, value, triggerLabel,
  mode = "commit", onCommit, onChange, disabled, align = "end", className,
}: VenueMultiSelectProps) {
  const selectableIds = editor.selectableVenues.map((v) => v.id)
  const selectableSet = new Set(selectableIds)

  // The editor only ever toggles SELECTABLE ids; locked ids are added at commit.
  const selectedFromValue = value.filter((id) => selectableSet.has(id))

  // commit mode buffers a draft; controlled mode reads straight from `value`.
  const [draft, setDraft] = useState<number[]>(selectedFromValue)
  const selected = mode === "controlled" ? selectedFromValue : draft

  const isDisabled = disabled || !editor.canEdit

  const handleOpenChange = (open: boolean) => {
    if (mode !== "commit") return
    if (open) {
      setDraft(selectedFromValue) // re-seed from the committed value each open
      return
    }
    const final = editorCommitVenueIds(editor, draft)
    // Scoped editors can't clear to global; a would-be-empty commit is dropped.
    if (!editor.allowGlobal && final.length === 0) return
    if (sameSet(final, value)) return
    // TF-DRIVE-W1: deselecting the last venue is a real state change — it grants
    // the member ALL venues (empty set = global on the server), not "no access".
    // Never save that silently; make the owner confirm the intent explicitly.
    if (editor.allowGlobal && final.length === 0) {
      const ok = typeof window === "undefined" || window.confirm("Give this member access to all venues?")
      if (!ok) {
        setDraft(selectedFromValue) // abandon the empty draft; keep committed scope
        return
      }
    }
    onCommit?.(final)
  }

  const emit = (nextSelected: number[]) => {
    if (mode === "controlled") {
      const final = editorCommitVenueIds(editor, nextSelected)
      if (!editor.allowGlobal && final.length === 0) return // minimum one
      onChange?.(final)
    } else {
      setDraft(nextSelected)
    }
  }

  const toggle = (venueId: number) => {
    const next = selected.includes(venueId)
      ? selected.filter((v) => v !== venueId)
      : [...selected, venueId]
    // Minimum one for scoped editors with nothing locked to fall back on.
    if (!editor.allowGlobal && editor.lockedVenueIds.length === 0 && next.length === 0) return
    emit(next)
  }

  const clearToGlobal = () => {
    if (!editor.allowGlobal) return
    emit([])
  }

  const isGlobal = editor.allowGlobal && selected.length === 0 && editor.lockedVenueIds.length === 0

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        disabled={isDisabled}
        title="Venue assignment"
        className={cn(
          "flex h-8 min-w-0 flex-1 items-center justify-between gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 text-xs text-neutral-700 dark:text-neutral-300 outline-none transition-colors hover:border-neutral-400 dark:hover:border-neutral-600 focus-visible:ring-2 focus-visible:ring-[#05EB54]/40 disabled:opacity-50 sm:w-[160px] sm:flex-none",
          className,
        )}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown className="size-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} className="min-w-[13rem]">
        <DropdownMenuLabel>Venue access</DropdownMenuLabel>

        {editor.allowGlobal && (
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); clearToGlobal() }}>
            <Globe />
            <span className="flex-1">All venues (global)</span>
            {isGlobal && <Check className="text-[#05EB54]" />}
          </DropdownMenuItem>
        )}

        {editor.selectableVenues.length > 0 && <DropdownMenuSeparator />}

        {editor.selectableVenues.map((v) => {
          const active = selected.includes(v.id)
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
