"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home, CalendarDays, Tag, Zap, Megaphone, BarChart3, Users, Settings,
  Search, ChevronsUpDown, Lock, LogOut, Check, Plus, MapPin, LifeBuoy,
  Sun, Moon, TicketPercent,
} from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue } from "@/lib/business/venue-context"
import { useTheme } from "@/lib/v2/theme"
import { useDashboardMode } from "@/lib/v2/mode"
import { cn } from "@/lib/v2/utils"
import { Avatar, AvatarFallback } from "./ui/avatar"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "./ui/dropdown-menu"

type Feature = "showDeals" | "showEvents" | "showLineSkips"

type Item = {
  label: string
  href: string
  icon: React.ElementType
  lockWhenPending?: boolean
  /** Only show when the mode config flag is true; undefined = always show */
  feature?: Feature
}

const GROUPS: { label?: string; items: Item[] }[] = [
  { items: [
    { label: "Home", href: "/business/v2", icon: Home },
    { label: "Events", href: "/business/v2/events", icon: CalendarDays, feature: "showEvents" },
    { label: "Universal promo codes", href: "/business/v2/promo-codes", icon: TicketPercent, feature: "showEvents" },
    { label: "Deals", href: "/business/v2/deals", icon: Tag, feature: "showDeals" },
    { label: "Line skips", href: "/business/v2/line-skips", icon: Zap, feature: "showLineSkips" },
  ] },
  { label: "Grow", items: [
    { label: "Marketing", href: "/business/v2/marketing", icon: Megaphone, lockWhenPending: true },
    { label: "Analytics", href: "/business/v2/analytics", icon: BarChart3, lockWhenPending: true },
  ] },
  { label: "Workspace", items: [
    { label: "Team", href: "/business/v2/team", icon: Users },
    { label: "Settings", href: "/business/v2/settings", icon: Settings },
  ] },
]

function initials(s?: string) {
  if (!s) return "?"
  return s.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")
}

export default function Sidebar() {
  const pathname = usePathname()
  const { user, business, isPending, logout } = useAuth()
  const { venues, selectedVenue, selectedVenueId, isAllVenues, setSelectedVenue } = useVenue()
  const { resolvedTheme, setTheme } = useTheme()
  const { config } = useDashboardMode()

  const venueName = isAllVenues ? "All venues" : selectedVenue?.name ?? business?.name ?? "Select venue"

  const visibleGroups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.feature || config[item.feature]),
  })).filter((group) => group.items.length > 0)

  return (
    <aside className="flex w-[264px] shrink-0 flex-col gap-1 border-r border-neutral-200 bg-white px-4 pb-4 pt-5 dark:border-neutral-800 dark:bg-neutral-900">
      {/* brand */}
      <Link href="/business/v2" className="mb-1 flex items-center px-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/bizzy-logo.png" alt="Bizzy" className="h-8 w-auto" />
      </Link>

      {/* venue switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger className="mt-1 flex items-center gap-2.5 rounded-lg border border-neutral-200 p-2 text-left outline-none transition-colors hover:bg-neutral-50 data-[state=open]:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/60 dark:data-[state=open]:bg-neutral-800/60">
          <span className="flex size-8 items-center justify-center rounded-lg bg-green-100 text-sm font-bold text-green-700 dark:bg-green-950/60 dark:text-green-400">
            {initials(isAllVenues ? "All" : venueName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{venueName}</span>
            <span className="block text-xs text-neutral-500 dark:text-neutral-400">{user?.business_role ? `${user.business_role} workspace` : "Workspace"}</span>
          </span>
          <ChevronsUpDown className="size-4 text-neutral-400" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[232px]">
          <DropdownMenuLabel>Venues</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setSelectedVenue("all")}>
            <MapPin /> All venues
            {isAllVenues && <Check className="ml-auto size-4 text-[#05EB54]" />}
          </DropdownMenuItem>
          {venues.map((v) => (
            <DropdownMenuItem key={v.id} onSelect={() => setSelectedVenue(v.id)}>
              <MapPin /> <span className="truncate">{v.name}</span>
              {selectedVenueId === v.id && <Check className="ml-auto size-4 text-[#05EB54]" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-[#05EB54] focus:bg-green-50 [&_svg]:text-[#05EB54] dark:focus:bg-green-950/40">
            <Plus /> Add venue
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* search */}
      <button className="mt-2.5 flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-left shadow-sm outline-none transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800/60">
        <Search className="size-4 text-neutral-400 dark:text-neutral-500" />
        <span className="flex-1 text-sm text-neutral-500 dark:text-neutral-400">Search</span>
        <kbd className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">⌘K</kbd>
      </button>

      {/* nav */}
      <nav className="mt-3 flex flex-1 flex-col gap-0.5">
        {visibleGroups.map((group, gi) => (
          <div key={gi} className={cn(gi > 0 && "mt-3")}>
            {group.label && (
              <div className="px-2.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const active = item.href === "/business/v2" ? pathname === "/business/v2" : pathname.startsWith(item.href)
              const locked = isPending && item.lockWhenPending
              return (
                <Link
                  key={item.href}
                  href={locked ? "#" : item.href}
                  aria-disabled={locked}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-green-50 font-semibold text-green-700 dark:bg-green-950/40 dark:text-green-400"
                      : "text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800/60",
                    locked && "cursor-default text-neutral-400 hover:bg-transparent dark:text-neutral-600 dark:hover:bg-transparent"
                  )}
                >
                  <item.icon className={cn("size-5", active ? "text-green-600 dark:text-green-400" : locked ? "text-neutral-300 dark:text-neutral-700" : "text-neutral-500 dark:text-neutral-500")} />
                  <span className="flex-1">{item.label}</span>
                  {locked && <Lock className="size-3.5 text-neutral-300 dark:text-neutral-700" />}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* help */}
      <Link href="/business/v2/help" className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800/60">
        <LifeBuoy className="size-5 text-neutral-500" /> Help & tutorials
      </Link>

      {/* footer: profile → settings, theme toggle, log out */}
      <div className="mt-1 flex items-center gap-1 border-t border-neutral-100 pt-3 dark:border-neutral-800">
        <Link
          href="/business/v2/settings"
          title="Profile & settings"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 outline-none transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-[#E8EDFF] text-[#3A5BD9] dark:bg-[#1e2747] dark:text-[#8da6f5]">{initials(user?.full_name)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">{user?.full_name ?? "—"}</span>
            <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{user?.email}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 outline-none transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        >
          {resolvedTheme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </button>
        <button
          type="button"
          onClick={() => logout()}
          title="Log out"
          aria-label="Log out"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 outline-none transition-colors hover:bg-red-50 hover:text-red-600 dark:text-neutral-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
        >
          <LogOut className="size-[18px]" />
        </button>
      </div>
    </aside>
  )
}
