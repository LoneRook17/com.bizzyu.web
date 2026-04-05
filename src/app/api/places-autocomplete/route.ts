import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const input = searchParams.get("input")

  if (!input || input.trim().length < 3) {
    return NextResponse.json({ predictions: [] })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ predictions: [] })
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}`
    const res = await fetch(url)
    const data = await res.json()

    const predictions = (data.predictions ?? []).map((p: any) => ({
      description: p.description ?? "",
      place_id: p.place_id ?? "",
    }))

    return NextResponse.json({ predictions })
  } catch {
    return NextResponse.json({ predictions: [] })
  }
}
