import { Metadata } from "next"
import EventCheckoutClient from "./EventCheckoutClient"
import {
  loadVenuePublicEventIdSet,
  weeklyCoverSaleOpenForPayloads,
} from "@/lib/checkout/weekly-cover-sale"

const API_URL = process.env.INTERNAL_API_URL || "http://localhost:3000"

// Buyer checkout for named events and Weekly Cover. A host-ended WC series
// must fail closed here (cover, skip, or both) — leftover published stamps
// are still returned by GET /checkout/event/:id and /ui/events/:id.
// EventCheckoutClient is the purchase UI; do not bounce an ended night to
// Laravel. Live named events still buy through this page.

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function getEventData(eventId: string) {
  try {
    const res = await fetch(`${API_URL}/checkout/event/${eventId}`, {
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = await res.json()
    let ui: unknown = null
    try {
      const uiRes = await fetch(`${API_URL}/ui/events/${eventId}`, { cache: "no-store" })
      if (uiRes.ok) ui = await uiRes.json()
    } catch {
      // Sale guard still runs from the checkout payload alone.
    }
    if (ui && typeof ui === "object") {
      const uiRow = ui as Record<string, unknown>
      data.event = {
        ...data.event,
        promotion_enabled: data.event?.promotion_enabled ?? uiRow.promotion_enabled,
        access_kind: data.event?.access_kind ?? uiRow.access_kind ?? null,
        product_kind: data.event?.product_kind ?? uiRow.product_kind ?? null,
        recurring_series_id: data.event?.recurring_series_id ?? uiRow.recurring_series_id,
        venue_id: data.event?.venue_id ?? uiRow.venue_id,
        series_is_active: data.event?.series_is_active ?? uiRow.series_is_active,
      }
    }
    const publicListIds = await loadVenuePublicEventIdSet(API_URL, data.event?.venue_id)
    data.saleClosed = !weeklyCoverSaleOpenForPayloads({
      checkoutPayload: data,
      uiPayload: ui,
      publicListIds,
    })
    return data
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const data = await getEventData(id)
  const eventName = data?.event?.name || "Event"

  return {
    title: `${eventName} - Tickets | Bizzy`,
    description: `Get tickets for ${eventName} on Bizzy.`,
    openGraph: {
      title: `${eventName} - Tickets | Bizzy`,
      description: `Get tickets for ${eventName} on Bizzy.`,
      images: data?.event?.flyer_image_url ? [data.event.flyer_image_url] : [],
    },
  }
}

export default async function EventCheckoutPage({ params }: PageProps) {
  const { id } = await params
  const data = await getEventData(id)

  return <EventCheckoutClient eventId={id} initialData={data} />
}
