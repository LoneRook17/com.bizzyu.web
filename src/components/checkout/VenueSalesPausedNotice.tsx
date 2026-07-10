import { venueStripeBlockCopy, type VenueStripeBlock } from "@/lib/venue-stripe-block"

/**
 * Kind, unmissable rendering of the venue-stripe pause state on the buyer
 * checkout surfaces (event checkout + line-skip pages, both fixed-dark).
 * Replaces the purchase CTA — never shown alongside a raw error string.
 */
export default function VenueSalesPausedNotice({ block }: { block: VenueStripeBlock }) {
  const { title, message } = venueStripeBlockCopy(block.reason)
  return (
    <div className="mt-6 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-amber-300">
          {/* pause icon */}
          <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M10 8v8M14 8v8" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </span>
        <div>
          <h3 className="text-sm font-bold text-amber-300">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-white/70">{message}</p>
          <p className="mt-2 text-xs text-white/40">You haven&apos;t been charged.</p>
        </div>
      </div>
    </div>
  )
}
