import { redirect } from "next/navigation"
import { laravelCheckoutBaseUrl } from "@/lib/laravel-checkout"

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

/**
 * Old WC buy path. HOST LOCK (2026-08-30): ticket checkout lives on
 * Laravel — send buyers straight there, not to the same-origin /checkout
 * twin (which is itself only a redirect now).
 */
export default async function CoverRedirect({ params, searchParams }: PageProps) {
  const { id } = await params
  const qs = buildQueryString(await searchParams)
  redirect(`${laravelCheckoutBaseUrl()}/checkout/${id}${qs ? `?${qs}` : ""}`)
}
