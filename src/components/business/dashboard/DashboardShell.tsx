"use client"

import { useState, useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"
import PendingBanner from "./PendingBanner"
import Toaster from "./Toast"
import { useVenue } from "@/lib/business/venue-context"

const DETAIL_PAGE_REDIRECTS = [
  { match: /^\/business\/line-skips\/\d+/, redirect: "/business/line-skips" },
  { match: /^\/business\/events\/\d+/, redirect: "/business/events" },
  { match: /^\/business\/deals\/\d+/, redirect: "/business/deals" },
]

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { venues, selectedVenue, isAllVenues, selectedVenueId } = useVenue()
  const pathname = usePathname()
  const router = useRouter()
  const prevVenueId = useRef(selectedVenueId)

  useEffect(() => {
    if (prevVenueId.current === selectedVenueId) return
    prevVenueId.current = selectedVenueId

    for (const { match, redirect } of DETAIL_PAGE_REDIRECTS) {
      if (match.test(pathname)) {
        router.push(redirect)
        return
      }
    }
  }, [selectedVenueId, pathname, router])

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="md:ml-64">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <PendingBanner />
        <main className="p-4 md:p-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 mb-4 pb-4 border-b border-gray-200">
            <svg className="h-6 w-6 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            {isAllVenues
              ? "All Venues"
              : selectedVenue?.name ?? (venues.length === 0 ? "Add your venue to get started" : "Select a Venue")}
          </h1>
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  )
}
