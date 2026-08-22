import { Metadata } from "next"
import { WEEKLY_ACCESS_CREATION_LABEL } from "@/lib/business/door-access"
import { fetchVenuePublicData } from "@/lib/venuePublic"
import VenuePageClient from "./VenuePageClient"

const API_URL = process.env.INTERNAL_API_URL || "http://localhost:3000"

// Event ticket checkout still lives on the Laravel app (dev: http://3.80.143.224,
// prod: https://bizzy-deals.com); the Vercel event checkout isn't built yet.
// Reuses the same env convention as src/app/event/[id]/page.tsx.
const CHECKOUT_BASE_URL =
  process.env.CHECKOUT_REDIRECT_BASE_URL ||
  process.env.LARAVEL_CHECKOUT_BASE_URL ||
  "https://bizzy-deals.com"

interface PageProps {
  params: Promise<{ venueId: string }>
  // V5 REDEMPTION §8 — `?line_skip=<id>` is still ACCEPTED and still parsed. The
  // public page no longer renders a line-skip section (F15 moves that product
  // onto Door Access), but shared links carrying the param are in the wild — in
  // Messages threads, in promoter posts — and an unknown search param must not
  // 404 or warn. It is read here and ignored; the page it lands on is the venue
  // page, which is where the visitor wanted to be either way.
  searchParams: Promise<{ line_skip?: string }>
}

async function getVenueData(venueId: string) {
  return fetchVenuePublicData(venueId, API_URL, CHECKOUT_BASE_URL)
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { venueId } = await params
  const data = await getVenueData(venueId)
  const venueName = data?.venue?.name || "Venue"
  // §8 — the fallback description follows what the page actually shows now.
  const description =
    data?.venue?.description ||
    `Check out events, ${WEEKLY_ACCESS_CREATION_LABEL.toLowerCase()}, and deals at ${venueName} on Bizzy.`

  return {
    title: `${venueName} | Bizzy`,
    description,
    // iOS Safari Smart App Banner - "Open" deep-links straight to this venue
    // in the app (the app routes /venue/:id universal links); "Get" goes to
    // the App Store. app-argument uses the canonical prod domain so the app
    // can route it regardless of which deployment served the page.
    itunes: {
      appId: "6683306360",
      appArgument: `https://bizzyu.com/venue/${venueId}`,
    },
    openGraph: {
      title: `${venueName} | Bizzy`,
      description,
      // /ui/venues/venue/:id returns the venue photo as `venuePhotoUrl`
      // (camelCase - see venues.ts:462). Reading snake_case silently
      // undefined the field and every venue share fell back to the
      // business logo (the green Bizzy badge), which is why an LS share
      // through Messages had no rich preview of the venue itself.
      images: data?.venue?.venuePhotoUrl
        ? [data.venue.venuePhotoUrl]
        : data?.business?.logo_image_url
          ? [data.business.logo_image_url]
          : [],
    },
  }
}

export default async function VenuePage({ params, searchParams }: PageProps) {
  const { venueId } = await params
  // Awaited and discarded — see the PageProps note. Next requires the promise be
  // consumed; the value is deliberately unused.
  await searchParams
  const data = await getVenueData(venueId)

  return (
    <VenuePageClient
      venueId={venueId}
      initialData={data}
      checkoutBaseUrl={CHECKOUT_BASE_URL}
    />
  )
}
