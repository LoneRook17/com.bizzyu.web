"use client"

import { MapPin } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue } from "@/lib/business/venue-context"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Card } from "@/components/business/v2/ui/card"
import { Button } from "@/components/business/v2/ui/button"
import { Plus } from "lucide-react"
import {
  PromoCodesPanel,
  VENUE_PROMO_COPY,
} from "@/components/business/v2/promo/PromoCodesPanel"

/**
 * Universal (venue-wide) promo codes.
 *
 * The table, dialogs and per-event breakdown moved into PromoCodesPanel so the
 * Door Access program page can run the identical screen against its own scope
 * instead of growing a second copy — the drift that the promo-scoping bug came
 * from. This page keeps what is genuinely venue-specific: the header copy and
 * the "pick a venue, not All venues" guard.
 */
export default function UniversalPromoCodesPage() {
  const { user } = useAuth()
  const { selectedVenue, selectedVenueId, isAllVenues } = useVenue()

  const canManage = user?.business_role === "owner" || user?.business_role === "manager"
  const venueReady = !isAllVenues && selectedVenueId !== null && typeof selectedVenueId === "number"
  const venueName = selectedVenue ? selectedVenue.name : "this venue"

  return (
    <>
      {!venueReady ? (
        <>
          <PageHeader
            title="Universal promo codes"
            description="Codes here apply to every event at one venue, now and in the future."
          />
          <Card className="flex items-start gap-3 border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-4">
            <MapPin className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Select a specific venue (not “All venues”) in the sidebar to manage its universal promo codes.
            </p>
          </Card>
        </>
      ) : (
        <PromoCodesPanel
          basePath={`/business/venues/${selectedVenueId}/promo-codes`}
          copy={VENUE_PROMO_COPY(venueName)}
          canManage={canManage}
          headerAction={(openCreate) => (
            <PageHeader
              title="Universal promo codes"
              description={
                <>
                  Codes here apply to <span className="font-medium text-neutral-900 dark:text-neutral-100">every event at {venueName}</span>, now and in
                  the future. Usage limits count across all of those events.
                </>
              }
              actions={
                canManage ? (
                  <Button onClick={openCreate}>
                    <Plus /> Create code
                  </Button>
                ) : undefined
              }
            />
          )}
        />
      )}
    </>
  )
}
