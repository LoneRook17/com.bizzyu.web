import { NextResponse } from "next/server"
import { laravelCheckoutBaseUrl } from "@/lib/laravel-checkout"
import { parseCheckoutTicketTiers } from "@/lib/venuePublic"

const CHECKOUT_BASE = laravelCheckoutBaseUrl()

/**
 * Same-origin Cover / ticket prices (and tickets.id) for the public venue page.
 * Draft Weekly Cover nights have no min_ticket_price on GET /ui/events/:id;
 * the Laravel checkout HTML is the public source that still prints Cover $5
 * and data-ticket-id, which the venue page needs for ?ticket_id= preselect.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ tickets: [] }, { status: 400 })
  }
  try {
    const res = await fetch(`${CHECKOUT_BASE.replace(/\/$/, "")}/checkout/${id}`, {
      cache: "no-store",
    })
    if (!res.ok) return NextResponse.json({ tickets: [] })
    const tickets = parseCheckoutTicketTiers(await res.text())
    return NextResponse.json({ tickets })
  } catch {
    return NextResponse.json({ tickets: [] })
  }
}
