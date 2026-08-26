"use client"

import { useState } from "react"
import { Users } from "lucide-react"

import type { InviteCandidate } from "@/lib/team-invite/types"
import { Button } from "@/components/business/v2/ui/button"
import { DialogFooter } from "@/components/business/v2/ui/dialog"

interface CandidatePickerProps {
  candidates: InviteCandidate[]
  contactValue: string
  loading: boolean
  onBack: () => void
  onChoose: (userId: number) => void
}

/**
 * 409 MULTIPLE_MATCHES: several accounts share this contact, so the owner says
 * which one they meant. Candidates arrive pre-masked from the server and are
 * rendered exactly as sent — the point is to let someone who knows the person
 * recognise them, without handing a business owner the full contact details of
 * three strangers who happen to share a phone number.
 */
export default function CandidatePicker({
  candidates, contactValue, loading, onBack, onChoose,
}: CandidatePickerProps) {
  const [selected, setSelected] = useState<number | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 dark:border-amber-900 dark:bg-amber-950/40">
        <Users className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" />
        <div>
          <p className="text-sm font-medium text-amber-900 dark:text-amber-300">
            {candidates.length} accounts use {contactValue}
          </p>
          <p className="mt-0.5 text-[13px] text-amber-800 dark:text-amber-400/90">
            Pick the person you meant. Only they can accept. Nobody else sharing this
            number gets access.
          </p>
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label="Choose which account to invite"
        className="flex flex-col gap-2"
      >
        {candidates.map((c) => {
          const active = selected === c.id
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(c.id)}
              className={`flex items-center justify-between rounded-xl border px-3.5 py-3 text-left transition-colors ${
                active
                  ? "border-primary bg-primary/5"
                  : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {c.masked_name}
                </p>
                <p className="mt-0.5 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                  {c.masked_contact}
                </p>
              </div>
              <span
                aria-hidden
                className={`ml-3 size-4 shrink-0 rounded-full border-2 ${
                  active ? "border-primary bg-primary" : "border-neutral-300 dark:border-neutral-700"
                }`}
              />
            </button>
          )
        })}
      </div>

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button
          type="button"
          disabled={selected === null || loading}
          onClick={() => selected !== null && onChoose(selected)}
        >
          {loading ? "Sending…" : "Invite this person"}
        </Button>
      </DialogFooter>
    </div>
  )
}
