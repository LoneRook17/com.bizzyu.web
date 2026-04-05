"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import SidebarLink from "./SidebarLink"
import { useAuth } from "@/lib/business/auth-context"
import { NAV_LINKS, ROLE_LABELS, APPROVED_ONLY_ROUTES, ROLE_HIDDEN_ROUTES } from "@/lib/business/constants"

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, business, isPending, logout } = useAuth()

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
    </>
  )
}
