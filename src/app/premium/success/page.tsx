import { redirect } from "next/navigation"

// Web premium checkout (Stripe) has been removed — this success callback is no
// longer reachable. Redirect any stale links to the app-download funnel.
export default function PremiumSuccessPage() {
  redirect("/premium")
}
