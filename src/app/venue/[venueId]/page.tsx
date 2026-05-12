import { Metadata } from "next"
import VenuePageClient from "./VenuePageClient"

const API_URL = process.env.INTERNAL_API_URL || "http://localhost:3000"

interface PageProps {
  params: Promise<{ venueId: string }>
  searchParams: Promise<{ line_skip?: string }>
}

async function getVenueData(venueId: string) {
  try {
    const res = await fetch(`${API_URL}/ui/venues/venue/${venueId}`, {
      cache: "no-store",
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { venueId } = await params
  const data = await getVenueData(venueId)
  const venueName = data?.venue?.name || "Venue"
  const businessName = data?.business?.name || ""
  const description = data?.venue?.description || `Check out events, line skips, and deals at ${venueName} on Bizzy.`

  return {
    title: `${venueName} | Bizzy`,
    description,
    openGraph: {
      title: `${venueName} | Bizzy`,
      description,
      // /ui/venues/venue/:id returns the venue photo as `venuePhotoUrl`
      // (camelCase — see venues.ts:462). Reading snake_case silently
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
  const { line_skip } = await searchParams
  const data = await getVenueData(venueId)

  return (
    <VenuePageClient
      venueId={venueId}
      initialData={data}
      highlightLineSkip={line_skip}
    />
  )
}
