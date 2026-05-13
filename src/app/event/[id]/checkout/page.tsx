import { redirect } from "next/navigation"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// /event/:id/checkout is the canonical share-link target (claimed in
// apple-app-site-association so iOS Universal Links open the app). Web
// visitors without the app land here and we forward them to the Laravel
// event ticket checkout at bizzy-deals.com — the /checkout/:id page on
// this Next.js app is the line-skip flow only and will not sell event
// tickets. The ?ref promoter attribution query is preserved so Laravel's
// PublicController::checkout can stash it in the session.
const LARAVEL_CHECKOUT_BASE_URL =
  process.env.LARAVEL_CHECKOUT_BASE_URL || "https://bizzy-deals.com"

export default async function EventCheckoutRedirect({ params, searchParams }: PageProps) {
  const { id } = await params
  const sp = await searchParams
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const v of value) query.append(key, v)
    } else {
      query.set(key, value)
    }
  }
  const qs = query.toString()
  redirect(`${LARAVEL_CHECKOUT_BASE_URL}/checkout/${id}${qs ? `?${qs}` : ""}`)
}
