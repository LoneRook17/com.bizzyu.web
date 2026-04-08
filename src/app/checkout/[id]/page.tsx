import { Metadata } from "next"
import EventCheckoutClient from "./EventCheckoutClient"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

interface PageProps {
  params: Promise<{ id: string }>
}

async function getEventData(eventId: string) {
  try {
    const res = await fetch(`${API_URL}/checkout/event/${eventId}`, {
      cache: "no-store",
    })
    if (!res.ok) return null
    return res.json()
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
