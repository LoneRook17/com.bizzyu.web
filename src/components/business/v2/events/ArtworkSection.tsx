"use client"

import {
  ARTWORK_ACCENTS,
  ARTWORK_TEMPLATE_OPTIONS,
  DEFAULT_ARTWORK_TEMPLATE,
  type ArtworkTemplate,
} from "@/lib/business/constants"
import { cn } from "@/lib/v2/utils"
import { ImageUpload } from "./ImageUpload"

interface ArtworkSectionProps {
  flyerUrl: string
  onFlyerChange: (url: string) => void
  template: ArtworkTemplate | null | undefined
  onTemplateChange: (template: ArtworkTemplate | null) => void
  accent: string | null | undefined
  onAccentChange: (accent: string | null) => void
}

/**
 * 5.0 D10 / D-F4.1 — artwork with a fallback that is never broken.
 *
 * Chain: uploaded flyer → venue logo → Bizzy template. The template is a CHOICE,
 * not an image: the app renders it as a widget at display time, so all that
 * travels with the event is which style (and optionally which accent). Picking
 * one is skippable — the default path stays a single upload.
 *
 * The picker only shows when there is no flyer, because an uploaded flyer wins
 * the chain outright and a template choice underneath it would never render.
 */
export function ArtworkSection({
  flyerUrl,
  onFlyerChange,
  template,
  onTemplateChange,
  accent,
  onAccentChange,
}: ArtworkSectionProps) {
  const hasFlyer = !!flyerUrl
  const active = template ?? DEFAULT_ARTWORK_TEMPLATE

  return (
    <div className="space-y-5">
      <ImageUpload value={flyerUrl} onChange={onFlyerChange} />

      {hasFlyer ? (
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
          Your flyer is what people will see. Remove it to fall back to a Bizzy template.
        </p>
      ) : (
        <div className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 dark:border-neutral-800 dark:bg-neutral-800/40">
          <div>
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">No flyer? Pick a template.</p>
            <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
              Bizzy draws the artwork from your venue and event details. Optional — skip it and we use Classic.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ARTWORK_TEMPLATE_OPTIONS.map((opt) => {
              const selected = active === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onTemplateChange(opt.value)}
                  className={cn(
                    "group flex flex-col gap-2 rounded-lg border p-2 text-left transition-colors",
                    selected
                      ? "border-[#05EB54] ring-1 ring-[#05EB54]"
                      : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600"
                  )}
                  aria-pressed={selected}
                >
                  <span className={cn("h-14 w-full rounded-md bg-gradient-to-br", opt.swatch)} />
                  <span className="block text-xs font-semibold text-neutral-900 dark:text-neutral-100">{opt.label}</span>
                  <span className="block text-[11px] leading-tight text-neutral-500 dark:text-neutral-400">{opt.hint}</span>
                </button>
              )
            })}
          </div>

          <div>
            <p className="mb-1.5 text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
              Accent <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {ARTWORK_ACCENTS.map((a) => {
                const selected = accent === a.value
                return (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => onAccentChange(selected ? null : a.value)}
                    title={a.label}
                    aria-label={a.label}
                    aria-pressed={selected}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                      selected
                        ? "border-[#05EB54] text-neutral-900 dark:text-neutral-100"
                        : "border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400"
                    )}
                  >
                    <span className={cn("size-3 rounded-full", a.dot)} />
                    {a.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
