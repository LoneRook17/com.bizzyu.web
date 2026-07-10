"use client"

// #9 venue-stripe (locked decision 2 mitigation): the blocked state must be
// UNMISSABLE — a badge + banner on the venue row AND on its events' manage
// pages — and the copy must point at the one-click way out (unassigning the
// account instantly restores default routing).

import Link from "next/link"
import { Ban, TriangleAlert } from "lucide-react"
import { useVenue } from "@/lib/business/venue-context"
import {
  useBusinessStripeAccounts,
  getVenuePayoutBlock,
  venuePayoutBlockCopy,
  type VenuePayoutBlockReason,
} from "@/lib/business/venue-payout"
import { Badge } from "@/components/business/v2/ui/badge"
import { cn } from "@/lib/v2/utils"

/** Small "Sales paused" chip for venue rows/cards. */
export function VenuePayoutPausedBadge({ className }: { className?: string }) {
  return (
    <Badge variant="danger" className={className}>
      <Ban className="size-3" /> Sales paused
    </Badge>
  )
}

/** Loud red banner for a blocked venue. Rendered on the venue row and on each of its events' manage pages. */
export function VenuePayoutPausedBanner({
  venueName,
  reason,
  className,
}: {
  venueName: string
  reason: VenuePayoutBlockReason
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
          <TriangleAlert className="size-4 text-red-600 dark:text-red-400" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-red-700 dark:text-red-400">
            Ticket sales are PAUSED at {venueName}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-red-700/90 dark:text-red-400/90">
            {venuePayoutBlockCopy(reason)}
          </p>
          <p className="mt-1.5 text-[13px] text-red-700/90 dark:text-red-400/90">
            Finish that account&apos;s Stripe onboarding — or un-match it to instantly restore your
            default payout routing.
          </p>
          <Link
            href="/business/settings?tab=payments"
            className="mt-2 inline-block text-[13px] font-semibold text-red-700 dark:text-red-400 underline underline-offset-2 hover:no-underline"
          >
            Fix in venue payout accounts →
          </Link>
        </div>
      </div>
    </div>
  )
}

/**
 * Self-contained banner for an event's manage surface: resolves the event's
 * venue and its payout-block state, renders nothing when sales flow normally
 * (or when the viewer's role can't see payout accounts).
 */
export function EventVenuePayoutBanner({ venueId, className }: { venueId: number | null; className?: string }) {
  const { venues } = useVenue()
  const { accounts } = useBusinessStripeAccounts()

  if (venueId === null) return null
  const venue = venues.find((v) => v.id === venueId)
  if (!venue) return null
  const reason = getVenuePayoutBlock(venue, accounts)
  if (!reason) return null

  return <VenuePayoutPausedBanner venueName={venue.name} reason={reason} className={className} />
}
