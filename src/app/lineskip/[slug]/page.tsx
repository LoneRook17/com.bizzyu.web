import { Metadata } from "next"
import LineSkipCheckoutClient from "./LineSkipCheckoutClient"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getPageData(businessId: string) {
  try {
    const res = await fetch(`${API_URL}/line-skips/business/${businessId}/page-info`, {
      cache: "no-store",
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await getPageData(slug)
  const businessName = data?.business?.name || "Venue"

  return {
    title: `${businessName} - Line Skips | Bizzy`,
    description: `Skip the line at ${businessName}. Guaranteed entry.`,
    openGraph: {
      title: `${businessName} - Line Skips | Bizzy`,
      description: `Skip the line at ${businessName}. Guaranteed entry.`,
      images: data?.business?.logo_image_url ? [data.business.logo_image_url] : [],
    },
  }
}

export default async function LineSkipPage({ params }: PageProps) {
  const { slug } = await params
  const data = await getPageData(slug)

  return (
    <LineSkipCheckoutClient
      businessId={slug}
      initialData={data}
    />
  )
}
