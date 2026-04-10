"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { apiClient } from "./api-client"
import { useAuth } from "./auth-context"
import type { Venue } from "./types"

const VENUE_STORAGE_KEY = "bizzy_selected_venue_id"
const WIZARD_DISMISSED_KEY = "bizzy_venue_wizard_dismissed"

interface VenueContextValue {
  venues: Venue[]
  selectedVenue: Venue | null
  selectedVenueId: number | "all" | null
  isAllVenues: boolean
  isLoading: boolean
  showWizard: boolean
  setSelectedVenue: (id: number | "all") => void
  refreshVenues: () => Promise<void>
  dismissWizard: () => void
}

const VenueContext = createContext<VenueContextValue | null>(null)

export function useVenue() {
  const ctx = useContext(VenueContext)
  if (!ctx) throw new Error("useVenue must be used within VenueProvider")
  return ctx
}

/** Returns "&venue_id=X" or "" for use in API query strings */
export function useVenueParam() {
  const { selectedVenueId, isAllVenues } = useVenue()
  if (isAllVenues || selectedVenueId === null) return ""
  return `&venue_id=${selectedVenueId}`
}

export function VenueProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, business, user } = useAuth()
  const [venues, setVenues] = useState<Venue[]>([])
  const [selectedVenueId, setSelectedVenueId] = useState<number | "all" | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)

  const fetchVenues = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const data = await apiClient.get<{ venues: Venue[] }>("/business/venues")
      const active = data.venues.filter((v) => v.is_active)
      setVenues(active)

      // Restore persisted selection
      const stored = localStorage.getItem(VENUE_STORAGE_KEY)
      if (stored === "all") {
        setSelectedVenueId("all")
      } else if (stored) {
        const id = parseInt(stored, 10)
        if (active.some((v) => v.id === id)) {
          setSelectedVenueId(id)
        } else {
          setSelectedVenueId(active[0]?.id ?? null)
        }
      } else {
        setSelectedVenueId(active[0]?.id ?? null)
      }

      // Check if first-time wizard should show:
      // - Zero venues (business registered after migration, venue creation failed or missing)
      // - Exactly 1 venue whose name matches the business name (auto-created default)
      const wizardDismissed = localStorage.getItem(WIZARD_DISMISSED_KEY)
      if (
        !wizardDismissed &&
        business &&
        business.status === "approved" &&
        (active.length === 0 ||
          (active.length === 1 &&
            active[0].name.trim().toLowerCase() === business.name.trim().toLowerCase()))
      ) {
        setShowWizard(true)
      }
    } catch {
      setVenues([])
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, business])

  useEffect(() => {
    if (isAuthenticated) {
      fetchVenues()
    } else {
      setIsLoading(false)
    }
  }, [isAuthenticated, fetchVenues])

  const setSelectedVenue = useCallback((id: number | "all") => {
    setSelectedVenueId(id)
    localStorage.setItem(VENUE_STORAGE_KEY, String(id))
  }, [])

  const dismissWizard = useCallback(() => {
    setShowWizard(false)
    localStorage.setItem(WIZARD_DISMISSED_KEY, "1")
  }, [])

  const selectedVenue =
    selectedVenueId === "all" || selectedVenueId === null
      ? null
      : venues.find((v) => v.id === selectedVenueId) ?? null

  const isAllVenues = selectedVenueId === "all"

  return (
    <VenueContext.Provider
      value={{
        venues,
        selectedVenue,
        selectedVenueId,
        isAllVenues,
        isLoading,
        showWizard,
        setSelectedVenue,
        refreshVenues: fetchVenues,
        dismissWizard,
      }}
    >
      {children}
    </VenueContext.Provider>
  )
}
