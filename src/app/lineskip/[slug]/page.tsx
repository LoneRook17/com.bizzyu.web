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
  const displayName = data?.venue?.name || data?.business?.name || "Venue"
  const heroImage = data?.venue?.photo_url || data?.business?.logo_image_url

  return {
    title: `${displayName} - Line Skips | Bizzy`,
    description: `Skip the line at ${displayName}. Cover included.`,
    openGraph: {
      title: `${displayName} - Line Skips | Bizzy`,
      description: `Skip the line at ${displayName}. Cover included.`,
      images: heroImage ? [heroImage] : [],
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
