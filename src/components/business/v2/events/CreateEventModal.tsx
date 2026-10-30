"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, Clock, Loader2, MapPin } from "lucide-react"
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
import { ClockField, DatePickerField } from "@/components/business/v2/ui/clock-field"
import { durationLabel } from "@/lib/business/clock-entry"
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
/** Every event's clock today (Bizzy runs on US/Eastern end to end). */
const EVENT_TIMEZONE_LABEL = "America/New_York (ET)"

export function CreateEventModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Desktop: a centered 480px modal. Phone: the same form as a bottom
          sheet (mobile mock), scrolling inside when the keyboard is up. */}
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[480px] gap-5 overflow-y-auto rounded-[14px] p-6 max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:max-h-[92dvh] max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:left-0 max-sm:rounded-b-none max-sm:p-5">
        <DialogHeader>
          {/* Same Geist heading as every page title; Fredoka stays on the wordmark. */}
          <DialogTitle className="text-[22px] font-semibold tracking-tight">Create event</DialogTitle>
          <DialogDescription>Start with the essentials. Add tickets and artwork next.</DialogDescription>
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
  // The two halves the fields show; fields.*_date_time is their join.
  const [startDate, setStartDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endDate, setEndDate] = useState("")
  const [endTime, setEndTime] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")
  const [saving, setSaving] = useState(false)

  const venue = venues.find((v) => v.id === fields.venue_id) ?? null

  const join = (date: string, time: string) => (date && time ? `${date}T${time}` : "")
  const setStart = (date: string, time: string) => {
    setStartDate(date)
    setStartTime(time)
    const start = join(date, time)
    // A night is four hours unless the host says otherwise; Ends follows
    // Starts until the host sets an Ends after it.
    const keepEnd = !!fields.end_date_time && !!start && fields.end_date_time > start
    const end = keepEnd || !start ? fields.end_date_time : defaultEndForStart(start)
    if (!keepEnd && start) {
      setEndDate(end.slice(0, 10))
      setEndTime(end.slice(11, 16))
    }
    setFields((p) => ({ ...p, start_date_time: start, end_date_time: end }))
    setErrors((p) => ({ ...p, start_date_time: "", end_date_time: "" }))
  }
  const setEnd = (date: string, time: string) => {
    setEndDate(date)
    setEndTime(time)
    setFields((p) => ({ ...p, end_date_time: join(date, time) }))
    setErrors((p) => ({ ...p, end_date_time: "" }))
  }
  const duration = durationLabel(fields.start_date_time, fields.end_date_time)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validateDraftFields(fields)
    // A date with no clock yet: say which half is missing.
    if (startDate && !startTime) errs.start_date_time = "Add a start time"
    if (endDate && !endTime) errs.end_date_time = "Add an end time"
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
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <Label htmlFor="draft-name" className="mb-2 block">Event name</Label>
        <Input
          id="draft-name"
          autoFocus
          value={fields.name}
          maxLength={DRAFT_NAME_MAX}
          placeholder="e.g. Halloween Social"
          className="h-11 text-[15px]"
          onChange={(e) => {
            setFields((p) => ({ ...p, name: e.target.value.slice(0, DRAFT_NAME_MAX) }))
            setErrors((p) => ({ ...p, name: "" }))
          }}
        />
        {errors.name && <p className="mt-1.5 text-xs text-red-600 dark:text-[#FF6B72]">{errors.name}</p>}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Starts</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs text-neutral-500 dark:text-neutral-400 max-sm:sr-only">Date</p>
            <DatePickerField id="draft-start" label="Start date" placeholder="Day of" value={startDate} onChange={(d) => setStart(d, startTime)} />
          </div>
          <div>
            <p className="mb-1.5 text-xs text-neutral-500 dark:text-neutral-400 max-sm:sr-only">Time</p>
            <ClockField id="draft-start-time" label="Start time" value={startTime} onChange={(t) => setStart(startDate, t)} />
          </div>
        </div>
        {errors.start_date_time && <p className="text-xs text-red-600 dark:text-[#FF6B72]">{errors.start_date_time}</p>}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Ends</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs text-neutral-500 dark:text-neutral-400 max-sm:sr-only">Date</p>
            <DatePickerField id="draft-end" label="End date" placeholder="Next day" value={endDate} onChange={(d) => setEnd(d, endTime)} />
          </div>
          <div>
            <p className="mb-1.5 text-xs text-neutral-500 dark:text-neutral-400 max-sm:sr-only">Time</p>
            <ClockField id="draft-end-time" label="End time" placeholder="02:00" defaultPeriod="AM" value={endTime} onChange={(t) => setEnd(endDate, t)} />
          </div>
        </div>
        {errors.end_date_time && <p className="text-xs text-red-600 dark:text-[#FF6B72]">{errors.end_date_time}</p>}
        <p className="flex items-center gap-1.5 text-[13px] text-neutral-500 dark:text-neutral-400">
          <Clock aria-hidden className="size-3.5 shrink-0" />
          {duration ? `${duration} · ${EVENT_TIMEZONE_LABEL}` : EVENT_TIMEZONE_LABEL}
        </p>
      </fieldset>

      <div>
        <Label htmlFor="draft-venue" className="mb-2 block">Venue</Label>
        <div className="relative">
          <MapPin aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
          <Select
            id="draft-venue"
            value={fields.venue_id ?? ""}
            className="h-11 appearance-none pl-9 pr-9 text-[15px]"
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
          <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
        </div>
        {errors.venue_id && <p className="mt-1.5 text-xs text-red-600 dark:text-[#FF6B72]">{errors.venue_id}</p>}
      </div>

      {serverError && (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {serverError}
        </p>
      )}

      <DialogFooter className="-mx-6 -mb-6 mt-1 flex-col items-stretch gap-3 border-t border-neutral-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 max-sm:-mx-5 max-sm:-mb-5 max-sm:px-5">
        {/* Weekly Cover is its own product; the chooser keeps that door open. */}
        <Link
          href="/business/create"
          className="text-[13px] font-semibold text-[#C20C97] underline-offset-2 hover:underline dark:text-[#FF3ED1]"
        >
          Weekly Cover instead?
        </Link>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving} className="max-sm:h-11 max-sm:flex-1 max-sm:border max-sm:border-neutral-300 max-sm:dark:border-neutral-800">
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="max-sm:h-11 max-sm:flex-[2] sm:min-w-[9rem]">
            {saving && <Loader2 className="animate-spin" />}
            Create draft
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}
