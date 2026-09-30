"use client"

import DealForm from "@/components/business/v2/deals/DealForm"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { useVenue } from "@/lib/business/venue-context"

export default function CreateDealPage() {
  const { isLoading } = useVenue()

  // Wait for the venue list before the form decides 0 vs 1 vs 2+. A venueless
  // business still gets the form — deals do not use RequireVenue. Events and
  // line skips do.
  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  return <DealForm />
}
