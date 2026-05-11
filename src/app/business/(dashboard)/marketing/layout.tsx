"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const SUB_NAV = [
  { label: "Attendees", href: "/business/marketing" },
  { label: "Campaigns", href: "/business/marketing/campaigns" },
]

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div>
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex gap-6" aria-label="Marketing sub-nav">
          {SUB_NAV.map((tab) => {
            const isActive =
              tab.href === "/business/marketing"
                ? pathname === "/business/marketing"
                : pathname.startsWith(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`-mb-px border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-ink"
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>
      {children}
    </div>
  )
}
