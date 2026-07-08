import { redirect } from "next/navigation"

// Web premium subscriptions have been removed - there is no web account/billing
// surface anymore. Premium is managed in the mobile apps (App Store / Google
// Play subscription settings). Redirect any old /account links to the funnel.
export default function AccountPage() {
  redirect("/premium")
}
