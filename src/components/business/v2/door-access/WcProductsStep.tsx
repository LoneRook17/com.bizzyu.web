"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/v2/utils"
import { ACCESS_ACCENT } from "@/lib/business/door-access"
import { WC_PRODUCTS, WC_PRODUCT_COPY, type WcProducts } from "@/lib/business/weekly-cover-nights"

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
 */
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
              className={cn(
                "group flex items-center gap-4 rounded-xl border px-5 py-4 text-left transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-access/40",
                selected
                  ? "border-access bg-access/[0.07] shadow-sm shadow-access/10"
                  : featured
                    ? "border-access/35 bg-white hover:border-access/60 dark:bg-neutral-900"
                    : "border-neutral-300 bg-white hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-600"
              )}
            >
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                  selected ? "bg-access text-white" : "bg-access/10 text-access"
                )}
              >
                {selected ? (
                  <Check className="size-5" />
                ) : (
                  <span className="text-base font-bold">{copy.title.charAt(0)}</span>
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[17px] font-semibold text-neutral-900 dark:text-neutral-100">
                    {copy.title}
                  </span>
                  {featured && !selected && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-access"
                      style={{ backgroundColor: `${ACCESS_ACCENT}1f` }}
                    >
                      Most bars
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-[13.5px] leading-snug text-neutral-600 dark:text-neutral-400">
                  {copy.blurb}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
