import type { Metadata } from "next"
import PromoterDashboardClient from "./PromoterDashboardClient"

export const metadata: Metadata = {
  title: "Promoter Dashboard | Bizzy",
  description: "Track your tracking links, clicks, sales, and payouts.",
}

export default function PromoterDashboardPage() {
  return <PromoterDashboardClient />
}
