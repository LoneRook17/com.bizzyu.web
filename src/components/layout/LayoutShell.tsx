"use client"

import { usePathname } from "next/navigation"
import Navbar from "./Navbar"
import Footer from "./Footer"

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isBusinessRoute = pathname.startsWith("/business/") || pathname === "/business"
  const isCheckoutRoute = pathname.startsWith("/checkout")
  // Venue pages double as a full-bleed "sign board" for screens outside the
  // bar — no marketing chrome, same as checkout.
  const isVenueRoute = pathname.startsWith("/venue/")
  const isAppInterstitial =
    /^\/(event|deal)\/\d+(\/|$)/.test(pathname)
  // Support chat renders inside the iOS app's WebView - no marketing chrome.
  const isSupportChat = pathname.startsWith("/support-chat")

  if (isBusinessRoute || isCheckoutRoute || isVenueRoute || isAppInterstitial || isSupportChat) {
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
