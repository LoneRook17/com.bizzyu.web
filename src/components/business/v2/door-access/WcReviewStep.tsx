"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/v2/utils"
import { ACCESS_ACCENT, ACCESS_INK, fmtTime, usdPrice } from "@/lib/business/door-access"
import {
  nightPriceSummary,
  reviewFlyerUrlForDay,
  reviewFormatLabel,
  reviewSkipCoverSuffix,
  type NightDraft,
  type WcProducts,
} from "@/lib/business/weekly-cover-nights"
import { ISO_DAYS, isoDayFull } from "@/components/business/v2/recurring/schedule"

/**
 * Flutter "Look it over". Day chips switch the preview. WHEN / WHERE / FORMAT
 * rows, Cover + Skip as cards, venue photo when they skipped a custom flyer.
 * Publish is the only CTA. Game-day overrides stay listed under the weekly
 * default so a host who priced a Saturday game still sees it.
 */
export function WcReviewStep({
  products,
  venueName,
  venueAddress,
  venuePhotoUrl,
  derivedName,
  daysOfWeek,
  weekdayEdits,
  dateEdits,
  previewDay,
  onPreviewDay,
  promotionEnabled,
  commissionSummary,
}: {
  products: WcProducts | null
  venueName: string
  venueAddress?: string
  venuePhotoUrl?: string
  derivedName: string
  daysOfWeek: number[]
  weekdayEdits: Record<number, NightDraft>
  dateEdits: Record<string, NightDraft>
  previewDay: number | null
  onPreviewDay: (day: number) => void
  promotionEnabled: boolean
  commissionSummary: string
}) {
  const sorted = [...daysOfWeek].sort((a, b) => a - b)
  const day = previewDay != null && daysOfWeek.includes(previewDay) ? previewDay : sorted[0] ?? null
  const draft = day != null ? weekdayEdits[day] : undefined
  const flyerUrl = reviewFlyerUrlForDay(weekdayEdits, day, venuePhotoUrl ?? "")
  const dateKeys = Object.keys(dateEdits).sort()
  const liveTiers = (draft?.tiers ?? []).filter((t) => !t.is_disabled)
  const whereLine = [venueName || "Your venue", (venueAddress ?? "").trim()].filter(Boolean)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          Look it over
        </h2>
        <p className="mt-1 text-[15px] text-neutral-600 dark:text-neutral-400">
          {derivedName} at {venueName || "your venue"}. Tap a day to preview it.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Preview day">
        {sorted.map((d) => {
          const active = d === day
          const letter = ISO_DAYS.find((x) => x.value === d)?.letter ?? ""
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onPreviewDay(d)}
              className={cn(
                "flex size-11 items-center justify-center rounded-full border text-sm font-bold transition-colors",
                !active &&
                  "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
              )}
              style={
                active
                  ? { borderColor: ACCESS_ACCENT, backgroundColor: ACCESS_ACCENT, color: ACCESS_INK }
                  : undefined
              }
            >
              {letter}
            </button>
          )
        })}
      </div>

      {day != null ? (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <ReviewFlyerPreview url={flyerUrl} dayName={isoDayFull(day)} />

          <div className="flex flex-col gap-4 p-4">
            <ReviewMetaRow label="WHEN">
              <p className="font-semibold text-neutral-900 dark:text-neutral-100">Every {isoDayFull(day)}</p>
              {draft ? (
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {fmtTime(draft.startTime)} - {fmtTime(draft.endTime)}
                </p>
              ) : (
                <p className="text-sm text-neutral-500">Not set up</p>
              )}
            </ReviewMetaRow>

            <ReviewMetaRow label="WHERE">
              {whereLine.map((line) => (
                <p key={line} className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {line}
                </p>
              ))}
            </ReviewMetaRow>

            <ReviewMetaRow label="FORMAT">
              <p className="font-semibold text-neutral-900 dark:text-neutral-100">{reviewFormatLabel(products)}</p>
              {draft && (draft.is21Plus || draft.tiers.some((t) => t.is_21_plus)) ? (
                <p className="text-sm text-neutral-600 dark:text-neutral-400">21+</p>
              ) : null}
            </ReviewMetaRow>

            {liveTiers.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {liveTiers.map((tier, i) => (
                  <div
                    key={i}
                    className="rounded-xl border px-3 py-3"
                    style={{ borderColor: `${ACCESS_ACCENT}40`, backgroundColor: `${ACCESS_ACCENT}10` }}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: ACCESS_ACCENT }}>
                      {tier.name || (tier.kind === "skip" ? "Skip the Line" : "Cover")}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      {usdPrice(Number.parseFloat(tier.priceInput) || 0)}
                    </p>
                    <p className="text-[13px] text-neutral-600 dark:text-neutral-400">
                      {tier.quantityInput === "" || tier.quantityInput === "0" ? "Unlimited" : `${tier.quantityInput} spots`}
                      {tier.kind === "skip" ? reviewSkipCoverSuffix(tier.includes_cover) : ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {dateKeys.length > 0 ? (
        <div>
          <p className="mb-2 text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">
            Higher prices on specific days
          </p>
          <div className="flex flex-col gap-2">
            {dateKeys.map((date) => (
              <div
                key={date}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13px]"
                style={{ backgroundColor: `${ACCESS_ACCENT}14`, border: `1px solid ${ACCESS_ACCENT}40` }}
              >
                <span className="font-medium text-neutral-900 dark:text-neutral-100">{date}</span>
                <span className="text-neutral-600 dark:text-neutral-400">{nightPriceSummary(dateEdits[date])}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <p className="text-[13px] text-neutral-600 dark:text-neutral-400">
        {promotionEnabled ? `Promoter on. ${commissionSummary}` : "Promoter off."} At the door: any phone camera, tap Check In.
      </p>
    </div>
  )
}

function ReviewMetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-4">
      <p className="w-16 shrink-0 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        {label}
      </p>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

/**
 * Night flyer or venue photo for the selected day chip. A missing or broken
 * URL is a quiet frame so Look it over never blocks Publish.
 */
function ReviewFlyerPreview({ url, dayName }: { url: string; dayName: string }) {
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    setBroken(false)
  }, [url])

  const showImage = url !== "" && !broken

  return (
    <div
      className="overflow-hidden bg-neutral-100 dark:bg-neutral-950"
      aria-label={`${dayName} flyer preview`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`${dayName} flyer`}
          className="mx-auto block max-h-[420px] w-auto max-w-full object-contain"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="flex min-h-[160px] w-full flex-col items-center justify-center gap-2 px-4 py-10 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-neutral-200/80 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            <ImageIcon className="size-5" aria-hidden />
          </span>
          <p className="text-[13px] text-neutral-500 dark:text-neutral-400">Venue photo will show here.</p>
        </div>
      )}
    </div>
  )
}
