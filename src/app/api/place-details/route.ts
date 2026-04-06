import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const placeId = searchParams.get("place_id")

  if (!placeId) {
    return NextResponse.json({ lat: null, lng: null })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ lat: null, lng: null })
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry&key=${apiKey}`
    const res = await fetch(url)
    const data = await res.json()

    const location = data.result?.geometry?.location
    return NextResponse.json({
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
    })
  } catch {
    return NextResponse.json({ lat: null, lng: null })
  }
}
