"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { BusinessAuthProvider, useAuth } from "@/lib/business/auth-context"
import DashboardShell from "@/components/business/dashboard/DashboardShell"
import { APPROVED_ONLY_ROUTES } from "@/lib/business/constants"

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isLoading, isPending } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  // Redirect pending businesses away from content-creation routes
  useEffect(() => {
    if (!isLoading && isPending) {
      const isRestricted = APPROVED_ONLY_ROUTES.some((route) => pathname.startsWith(route))
      if (isRestricted) {
        router.replace("/business")
      }
    }
  }, [isLoading, isPending, pathname, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-3 text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return <DashboardShell>{children}</DashboardShell>
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <BusinessAuthProvider>
      <DashboardContent>{children}</DashboardContent>
    </BusinessAuthProvider>
  )
}
