import { Metadata } from "next"
import { WEEKLY_ACCESS_SECTION_LABEL } from "@/lib/business/door-access"
import { laravelCheckoutBaseUrl } from "@/lib/laravel-checkout"
import { KNIGHT_THEME, knightAppStoreUrl, resolveVenueBrand } from "@/lib/knight-venue-theme"
import { fetchVenuePublicData, type VenueData } from "@/lib/venuePublic"
import VenuePageClient from "./VenuePageClient"

const API_URL = process.env.INTERNAL_API_URL || "http://localhost:3000"

// Event ticket checkout still lives on Laravel (l2gp: https://dev.bizzy-deals.com).
// Relative /checkout on this Next app resolves to Vercel. Vercel env:
// CHECKOUT_REDIRECT_BASE_URL on project com-bizzyu-web-l2gp.
const CHECKOUT_BASE_URL = laravelCheckoutBaseUrl()

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

// Knight Library's venue with the app-only toggle ON wears the Knight chrome
// (lib/knight-venue-theme). Everything else is the Bizzy page, unchanged.
function brandFor(venueId: string, data: VenueData | null) {
  return resolveVenueBrand({
    venueId: data?.venue?.id ?? venueId,
    businessId: data?.business?.business_id,
    knightAppOnlyTickets: data?.venue?.knight_app_only_tickets,
  })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { venueId } = await params
  const data = await getVenueData(venueId)
  const venueName = data?.venue?.name || "Venue"
  const brand = brandFor(venueId, data)
  const brandName = brand === "knight" ? KNIGHT_THEME.name : "Bizzy"
  // §8 — the fallback description follows what the page actually shows now.
  const description =
    data?.venue?.description ||
    `Check out events, ${WEEKLY_ACCESS_SECTION_LABEL.toLowerCase()}, and deals at ${venueName} on ${brandName}.`

  return {
    // Knight: absolute, so the root layout's "%s | Bizzy" template does not
    // append a Bizzy suffix. Bizzy: the string the page has always set.
    title: brand === "knight" ? { absolute: `${venueName} | ${brandName}` } : `${venueName} | ${brandName}`,
    description,
    // iOS Safari Smart App Banner - "Open" deep-links straight to this venue
    // in the app (the app routes /venue/:id universal links); "Get" goes to
    // the App Store. app-argument uses the canonical prod domain so the app
    // can route it regardless of which deployment served the page.
    // Bizzy only: the Knight page never advertises the Bizzy App Store.
    ...(brand === "bizzy"
      ? {
          itunes: {
            appId: "6683306360",
            appArgument: `https://bizzyu.com/venue/${venueId}`,
          },
        }
      : {}),
    openGraph: {
      title: `${venueName} | ${brandName}`,
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
  const brand = brandFor(venueId, data)

  return (
    <VenuePageClient
      venueId={venueId}
      initialData={data}
      checkoutBaseUrl={CHECKOUT_BASE_URL}
      brand={brand}
      appStoreUrl={brand === "knight" ? knightAppStoreUrl() : null}
    />
  )
}
