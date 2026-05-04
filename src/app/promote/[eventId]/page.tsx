import { Metadata } from "next"
import Link from "next/link"
import PromoteClient from "./PromoteClient"

const API_URL = process.env.INTERNAL_API_URL || "http://localhost:3000"

interface EventResponse {
  event_id: number
  name: string
  description?: string | null
  venue_name?: string | null
  start_date_time?: string | null
  flyer_image_url?: string | null
  promotion_enabled?: boolean | number
  promotion_commission_type?: "percent" | "fixed" | null
  promotion_commission_value?: number | null
}

interface PageProps {
  params: Promise<{ eventId: string }>
}

async function getEvent(eventId: string): Promise<EventResponse | null> {
  try {
    const res = await fetch(`${API_URL}/ui/events/${eventId}`, { cache: "no-store" })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { eventId } = await params
  const event = await getEvent(eventId)
  const name = event?.name || "Event"
  return {
    title: `Promote ${name} | Bizzy`,
    description: `Earn a commission promoting ${name}.`,
  }
}

export default async function PromotePage({ params }: PageProps) {
  const { eventId } = await params
  const event = await getEvent(eventId)

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

  if (!event.promotion_enabled) {
    return (
      <main className="min-h-screen bg-white text-ink flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold mb-2">{event.name}</h1>
          <p className="text-gray-600 mb-6">
            This event isn&rsquo;t opted into the promoter program.
          </p>
          <Link
            href={`/event/${event.event_id}`}
            className="text-sm text-primary hover:underline"
          >
            Back to event
          </Link>
        </div>
      </main>
    )
  }

  return (
    <PromoteClient
      eventId={event.event_id}
      eventName={event.name}
      venueName={event.venue_name ?? null}
      startDateTime={event.start_date_time ?? null}
      flyerImageUrl={event.flyer_image_url ?? null}
      commissionType={event.promotion_commission_type ?? null}
      commissionValue={
        event.promotion_commission_value != null
          ? Number(event.promotion_commission_value)
          : null
      }
    />
  )
}
