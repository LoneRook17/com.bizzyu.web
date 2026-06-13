"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Heart, ImageIcon, Info, Loader2 } from "lucide-react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { REDEMPTION_OPTIONS } from "@/lib/business/constants"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue } from "@/lib/business/venue-context"
import { cn } from "@/lib/v2/utils"
import type { DealFormData } from "@/lib/business/types"
import { Button } from "@/components/business/v2/ui/button"
import { Card, CardContent } from "@/components/business/v2/ui/card"
import { Badge } from "@/components/business/v2/ui/badge"
import { Input, Textarea, Select } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import ImageUpload from "./ImageUpload"

interface DealFormProps {
  initialData?: Partial<DealFormData>
  dealId?: number
}

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
type DayWindow = { enabled: boolean; start: string; end: string }

export default function DealForm({ initialData, dealId }: DealFormProps) {
  const router = useRouter()
  const { business, isPending } = useAuth()
  const { venues, selectedVenue, setSelectedVenue } = useVenue()
  const isEditing = !!dealId

  const [form, setForm] = useState<DealFormData>({
    deal_title: initialData?.deal_title || "",
    description: initialData?.description || "",
    total_saving: initialData?.total_saving || "",
    redemption_frequency: initialData?.redemption_frequency || "",
    start_date: initialData?.start_date || "",
    expired_date: initialData?.expired_date || "",
    deal_image_path: initialData?.deal_image_path || "",
  })

  // Per-day availability windows. Seed 7 slots from initialData, trimming the
  // server's "HH:MM:SS" to "HH:MM" for <input type="time">.
  const [availabilityLimited, setAvailabilityLimited] = useState<boolean>(
    (initialData?.availability_windows?.length ?? 0) > 0
  )
  const [windows, setWindows] = useState<DayWindow[]>(() => {
    const slots: DayWindow[] = DAY_LABELS.map(() => ({ enabled: false, start: "", end: "" }))
    for (const w of initialData?.availability_windows ?? []) {
      const d = Number(w.day_of_week)
      if (d >= 0 && d <= 6) {
        slots[d] = { enabled: true, start: (w.start_time || "").slice(0, 5), end: (w.end_time || "").slice(0, 5) }
      }
    }
    return slots
  })

  const updateWindow = (day: number, patch: Partial<DayWindow>) => {
    setWindows((prev) => prev.map((w, i) => (i === day ? { ...w, ...patch } : w)))
  }

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)
  const [moderationNotice, setModerationNotice] = useState("")
  const [showFreqInfo, setShowFreqInfo] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }))
    setServerError("")
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!selectedVenue) errs.venue = "Please select a venue"
    if (!form.deal_title.trim()) errs.deal_title = "Deal title is required"
    if (!form.description.trim()) errs.description = "Description is required"
    if (!form.total_saving.trim()) errs.total_saving = "Estimated savings is required"
    if (!form.redemption_frequency) errs.redemption_frequency = "Redemption frequency is required"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setServerError("")
    setModerationNotice("")

    try {
      const selectedOption = REDEMPTION_OPTIONS.find((o) => o.value === form.redemption_frequency)
      const dealType = selectedOption?.dealType || "Daily"
      const savingsNum = parseFloat(form.total_saving.replace(/[$,]/g, "")) || 0

      // Only enabled days with both times become windows; empty array = always
      // available (and, on edit, clears any previously-set windows).
      const availability_windows = availabilityLimited
        ? windows.flatMap((w, day) =>
            w.enabled && w.start && w.end
              ? [{ day_of_week: day, start_time: w.start, end_time: w.end }]
              : []
          )
        : []

      const payload = {
        deal_title: form.deal_title,
        description: form.description,
        deal_type: dealType,
        deal_image_path: form.deal_image_path || undefined,
        start_date: form.start_date || undefined,
        expired_date: form.expired_date || undefined,
        total_saving: savingsNum,
        venue_id: selectedVenue?.id,
        availability_windows,
      }

      if (isEditing) {
        await apiClient.put(`/business/deals/${dealId}`, payload)
        router.push(`/business/v2/deals/${dealId}`)
      } else {
        const data = await apiClient.post<{ deal_id: number; moderation_status: string | null; saved_as_draft?: boolean }>(
          "/business/deals",
          payload
        )
        if (data.moderation_status === "pending_review") {
          setModerationNotice("Your deal has been created but is under review due to content moderation.")
          setTimeout(() => router.push("/business/v2/deals"), 3000)
        } else if (data.saved_as_draft) {
          setModerationNotice("Saved as a draft — it can go live as soon as your business is approved.")
          setTimeout(() => router.push("/business/v2/deals?tab=deactivated"), 3000)
        } else {
          router.push("/business/v2/deals")
        }
      }
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const freqLabel =
    REDEMPTION_OPTIONS.find((o) => o.value === form.redemption_frequency)?.label || "Once per day"
  const selectedFreqOption = REDEMPTION_OPTIONS.find((o) => o.value === form.redemption_frequency)
  const hasImage = !!form.deal_image_path
  const businessName = selectedVenue?.name || business?.name || "Business name"

  return (
    <>
      <div className="min-w-0">
        <Link
          href="/business/v2/deals"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="size-4" /> Back to deals
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          {isEditing ? "Edit deal" : "Create deal"}
        </h1>
      </div>

      {moderationNotice && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          {moderationNotice}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* LEFT — live preview */}
          <div className="w-full shrink-0 lg:w-[340px]">
            <div className="lg:sticky lg:top-8">
              <div className="mx-auto w-full max-w-[320px]">
                <Card className="overflow-hidden p-0 shadow-md">
                  {/* header row */}
                  <div className="flex items-center justify-between px-4 pb-2 pt-4">
                    <div className="flex items-center gap-2">
                      {business?.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={business.logo_url} alt="Logo" className="size-7 rounded-full object-cover" />
                      ) : (
                        <div className="flex size-7 items-center justify-center rounded-full bg-[#05EB54]">
                          <span className="text-xs font-bold text-white">
                            {businessName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{freqLabel}</span>
                    </div>
                    <Heart className="size-5 text-neutral-300 dark:text-neutral-600" />
                  </div>

                  {/* deal image */}
                  <div className="relative mx-3 aspect-[16/10] overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
                    {hasImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.deal_image_path} alt="Deal preview" className="absolute inset-0 size-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-300 dark:text-neutral-600">
                        <ImageIcon className="size-9" />
                        <span className="mt-2 text-xs">Deal image</span>
                      </div>
                    )}
                    {form.total_saving && (
                      <div className="absolute right-2 top-2 rounded-full bg-[#05EB54] px-2.5 py-1 text-xs font-bold text-white shadow-md">
                        Save {form.total_saving.startsWith("$") ? form.total_saving : `$${form.total_saving}`}
                      </div>
                    )}
                  </div>

                  {/* deal info */}
                  <div className="px-4 py-3">
                    <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-neutral-900 dark:text-neutral-100">
                      {form.deal_title || "Your deal title"}
                    </h3>
                    <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">{businessName}</p>
                  </div>
                </Card>

                <p className="mt-3 text-center text-xs text-neutral-500 dark:text-neutral-400">
                  This is how your <span className="font-semibold text-neutral-900 dark:text-neutral-100">Bizzy-exclusive</span> deal will appear to students
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT — form */}
          <div className="min-w-0 flex-1">
            <Card>
              <CardContent className="space-y-5 p-6">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Deal details</h2>
                  <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">Describe the deal you want to offer students.</p>
                </div>

                <div className="rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-4 py-3">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    Your offer must be exclusive to Bizzy users and not available to the general public elsewhere.
                  </p>
                </div>

                {/* Venue */}
                {!isEditing && venues.length > 0 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="venue_select">
                      Venue <span className="text-[#05EB54]">*</span>
                    </Label>
                    <Select
                      id="venue_select"
                      value={selectedVenue?.id ?? ""}
                      onChange={(e) => {
                        const venueId = Number(e.target.value)
                        if (venueId) setSelectedVenue(venueId)
                      }}
                      className={cn(!selectedVenue && errors.venue && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/30")}
                    >
                      <option value="" disabled>
                        Select a venue
                      </option>
                      {venues.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </Select>
                    {errors.venue && <p className="text-xs text-red-500 dark:text-red-400">{errors.venue}</p>}
                  </div>
                )}

                {/* Title */}
                <div className="space-y-1.5">
                  <Label htmlFor="deal_title">
                    Deal title <span className="text-[#05EB54]">*</span>
                  </Label>
                  <Input
                    id="deal_title"
                    name="deal_title"
                    value={form.deal_title}
                    onChange={handleChange}
                    placeholder="e.g. BOGO espresso martinis (21+)"
                    className={cn(errors.deal_title && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/30")}
                  />
                  {errors.deal_title ? (
                    <p className="text-xs text-red-500 dark:text-red-400">{errors.deal_title}</p>
                  ) : (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Keep it clear and compelling. Students should only be able to access this deal through Bizzy.
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="description">
                    Deal description <span className="text-[#05EB54]">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="e.g. Buy one espresso martini, get one free. Must be 21+. Show this deal at checkout."
                    className={cn("resize-none", errors.description && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/30")}
                  />
                  {errors.description && <p className="text-xs text-red-500 dark:text-red-400">{errors.description}</p>}
                </div>

                {/* Savings + Frequency */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="total_saving">
                      Estimated savings <span className="text-[#05EB54]">*</span>
                    </Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 dark:text-neutral-400">$</span>
                      <Input
                        id="total_saving"
                        name="total_saving"
                        value={form.total_saving}
                        onChange={(e) => {
                          const val = e.target.value.replace(/^\$/, "")
                          setForm((prev) => ({ ...prev, total_saving: val }))
                          setErrors((prev) => ({ ...prev, total_saving: "" }))
                          setServerError("")
                        }}
                        placeholder="e.g. 8"
                        className={cn("pl-7", errors.total_saving && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/30")}
                      />
                    </div>
                    {errors.total_saving && <p className="text-xs text-red-500 dark:text-red-400">{errors.total_saving}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="redemption_frequency">
                        Redemption frequency <span className="text-[#05EB54]">*</span>
                      </Label>
                      <button
                        type="button"
                        onClick={() => setShowFreqInfo(!showFreqInfo)}
                        className="text-neutral-400 dark:text-neutral-500 transition-colors hover:text-neutral-600 dark:hover:text-neutral-400"
                        aria-label="What is redemption frequency?"
                      >
                        <Info className="size-3.5" />
                      </button>
                    </div>
                    <Select
                      id="redemption_frequency"
                      name="redemption_frequency"
                      value={form.redemption_frequency}
                      onChange={handleChange}
                      className={cn(errors.redemption_frequency && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/30")}
                    >
                      <option value="">How often can students claim?</option>
                      {REDEMPTION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                    {errors.redemption_frequency && <p className="text-xs text-red-500 dark:text-red-400">{errors.redemption_frequency}</p>}
                  </div>
                </div>

                {/* Frequency info */}
                {showFreqInfo && (
                  <div className="space-y-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 p-3 text-xs text-neutral-600 dark:text-neutral-400">
                    {selectedFreqOption ? (
                      <p>{selectedFreqOption.info}</p>
                    ) : (
                      REDEMPTION_OPTIONS.map((opt) => (
                        <p key={opt.value}>
                          <span className="font-semibold text-neutral-900 dark:text-neutral-100">{opt.label}:</span> {opt.info}
                        </p>
                      ))
                    )}
                  </div>
                )}

                {/* Start + end date */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="start_date">Start date</Label>
                    <Input id="start_date" name="start_date" type="date" value={form.start_date} onChange={handleChange} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="expired_date">
                      End date <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span>
                    </Label>
                    <Input id="expired_date" name="expired_date" type="date" value={form.expired_date} onChange={handleChange} />
                  </div>
                </div>

                {/* Availability windows */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Label>
                        Limit to specific times <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span>
                      </Label>
                      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                        By default the deal is always available. Turn this on to offer it only during set
                        hours each day — outside those hours it shows dimmed and lower in the app.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={availabilityLimited}
                      onClick={() => setAvailabilityLimited((v) => !v)}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                        availabilityLimited ? "bg-[#05EB54]" : "bg-neutral-300 dark:bg-neutral-700"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block size-5 transform rounded-full bg-white shadow transition-transform",
                          availabilityLimited ? "translate-x-5" : "translate-x-0.5"
                        )}
                      />
                    </button>
                  </div>

                  {availabilityLimited && (
                    <div className="mt-2 space-y-2 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
                      {DAY_LABELS.map((label, day) => {
                        const w = windows[day]
                        return (
                          <div key={day} className="flex items-center gap-3">
                            <label className="flex w-28 shrink-0 cursor-pointer items-center gap-2 sm:w-32">
                              <input
                                type="checkbox"
                                checked={w.enabled}
                                onChange={(e) => updateWindow(day, { enabled: e.target.checked })}
                                className="size-4 rounded border-neutral-300 text-[#05EB54] focus:ring-[#05EB54]/30"
                              />
                              <span className="text-sm text-neutral-900 dark:text-neutral-100">{label}</span>
                            </label>
                            <Input
                              type="time"
                              value={w.start}
                              disabled={!w.enabled}
                              onChange={(e) => updateWindow(day, { start: e.target.value })}
                              className="flex-1 disabled:opacity-50"
                            />
                            <span className="text-sm text-neutral-500 dark:text-neutral-400">to</span>
                            <Input
                              type="time"
                              value={w.end}
                              disabled={!w.enabled}
                              onChange={(e) => updateWindow(day, { end: e.target.value })}
                              className="flex-1 disabled:opacity-50"
                            />
                          </div>
                        )
                      })}
                      <p className="pt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        Enable each day the deal runs and set its hours. Unchecked days are unavailable.
                        Overnight ranges (e.g. 10:00pm–2:00am) are supported.
                      </p>
                    </div>
                  )}
                </div>

                {/* Image */}
                <div className="space-y-1.5">
                  <Label>
                    Deal image <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span>
                  </Label>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Recommended: 1600x1000px landscape (16:10). You can always add one later.
                  </p>
                  <ImageUpload
                    value={form.deal_image_path}
                    onChange={(url) => setForm((prev) => ({ ...prev, deal_image_path: url }))}
                  />
                </div>

                {/* Submit */}
                {serverError && (
                  <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-600 dark:text-red-400">{serverError}</div>
                )}
                {isPending && (
                  <Badge variant="warning">Trial — saved as a draft until approved</Badge>
                )}
                <Button type="submit" size="lg" disabled={loading} className="w-full sm:w-auto">
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  {isEditing ? "Save changes" : "Create deal"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </>
  )
}
