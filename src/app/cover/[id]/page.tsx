import { Metadata } from "next"
import { looksLikeWeeklyCoverName } from "@/lib/business/weekly-cover-label"
import { readAccessKind } from "@/lib/business/door-access"
import {
  fetchVenuePublicData,
  nightsForCoverSeed,
  toVenueEvent,
} from "@/lib/venuePublic"
import WeeklyCoverCheckoutClient from "./WeeklyCoverCheckoutClient"

const API_URL = process.env.INTERNAL_API_URL || "http://localhost:3000"
const CHECKOUT_BASE_URL =
  process.env.CHECKOUT_REDIRECT_BASE_URL ||
  process.env.LARAVEL_CHECKOUT_BASE_URL ||
  "https://bizzy-deals.com"

interface PageProps {
  params: Promise<{ id: string }>
}

async function getCoverData(id: string) {
  try {
    const res = await fetch(`${API_URL}/ui/events/${id}`, { cache: "no-store" })
    if (!res.ok) return null
    const raw = await res.json()
    const seed = toVenueEvent(raw)
    if (!seed) return null
    const isCover =
      seed.access_kind === "door_access" ||
      readAccessKind(raw?.access_kind) === "door_access" ||
      looksLikeWeeklyCoverName(seed.name)
    if (!isCover) return null
    const venueId = seed.venue_id ?? raw?.venue_id
    if (venueId == null) {
      return { venueData: null, nights: [seed], seedId: seed.event_id }
    }
    const venueData = await fetchVenuePublicData(String(venueId), API_URL, CHECKOUT_BASE_URL)
    const nights = venueData
      ? nightsForCoverSeed(venueData.events, seed.event_id)
      : [seed]
    return {
      venueData,
      nights: nights.length > 0 ? nights : [seed],
      seedId: seed.event_id,
    }
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const data = await getCoverData(id)
  const night = data?.nights.find((row) => row.event_id === data.seedId) ?? data?.nights[0]
  const venueName = data?.venueData?.venue.name || night?.venue_name || "Venue"
  return {
    title: `${venueName} - Weekly Cover | Bizzy`,
    description: `Weekly Cover at ${venueName}. Pick your night.`,
    openGraph: {
      title: `${venueName} - Weekly Cover | Bizzy`,
      description: `Weekly Cover at ${venueName}. Pick your night.`,
      images: data?.venueData?.venue.venuePhotoUrl
        ? [data.venueData.venue.venuePhotoUrl]
        : night?.flyer_image_url
          ? [night.flyer_image_url]
          : [],
    },
  }
}

export default async function WeeklyCoverPage({ params }: PageProps) {
  const { id } = await params
  const data = await getCoverData(id)

  return (
    <WeeklyCoverCheckoutClient
      seedId={Number(id)}
      initialNights={data?.nights ?? []}
      initialVenue={data?.venueData ?? null}
    />
  )
}
