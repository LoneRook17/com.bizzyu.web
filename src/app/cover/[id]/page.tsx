import { redirect } from "next/navigation"

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

/** Old WC buy path. Send buyers to the same event checkout as named events. */
export default async function CoverRedirect({ params, searchParams }: PageProps) {
  const { id } = await params
  const qs = buildQueryString(await searchParams)
  redirect(`/checkout/${id}${qs ? `?${qs}` : ""}`)
}
