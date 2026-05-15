import { Metadata } from "next"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

interface EventPreview {
  name?: string
  description?: string | null
  flyer_image_url?: string | null
}

const API_URL = process.env.INTERNAL_API_URL || "http://localhost:3000"

// /event/:id/checkout is the AASA-claimed Universal Link path (see
// public/.well-known/apple-app-site-association). On a tap from iMessage,
// iOS opens the Bizzy app directly without ever fetching this URL — the
// app then deep-links into the event with the ?ref attribution intact.
//
// For taps in non-iOS contexts (Android / desktop / users without the app):
// 1. iMessage / link preview scrapers fetch this URL — they need OG tags to
//    show an event image + title. generateMetadata renders those tags from
//    the event's flyer.
// 2. The page body redirects to the Laravel ticket checkout client-side so
//    the scraper has time to extract metadata before the redirect happens.
//    ?ref is preserved so Laravel's PublicController::checkout can stash it
//    in the session for promoter attribution.
const LARAVEL_CHECKOUT_BASE_URL =
  process.env.LARAVEL_CHECKOUT_BASE_URL || "https://bizzy-deals.com"

async function getEventPreview(eventId: string): Promise<EventPreview | null> {
  try {
    const res = await fetch(`${API_URL}/ui/events/${eventId}`, { cache: "no-store" })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const event = await getEventPreview(id)
  const name = event?.name || "Event"
  const description = event?.description?.slice(0, 160) || `Get tickets for ${name}.`
  return {
    title: `${name} — Get Tickets | Bizzy`,
    description,
    openGraph: {
      title: `${name} — Get Tickets | Bizzy`,
      description,
      images: event?.flyer_image_url ? [event.flyer_image_url] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} — Get Tickets | Bizzy`,
      description,
      images: event?.flyer_image_url ? [event.flyer_image_url] : [],
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

export default async function EventCheckoutRedirect({ params, searchParams }: PageProps) {
  const { id } = await params
  const sp = await searchParams
  const qs = buildQueryString(sp)
  const target = `${LARAVEL_CHECKOUT_BASE_URL}/checkout/${id}${qs ? `?${qs}` : ""}`
  return (
    <>
      <meta httpEquiv="refresh" content={`0;url=${target}`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.location.replace(${JSON.stringify(target)})`,
        }}
      />
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", fontFamily: "system-ui, sans-serif", color: "#666" }}>
        <p>Redirecting to checkout…</p>
      </div>
    </>
  )
}
