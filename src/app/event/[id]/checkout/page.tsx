import { Metadata } from "next"
import { after } from "next/server"
import { headers } from "next/headers"

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
// iOS opens the Bizzy app directly without ever fetching this URL - the
// app then deep-links into the event with the ?ref attribution intact.
//
// For taps in non-iOS contexts (Android / desktop / users without the app):
// 1. iMessage / link preview scrapers fetch this URL - they need OG tags to
//    show an event image + title. generateMetadata renders those tags from
//    the event's flyer.
// 2. The page body redirects to the Laravel ticket checkout client-side so
//    the scraper has time to extract metadata before the redirect happens.
//    ?ref is preserved so Laravel's PublicController::checkout can stash it
//    in the session for promoter attribution.
// CHECKOUT_REDIRECT_BASE_URL is the documented convention (see .env.example);
// LARAVEL_CHECKOUT_BASE_URL is accepted as a fallback for compatibility.
// Dev: http://3.80.143.224  |  Prod: https://bizzy-deals.com
const LARAVEL_CHECKOUT_BASE_URL =
  process.env.CHECKOUT_REDIRECT_BASE_URL ||
  process.env.LARAVEL_CHECKOUT_BASE_URL ||
  "https://bizzy-deals.com"

// Promoter click tracking. This landing is where every non-app visitor lands
// (Android / desktop / iOS-without-app / Universal-Link fallback) — the in-app
// iOS tap opens the app instead and logs its own click via POST /p/:code, so
// this page is the ONLY click-logging seam for the web path. Before it forwarded
// ?ref straight to Laravel for *conversion* attribution but never logged the
// *click*, so tracking_link_clicks only ever saw in-app taps. We close that gap
// here by posting the click to the same public services endpoint the app uses.
//
// Link-preview scrapers fetch this URL (for OG tags) when a link is pasted into
// a chat — logging those would inflate the count, so we skip known bot/preview
// user-agents and only count real navigations.
const CLICK_BOT_UA =
  /bot|crawler|spider|facebookexternalhit|facebot|slackbot|whatsapp|telegram|discord|twitterbot|linkedinbot|pinterest|embedly|iframely|applebot|bingbot|googlebot|skypeuripreview|vkshare|redditbot|preview/i

async function logPromoterClick(ref: string, userAgent: string | null): Promise<void> {
  // Only the promoter tracking-code shape (mirrors the services /p/:code param
  // guard). Other ?ref values (e.g. an event-share user id) are left for the
  // endpoint to 404 → harmless no-op, matching the app's ?ref handler.
  if (!/^[A-Za-z0-9-]{1,64}$/.test(ref)) return
  if (userAgent && CLICK_BOT_UA.test(userAgent)) return
  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 2000)
    try {
      // POST (not the GET redirect) logs the click and returns JSON without a
      // 302; a NULL idempotency token always logs (one real load = one click).
      // Forward the visitor UA so the click row reflects the real client.
      await fetch(`${API_URL}/p/${encodeURIComponent(ref)}`, {
        method: "POST",
        headers: userAgent ? { "user-agent": userAgent } : undefined,
        cache: "no-store",
        signal: ctl.signal,
      })
    } finally {
      clearTimeout(timer)
    }
  } catch {
    // Click logging is best-effort — never let it break the checkout redirect.
  }
}

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
    title: `${name}: Get Tickets | Bizzy`,
    description,
    openGraph: {
      title: `${name}: Get Tickets | Bizzy`,
      description,
      images: event?.flyer_image_url ? [event.flyer_image_url] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${name}: Get Tickets | Bizzy`,
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

  // Log the promoter click (if this visit carries a ?ref code) AFTER the
  // response flushes, so it adds zero latency to the redirect. Read the UA
  // during render — headers() isn't available inside after().
  const refRaw = sp.ref
  const ref = Array.isArray(refRaw) ? refRaw[0] : refRaw
  if (ref) {
    const userAgent = (await headers()).get("user-agent")
    after(() => logPromoterClick(ref, userAgent))
  }

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
