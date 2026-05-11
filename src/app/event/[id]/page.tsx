import { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"

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
}

interface PageProps {
  params: Promise<{ id: string }>
}

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

function formatDate(iso?: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default async function PublicEventPage({ params }: PageProps) {
  const { id } = await params
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

  const promotionEnabled = !!event.promotion_enabled
  const startsAt = formatDate(event.start_date_time)

  return (
    <main className="min-h-screen bg-white text-ink">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {event.flyer_image_url && (
          <div className="relative w-full aspect-[3/2] mb-6 rounded-2xl overflow-hidden bg-gray-100">
            <Image
              src={event.flyer_image_url}
              alt={event.name}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              unoptimized
            />
          </div>
        )}
        <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
        {event.venue_name && (
          <p className="text-sm text-gray-600 mb-1">at {event.venue_name}</p>
        )}
        {startsAt && (
          <p className="text-sm text-gray-600 mb-6">{startsAt}</p>
        )}
        {event.description && (
          <p className="text-base text-gray-800 leading-relaxed mb-8 whitespace-pre-line">
            {event.description}
          </p>
        )}

        {promotionEnabled && (
          <Link
            href={`/promote/${event.event_id}`}
            className="block w-full text-center rounded-xl bg-primary text-white font-semibold py-3 mb-3 hover:brightness-110 transition"
          >
            Get paid to promote this event &rarr;
          </Link>
        )}

        <Link
          href={`/checkout/${event.event_id}`}
          className="block w-full text-center rounded-xl bg-ink text-white font-semibold py-3 hover:opacity-90 transition"
        >
          Buy Ticket
        </Link>
      </div>
    </main>
  )
}
