import { redirect } from "next/navigation"
import LineSkipScanClient from "./LineSkipScanClient"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

interface LineSkipScanPageProps {
  params: Promise<{ uuid: string }>
  searchParams: Promise<{ venue?: string }>
}

async function getTicketInfo(uuid: string) {
  try {
    const res = await fetch(`${API_URL}/ls/${uuid}`, { cache: "no-store" })
    if (!res.ok) return null
    const data = await res.json()
    return data.ticket
  } catch {
    return null
  }
}

export default async function LineSkipScanPage({ params, searchParams }: LineSkipScanPageProps) {
  const { uuid } = await params
  const { venue } = await searchParams

  // If ?venue=true, redirect to the venue page (for share links)
  if (venue === "true") {
    const ticket = await getTicketInfo(uuid)
    if (ticket?.venue_id) {
      redirect(`/venue/${ticket.venue_id}?line_skip=${ticket.line_skip_instance_id}`)
    }
  }

  // Default: show the scanner/ticket page (for bouncer QR scans)
  return <LineSkipScanClient uuid={uuid} />
}
