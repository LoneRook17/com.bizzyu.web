"use client"

import { useState, useRef, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import SidebarLink from "./SidebarLink"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue } from "@/lib/business/venue-context"
import { NAV_LINKS, ROLE_LABELS, APPROVED_ONLY_ROUTES, ROLE_HIDDEN_ROUTES } from "@/lib/business/constants"
import CreateVenueModal from "./CreateVenueModal"

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, business, isPending, logout } = useAuth()
  const { venues, selectedVenue, selectedVenueId, isAllVenues, setSelectedVenue } = useVenue()
  const [venueDropdownOpen, setVenueDropdownOpen] = useState(false)
  const [createVenueOpen, setCreateVenueOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const canAddVenue = user?.business_role === "owner" || user?.business_role === "manager"

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setVenueDropdownOpen(false)
      }
    }
    if (venueDropdownOpen) {
      document.addEventListener("mousedown", handleClick)
      return () => document.removeEventListener("mousedown", handleClick)
    }
  }, [venueDropdownOpen])

  const displayName = isAllVenues
    ? "All Venues"
    : selectedVenue?.name ?? "Select Venue"

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-gray-200 transition-transform duration-200 md:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center px-6 border-b border-gray-100">
          <Link href="/business" onClick={onClose}>
            <img src="/images/bizzy-logo.png" alt="Bizzy" className="h-7" />
          </Link>
        </div>

        {/* Venue switcher */}
        {(venues.length > 0 || canAddVenue) && (
          <div className="px-3 pt-3 pb-1" ref={dropdownRef}>
            {venues.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => setVenueDropdownOpen((p) => !p)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-ink hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    <span className="truncate font-medium">{displayName}</span>
                  </div>
                  <svg
                    className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${venueDropdownOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {venueDropdownOpen && (
                  <div className="mt-1 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                    {/* All Venues option */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVenue("all")
                        setVenueDropdownOpen(false)
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors cursor-pointer ${
                        isAllVenues
                          ? "bg-primary/5 text-primary font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                      </svg>
                      All Venues
                      {isAllVenues && (
                        <svg className="h-4 w-4 ml-auto text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </button>

                    <div className="border-t border-gray-100" />

                    {/* Venue list */}
                    {venues.map((venue) => (
                      <button
                        key={venue.id}
                        type="button"
                        onClick={() => {
                          setSelectedVenue(venue.id)
                          setVenueDropdownOpen(false)
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors cursor-pointer ${
                          selectedVenueId === venue.id
                            ? "bg-primary/5 text-primary font-medium"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        <span className="truncate">{venue.name}</span>
                        {selectedVenueId === venue.id && (
                          <svg className="h-4 w-4 ml-auto text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </button>
                    ))}

                    {/* Add Venue button */}
                    {canAddVenue && (
                      <>
                        <div className="border-t border-gray-100" />
                        <button
                          type="button"
                          onClick={() => {
                            setVenueDropdownOpen(false)
                            setCreateVenueOpen(true)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          Add Venue
                        </button>
                      </>
                    )}
                  </div>
                )}
              </>
            ) : canAddVenue ? (
              <button
                type="button"
                onClick={() => setCreateVenueOpen(true)}
                className="flex w-full items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Your First Venue
              </button>
            ) : null}
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/business"
                ? pathname === "/business"
                : pathname.startsWith(link.href)

            const isDisabled = isPending && APPROVED_ONLY_ROUTES.includes(link.href)

            // Hide links that the current role shouldn't see
            const hiddenRoles = ROLE_HIDDEN_ROUTES[link.href]
            if (hiddenRoles && user && hiddenRoles.includes(user.business_role)) {
              return null
            }

            return (
              <div key={link.href} onClick={!isDisabled ? onClose : undefined}>
                <SidebarLink
                  href={link.href}
                  label={link.label}
                  icon={link.icon}
                  active={isActive}
                  disabled={isDisabled}
                />
              </div>
            )
          })}
        </nav>

        {/* Help link — always visible */}
        <div className="px-3 pb-1">
          <div onClick={onClose}>
            <SidebarLink
              href="/business/help"
              label="Help & Tutorials"
              icon="help"
              active={pathname === "/business/help"}
            />
          </div>
        </div>

        {/* User section */}
        <div className="border-t border-gray-100 px-4 py-4">
          {user && (
            <div className="mb-3">
              <p className="text-sm font-medium text-ink truncate">{user.full_name}</p>
              <p className="text-xs text-gray-500">{ROLE_LABELS[user.business_role] || user.business_role}</p>
              {business && (
                <p className="text-xs text-gray-400 truncate">{business.name}</p>
              )}
            </div>
          )}
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-ink transition-colors cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Log out
          </button>
        </div>
      </aside>

      {/* Create Venue Modal */}
      <CreateVenueModal
        open={createVenueOpen}
        onClose={() => setCreateVenueOpen(false)}
      />
    </>
  )
}
