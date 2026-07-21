"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { apiClient } from "./api-client"
import { useAuth } from "./auth-context"
import { resolveInitialVenueSelection } from "./venue-selection"
import type { Venue } from "./types"
import { userVenueIds, resolveSwitcherScope, initialSetSelection } from "./team-venues"

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
      let active = data.venues.filter((v) => v.is_active)

      // TM-B2 (#15): a member may be scoped to a SET of venues. Reconcile the
      // caller's effective set (venue_ids ?? scalar venue_id) against the active
      // list. mode "global" ⇒ unchanged; "single" ⇒ today's hard lock byte-for-
      // byte; "set" (>1) ⇒ restrict to the set with an "all-of-mine" default.
      const myVenueIds = userVenueIds(user)
      const scope = resolveSwitcherScope(myVenueIds, active)
      active = scope.venues

      setVenues(active)

      // Resolve the initial selection per scope mode:
      //  - "set" (>1 venues): the TM-B2 addition — switchable across the set with
      //    an all-of-mine default (initialSetSelection).
      //  - "single" / "global": defer to dev's scalar resolver, which is unchanged
      //    here. lockedVenueId is the one id in "single" (hard lock) and null in
      //    "global" (where the resolver defaults to "all" — so venue-scoped fetches
      //    like Payouts are never silently single-venue filtered).
      const urlParams = new URLSearchParams(window.location.search)
      if (scope.mode === "set") {
        const initial = initialSetSelection(
          myVenueIds,
          urlParams.get("venue_id"),
          localStorage.getItem(VENUE_STORAGE_KEY),
        )
        setSelectedVenueId(initial)
        localStorage.setItem(VENUE_STORAGE_KEY, String(initial))
      } else {
        const selection = resolveInitialVenueSelection({
          userVenueId: scope.lockedVenueId,
          activeVenueIds: active.map((v) => v.id),
          urlVenueId: urlParams.get("venue_id"),
          storedVenueId: localStorage.getItem(VENUE_STORAGE_KEY),
        })
        setSelectedVenueId(selection)
        if (selection !== null) {
          localStorage.setItem(VENUE_STORAGE_KEY, String(selection))
        }
      }

      // Check if first-time wizard should show:
      // - Zero venues: always show (even if previously dismissed - user needs at least one)
      // - Exactly 1 venue whose name matches the business name (auto-created default): show unless dismissed
      const wizardDismissed = localStorage.getItem(WIZARD_DISMISSED_KEY)
      if (
        business &&
        business.status === "approved" &&
        (active.length === 0 ||
          (!wizardDismissed &&
            active.length === 1 &&
            active[0].name.trim().toLowerCase() === business.name.trim().toLowerCase()))
      ) {
        setShowWizard(true)
      }
    } catch {
      setVenues([])
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, business, user])

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
    // Sync venue selection to URL for shareability
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      if (id === "all") {
        url.searchParams.delete("venue_id")
      } else {
        url.searchParams.set("venue_id", String(id))
      }
      window.history.replaceState({}, "", url.toString())
    }
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
