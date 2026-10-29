"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { useVenue } from "@/lib/business/venue-context"
import {
  DRAFT_NAME_MAX,
  buildDraftPayload,
  defaultEndForStart,
  draftEditorHref,
  validateDraftFields,
  type DraftFields,
} from "@/lib/business/create-draft"
import { useAuth } from "@/lib/business/auth-context"
import { addShellDraftId, browserStorage } from "@/lib/business/shell-drafts"
import { Button } from "@/components/business/v2/ui/button"
import { Input, Select } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { DateTimeField } from "@/components/business/v2/ui/date-time-field"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/business/v2/ui/dialog"

/**
 * BETA shell, locked decision 3: Create event = hybrid. This modal collects
 * the essentials (name · starts · ends · venue), POSTs a REAL draft through
 * the existing create API (`save_as_draft: true`), then opens the editor for
 * that id, where the step rail (Details → Tickets → Publish) takes over.
 *
 * Weekly Cover is a different product with its own wizard; the modal keeps
 * that door open with a plain link to the type chooser instead of a second
 * loud button.
 */
export function CreateEventModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-5 rounded-[14px]">
        <DialogHeader>
          <DialogTitle className="font-display-italic text-2xl">Create event</DialogTitle>
          <DialogDescription>Just the essentials. You add tickets and artwork next.</DialogDescription>
        </DialogHeader>
        {/* Radix unmounts the content when closed, so the form's state resets
            on every open without an effect. */}
        <DraftForm onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function DraftForm({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const { business } = useAuth()
  const { venues, selectedVenue, setSelectedVenue } = useVenue()
  // Prefill the venue from the switcher; a single-venue business never has to pick.
  const [fields, setFields] = useState<DraftFields>(() => ({
    name: "",
    start_date_time: "",
    end_date_time: "",
    venue_id: selectedVenue?.id ?? (venues.length === 1 ? venues[0].id : null),
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")
  const [saving, setSaving] = useState(false)

  const venue = venues.find((v) => v.id === fields.venue_id) ?? null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validateDraftFields(fields)
    setErrors(errs)
    if (Object.keys(errs).length > 0 || !venue) return
    setSaving(true)
    setServerError("")
    try {
      const data = await apiClient.post<{ event_id: number }>("/business/events", buildDraftPayload(fields, venue))
      // Keep live-after-approve and the detail page from publishing this
      // draft before the host does (see lib/business/shell-drafts.ts).
      addShellDraftId(browserStorage(), business?.business_id, data.event_id)
      // Keep the dashboard pointed at the venue the draft was made for.
      setSelectedVenue(venue.id)
      onClose()
      router.push(draftEditorHref(data.event_id))
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Couldn't create the draft. Please try again.")
      setSaving(false)
    }
  }

  if (venues.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Events are always attached to a venue. Set up your venue first and you will be back here in a minute.
        </p>
        <Button asChild>
          <Link href="/business/settings?action=add-venue">Set up venue</Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="draft-name" className="mb-2 block">Event name</Label>
        <Input
          id="draft-name"
          autoFocus
          value={fields.name}
          maxLength={DRAFT_NAME_MAX}
          placeholder="e.g. Halloween Bash"
          onChange={(e) => {
            setFields((p) => ({ ...p, name: e.target.value.slice(0, DRAFT_NAME_MAX) }))
            setErrors((p) => ({ ...p, name: "" }))
          }}
        />
        {errors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name}</p>}
      </div>

      <div>
        <Label htmlFor="draft-start" className="mb-2 block">Starts</Label>
        <DateTimeField
          id="draft-start"
          name="start_date_time"
          datePlaceholder="Day of"
          value={fields.start_date_time}
          onChange={(next) => {
            setFields((p) => ({
              ...p,
              start_date_time: next,
              // A night is four hours unless the host says otherwise.
              end_date_time: p.end_date_time && p.end_date_time > next ? p.end_date_time : defaultEndForStart(next),
            }))
            setErrors((p) => ({ ...p, start_date_time: "", end_date_time: "" }))
          }}
        />
        {errors.start_date_time && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.start_date_time}</p>}
      </div>

      <div>
        <Label htmlFor="draft-end" className="mb-2 block">Ends</Label>
        <DateTimeField
          id="draft-end"
          name="end_date_time"
          datePlaceholder="Next day"
          timePlaceholder="2:00 AM"
          value={fields.end_date_time}
          onChange={(next) => {
            setFields((p) => ({ ...p, end_date_time: next }))
            setErrors((p) => ({ ...p, end_date_time: "" }))
          }}
        />
        {errors.end_date_time && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.end_date_time}</p>}
      </div>

      <div>
        <Label htmlFor="draft-venue" className="mb-2 block">Venue</Label>
        <Select
          id="draft-venue"
          value={fields.venue_id ?? ""}
          onChange={(e) => {
            setFields((p) => ({ ...p, venue_id: Number(e.target.value) || null }))
            setErrors((p) => ({ ...p, venue_id: "" }))
          }}
        >
          <option value="" disabled>Select a venue</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </Select>
        {errors.venue_id && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.venue_id}</p>}
      </div>

      {serverError && (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {serverError}
        </p>
      )}

      <DialogFooter className="items-center sm:justify-between">
        <Link
          href="/business/create"
          className="text-[13px] font-medium text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          Setting up Weekly Cover instead?
        </Link>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Create draft
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}
