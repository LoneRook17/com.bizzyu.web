"use client"

import { DoorOpen, Sparkles, Zap, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/v2/utils"
import { ACCESS_ACCENT, ACCESS_INK } from "@/lib/business/door-access"
import { WC_PRODUCTS, WC_PRODUCT_COPY, type WcProducts } from "@/lib/business/weekly-cover-nights"
import {
  IN_APP_CHOICE_BODY,
  IN_APP_CHOICE_TITLE,
  InAppIconTile,
  InAppSelectedCheck,
  inAppChoiceSurfaceStyle,
} from "@/components/business/v2/create/in-app-choice"

/**
 * Step 0 — "What are you selling?"
 *
 * The fork has to be explicit rather than hidden in a form toggle, because the
 * answer shapes every screen after it: which tiers get seeded, what the nights
 * are called, whether "Includes cover" is even a question. It also gives each
 * tier a `kind` on the wire, which is what lets a program built here bind its
 * per-night overrides to the same rows as one built in the app.
 *
 * "Both" carries the quiet recommendation because it is what most bars run.
 *
 * Icons match Flutter WC Sell: door, bolt, sparkles — not letter tiles.
 */

const WC_PRODUCT_ICONS: Record<WcProducts, LucideIcon> = {
  cover: DoorOpen,
  skip: Zap,
  both: Sparkles,
}

export function WcProductsStep({
  value,
  onChange,
}: {
  value: WcProducts | null
  onChange: (next: WcProducts) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          What are you selling?
        </h2>
        <p className="mt-1 text-[15px] text-neutral-600 dark:text-neutral-400">
          What guests can buy at your door, every week. You price it per night on the next screens.
        </p>
      </div>

      <div className="flex flex-col gap-3" role="radiogroup" aria-label="What are you selling?">
        {WC_PRODUCTS.map((product) => {
          const copy = WC_PRODUCT_COPY[product]
          const selected = value === product
          const featured = product === "both"
          return (
            <button
              key={product}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(product)}
              style={inAppChoiceSurfaceStyle(ACCESS_ACCENT, selected)}
              className={cn(
                "group flex items-center gap-4 rounded-xl border px-5 py-4 text-left transition-shadow",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-access/40",
                selected && "shadow-sm"
              )}
            >
              <InAppIconTile accent={ACCESS_ACCENT} icon={WC_PRODUCT_ICONS[product]} />

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[17px] font-semibold" style={{ color: IN_APP_CHOICE_TITLE }}>
                    {copy.title}
                  </span>
                  {featured && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{ backgroundColor: ACCESS_ACCENT, color: ACCESS_INK }}
                    >
                      MOST BARS
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-[13.5px] leading-snug" style={{ color: IN_APP_CHOICE_BODY }}>
                  {copy.blurb}
                </span>
              </span>

              <InAppSelectedCheck accent={ACCESS_ACCENT} selected={selected} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
