"use client"

import Link from "next/link"
import { MapPin } from "lucide-react"
import { useVenue } from "@/lib/business/venue-context"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { Button } from "@/components/business/v2/ui/button"
import { Skeleton } from "@/components/business/v2/ui/skeleton"

/**
 * Deals, events, and line skips are always attached to a venue — creation is
 * impossible without one. Wrap create pages in this guard so venueless
 * businesses get a clear next step instead of a dead-end form.
 */
export default function RequireVenue({ children }: { children: React.ReactNode }) {
  const { venues, isLoading } = useVenue()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (venues.length === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title="Add your venue first"
        description="Deals and events are always attached to a location — set up your venue and you'll be back here in a minute."
        action={
          <Button asChild>
            <Link href="/business/v2/settings?action=add-venue">Set up venue</Link>
          </Button>
        }
      />
    )
  }

  return <>{children}</>
}
