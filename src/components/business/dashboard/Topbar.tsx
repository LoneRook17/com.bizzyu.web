"use client"

import { useAuth } from "@/lib/business/auth-context"
import { ROLE_LABELS } from "@/lib/business/constants"

interface TopbarProps {
  onMenuClick: () => void
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user, business } = useAuth()

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

      {/* Business name */}
      <div className="flex-1 md:flex-none">
        <h1 className="text-lg font-semibold text-ink truncate text-center md:text-left">
          {business?.name || "Dashboard"}
        </h1>
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
