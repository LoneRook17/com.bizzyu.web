import { redirect } from "next/navigation"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// /event/:id/checkout is the canonical share-link target (claimed in
// apple-app-site-association so iOS Universal Links open the app). Web
// visitors who don't have the app land here and we forward them to the
// existing /checkout/:id page, preserving the ?ref promoter attribution
// query so EventCheckoutClient can stash it in the bz_ref cookie.
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
  redirect(`/checkout/${id}${qs ? `?${qs}` : ""}`)
}
