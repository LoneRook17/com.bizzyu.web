"use client"

import Link from "next/link"
import { MapPin } from "lucide-react"
import { useVenue } from "@/lib/business/venue-context"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { Button } from "@/components/business/v2/ui/button"
import { Skeleton } from "@/components/business/v2/ui/skeleton"

/**
 * Events, line skips, door access, and recurring series are attached to a
 * venue. Deals are not — a shop with no venue can still create one, so do not
 * wrap the deal form in this guard.
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
        description="Events and line skips need a location. Set up your venue and you'll be back here in a minute."
        action={
          <Button asChild>
            <Link href="/business/settings?action=add-venue">Set up venue</Link>
          </Button>
        }
      />
    )
  }

  return <>{children}</>
}
