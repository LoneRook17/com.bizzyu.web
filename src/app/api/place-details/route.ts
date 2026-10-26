import { NextResponse } from "next/server"
import { getPlacesProxy } from "@/lib/places/proxy"
import { getClientIp } from "@/lib/verifyTurnstile"

// Public GET used after a prediction is picked. Rate limit, place_id
// validation, caching and the Google call live in lib/places/proxy.ts
// (audit W7 A01).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const result = await getPlacesProxy().details(searchParams.get("place_id"), getClientIp(request))
  return NextResponse.json(result.body, { status: result.status })
}
