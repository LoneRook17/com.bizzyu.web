"use client"

import { usePathname } from "next/navigation"
import Navbar from "./Navbar"
import Footer from "./Footer"

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isBusinessRoute = pathname.startsWith("/business/") || pathname === "/business"
  const isCheckoutRoute = pathname.startsWith("/checkout")
  const isAppInterstitial =
    /^\/(event|deal)\/\d+(\/|$)/.test(pathname)

  if (isBusinessRoute || isCheckoutRoute || isAppInterstitial) {
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
