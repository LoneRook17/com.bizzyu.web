import { Metadata } from "next"
import { after } from "next/server"
import { headers } from "next/headers"
import { laravelCheckoutBaseUrl } from "@/lib/laravel-checkout"
import {
  buildCheckoutTarget,
  logPromoterClick,
  refFromSearchParams,
} from "@/lib/checkout/forward-query"

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
// 2. The page body redirects to LARAVEL /checkout/:id (HOST LOCK 2026-08-30:
//    ticket checkout for named events and Weekly Cover always lives on
//    Laravel; this Next app renders no checkout). ?ref and ?ticket_id= are
//    preserved. The origin is laravelCheckoutBaseUrl()
//    (CHECKOUT_REDIRECT_BASE_URL / LARAVEL_CHECKOUT_BASE_URL) — never /cover
//    and not a second WC page.

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
// The click-logging + query-forwarding helpers live in
// src/lib/checkout/forward-query.ts (shared with /event/:id, unit-tested).

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

export default async function EventCheckoutRedirect({ params, searchParams }: PageProps) {
  const { id } = await params
  const sp = await searchParams

  // Log the promoter click (if this visit carries a ?ref code) AFTER the
  // response flushes, so it adds zero latency to the redirect. Read the UA
  // during render — headers() isn't available inside after().
  const ref = refFromSearchParams(sp)
  if (ref) {
    const userAgent = (await headers()).get("user-agent")
    after(() => logPromoterClick(ref, userAgent))
  }

  const target = buildCheckoutTarget(laravelCheckoutBaseUrl(), id, sp)
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
