"use client"

import { usePathname } from "next/navigation"
import Navbar from "./Navbar"
import Footer from "./Footer"

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isBusinessRoute = pathname.startsWith("/business/") || pathname === "/business"
  const isCheckoutRoute = pathname.startsWith("/checkout")
  const isSetupPassword = pathname.startsWith("/setup-password")
  // Venue pages double as a full-bleed "sign board" for screens outside the
  // bar — no marketing chrome, same as checkout.
  const isVenueRoute = pathname.startsWith("/venue/")
  // Line-skip checkout is a dark full-bleed purchase flow like /venue — the
  // white marketing nav/footer clash with it.
  const isLineSkipRoute = pathname.startsWith("/lineskip/")
  const isAppInterstitial =
    /^\/(event|deal)\/\d+(\/|$)/.test(pathname)

  if (isBusinessRoute || isCheckoutRoute || isSetupPassword || isVenueRoute || isLineSkipRoute || isAppInterstitial) {
    return <>{children}</>
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  )
}
