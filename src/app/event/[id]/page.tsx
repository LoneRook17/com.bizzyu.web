import { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import {
  loadVenuePublicEventIdSet,
  weeklyCoverSaleOpenForPayloads,
} from "@/lib/checkout/weekly-cover-sale"
import { laravelCheckoutBaseUrl } from "@/lib/laravel-checkout"

const API_URL = process.env.INTERNAL_API_URL || "http://localhost:3000"

interface EventResponse {
  event_id: number
  name: string
  description?: string | null
  venue_name?: string | null
  venue_address?: string | null
  start_date_time?: string | null
  end_date_time?: string | null
  flyer_image_url?: string | null
  promotion_enabled?: boolean | number
  promotion_commission_type?: "percent" | "fixed" | null
  promotion_commission_value?: number | null
  venue_id?: number | string | null
  product_kind?: string | null
  access_kind?: string | null
  recurring_series_id?: number | string | null
}

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// Live event ticket checkout still lives on Laravel. This page owns /event/:id
// (the next.config 307 was removed) so a host-ended Weekly Cover night can
// fail closed instead of bouncing to a Laravel URL that still sells.
// Vercel env: CHECKOUT_REDIRECT_BASE_URL on com-bizzyu-web-l2gp.
const LARAVEL_CHECKOUT_BASE_URL = laravelCheckoutBaseUrl()

async function getEvent(eventId: string): Promise<EventResponse | null> {
  try {
    // Public unauthenticated namespace; /events is JWT-gated.
    const res = await fetch(`${API_URL}/ui/events/${eventId}`, { cache: "no-store" })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const event = await getEvent(id)
  const name = event?.name || "Event"
  return {
    title: `${name} | Bizzy`,
    description: event?.description?.slice(0, 160) || `Get tickets for ${name}.`,
    openGraph: {
      title: `${name} | Bizzy`,
      description: event?.description?.slice(0, 160) || `Get tickets for ${name}.`,
      images: event?.flyer_image_url ? [event.flyer_image_url] : [],
    },
  }
}

export default async function PublicEventPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const sp = await searchParams
  const event = await getEvent(id)

  if (!event) {
    return (
      <main className="min-h-screen bg-white text-ink flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Event not found</h1>
          <Link href="/" className="text-sm text-primary hover:underline">Go home</Link>
        </div>
      </main>
    )
  }

  const publicListIds = await loadVenuePublicEventIdSet(API_URL, event.venue_id)
  const saleOpen = weeklyCoverSaleOpenForPayloads({
    uiPayload: event,
    publicListIds,
  })
  if (!saleOpen) {
    return (
      <main className="min-h-screen bg-white text-ink flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">This night is no longer on sale</h1>
          <p className="text-sm text-gray-600 mb-4">Cover and Skip the Line are not available for this series.</p>
          <Link href="/" className="text-sm text-primary hover:underline">Go home</Link>
        </div>
      </main>
    )
  }

  const refRaw = sp?.ref
  const ref = Array.isArray(refRaw) ? refRaw[0] : refRaw
  redirect(
    `${LARAVEL_CHECKOUT_BASE_URL}/checkout/${event.event_id}` +
      (ref ? `?ref=${encodeURIComponent(ref)}` : ""),
  )
}
