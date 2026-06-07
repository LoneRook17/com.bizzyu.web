import { redirect } from "next/navigation"

// Web premium checkout has been removed — premium is purchased in the mobile
// apps only. Redirect any old /premium/plans links to the app-download funnel.
export default function PremiumPlansPage() {
  redirect("/premium")
}
