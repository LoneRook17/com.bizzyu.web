import { Metadata } from "next"
import EventCheckoutClient from "./EventCheckoutClient"

const API_URL = process.env.INTERNAL_API_URL || "http://localhost:3000"

// REDIRECT-ONLY (2026-07-10 triage, Luke's call): this Next.js buyer checkout
// has never worked end-to-end — the verify-code step never returns the token
// the client needs to authenticate the purchase — and the route gets no organic
// traffic. Until the post-release canonical-checkout project decides which
// checkout surface wins, /checkout/:id forwards to the Laravel checkout the
// same way /event/:id/checkout does (meta refresh + location.replace, so link
// scrapers still get the OG tags below before the redirect fires).
//
// EventCheckoutClient.tsx and its wired features (sold-out, scheduled tickets,
// pause notice) are intentionally KEPT — they're the starting point for the
// canonical-checkout work. Do not delete them.
//
// /lineskip/:slug is a separate, working flow and is not affected.
//
// CHECKOUT_REDIRECT_BASE_URL is the documented convention (see .env.example);
// LARAVEL_CHECKOUT_BASE_URL is accepted as a fallback for compatibility.
// Dev: http://3.80.143.224  |  Prod: https://bizzy-deals.com
const LARAVEL_CHECKOUT_BASE_URL =
  process.env.CHECKOUT_REDIRECT_BASE_URL ||
  process.env.LARAVEL_CHECKOUT_BASE_URL ||
  "https://bizzy-deals.com"

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
    if (data?.event?.promotion_enabled !== undefined) return data
    try {
      const uiRes = await fetch(`${API_URL}/ui/events/${eventId}`, { cache: "no-store" })
      if (uiRes.ok) {
        const ui = await uiRes.json()
        data.event = {
          ...data.event,
          promotion_enabled: ui.promotion_enabled,
          access_kind: data.event?.access_kind ?? ui.access_kind ?? null,
        }
      }
    } catch {
      // Checkout still renders if the public event payload is missing.
    }
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

function buildQueryString(sp: Record<string, string | string[] | undefined>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v)
    } else {
      params.set(key, value)
    }
  }
  return params.toString()
}

export default async function EventCheckoutPage({ params }: PageProps) {
  const { id } = await params
  const data = await getEventData(id)

  return <EventCheckoutClient eventId={id} initialData={data} />
}
