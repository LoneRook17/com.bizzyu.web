"use client"

import { BusinessAuthProvider, useAuth } from "@/lib/business/auth-context"
import { VenueProvider } from "@/lib/business/venue-context"
import { ThemeProvider } from "@/lib/v2/theme"
import { useDashboardMode } from "@/lib/v2/mode"
import Sidebar, { MobileTopBar } from "@/components/business/v2/Sidebar"
import { CommandPaletteProvider } from "@/components/business/v2/CommandPalette"
import OnboardingMode from "@/components/business/v2/OnboardingMode"
import SupportBubble from "@/components/support/SupportBubble"

function Shell({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth()
  const { needsOnboarding } = useDashboardMode()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-3">
          <svg className="size-7 animate-spin text-[#05EB54]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading dashboard…</p>
        </div>
      </div>
    )
  }

  // First entry: one-question setup before anything else
  if (needsOnboarding) {
    return <OnboardingMode />
  }

  return (
    <VenueProvider>
      <CommandPaletteProvider>
        <div className="flex min-h-screen bg-neutral-50 text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <MobileTopBar />
            <main className="min-w-0 flex-1 overflow-x-hidden">
              <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
            </main>
          </div>
          <SupportBubble />
        </div>
      </CommandPaletteProvider>
    </VenueProvider>
  )
}

export default function V2DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <BusinessAuthProvider>
      <ThemeProvider>
        <Shell>{children}</Shell>
      </ThemeProvider>
    </BusinessAuthProvider>
  )
}
