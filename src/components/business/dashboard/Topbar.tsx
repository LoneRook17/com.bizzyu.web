"use client"

import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/lib/business/auth-context"
import { ROLE_LABELS } from "@/lib/business/constants"

interface TopbarProps {
  onMenuClick: () => void
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user, business, availableBusinesses, switchBusiness } = useAuth()
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  const others = availableBusinesses.filter((b) => b.business_id !== business?.business_id)
  const showSwitcher = others.length > 0

  const handleSwitch = async (businessId: number) => {
    if (switching) return
    setSwitching(true)
    try {
      await switchBusiness(businessId)
    } catch (e) {
      console.error("Failed to switch business", e)
      setSwitching(false)
      setOpen(false)
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden cursor-pointer"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Business name (with switcher dropdown if user has access to multiple) */}
      <div className="flex-1 md:flex-none relative" ref={dropdownRef}>
        {showSwitcher ? (
          <button
            onClick={() => setOpen(!open)}
            disabled={switching}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-gray-100 disabled:opacity-60 cursor-pointer w-full md:w-auto"
          >
            <h1 className="text-lg font-semibold text-ink truncate">
              {business?.name || "Dashboard"}
            </h1>
            <svg className="h-4 w-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        ) : (
          <h1 className="text-lg font-semibold text-ink truncate text-center md:text-left">
            {business?.name || "Dashboard"}
          </h1>
        )}

        {showSwitcher && open && (
          <div className="absolute left-0 top-full mt-1 w-72 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden z-40">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-100">
              Switch business
            </div>
            <div className="max-h-80 overflow-y-auto">
              {others.map((b) => (
                <button
                  key={b.business_id}
                  onClick={() => handleSwitch(b.business_id)}
                  disabled={switching}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 disabled:opacity-60 cursor-pointer"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                    {b.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{b.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{b.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User info (desktop) */}
      <div className="hidden md:flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-ink">{user?.full_name}</p>
          <p className="text-xs text-gray-500">
            {user ? ROLE_LABELS[user.business_role] || user.business_role : ""}
          </p>
        </div>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
          {user?.full_name?.charAt(0)?.toUpperCase() || "?"}
        </div>
      </div>
    </header>
  )
}
