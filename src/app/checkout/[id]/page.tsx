import { redirect } from "next/navigation"
import { laravelCheckoutBaseUrl } from "@/lib/laravel-checkout"

// HOST LOCK (Luke 2026-08-30): ticket checkout — named events AND Weekly
// Cover — ALWAYS lives on Laravel ({checkoutOrigin}/checkout/{id}). This
// Next path is NOT a checkout: it exists only so links that land on the
// wrong twin get a 302 with their query string (ref, success, session_id,
// ticket_id, …) intact. It renders nothing, fetches nothing, and decides
// nothing — sale gating, ended-night handling, and promotion gating are
// Laravel's job on the page that actually sells.
//
// Origin comes from laravelCheckoutBaseUrl() (CHECKOUT_REDIRECT_BASE_URL /
// LARAVEL_CHECKOUT_BASE_URL, DEV fallback dev.bizzy-deals.com — never
// prod). Do not resurrect EventCheckoutClient here.

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function buildQueryString(sp: Record<string, string | string[] | undefined>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v)
    } else {
      params.set(key, value)
    }
  }
  return params.toString()
}

export default async function EventCheckoutRedirect({ params, searchParams }: PageProps) {
  const { id } = await params
  const qs = buildQueryString(await searchParams)
  redirect(`${laravelCheckoutBaseUrl()}/checkout/${id}${qs ? `?${qs}` : ""}`)
}
