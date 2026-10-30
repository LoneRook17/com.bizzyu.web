"use client"

import Link from "next/link"
import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import {
  Home, CalendarDays, BookOpen, Tag, Megaphone, BarChart3, Users, Settings,
  Search, ChevronsUpDown, ChevronRight, Lock, LogOut, Check, Plus, MapPin, CircleHelp,
  Sun, Moon, TicketPercent, Menu, X, Banknote, MessageCircle,
} from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue } from "@/lib/business/venue-context"
import { canAccessPayouts } from "@/lib/business/payouts-access"
import { isKnightBusiness } from "@/lib/business/knight"
import { useTheme } from "@/lib/v2/theme"
import { useDashboardMode } from "@/lib/v2/mode"
import { cn } from "@/lib/v2/utils"
import { shellPageLabel, shellRoleLabel } from "@/lib/business/shell-breadcrumb"
import { toggleSupportChat } from "@/components/support/SupportBubble"
import { useCommandPalette } from "./CommandPalette"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "./ui/dropdown-menu"

type Feature = "showDeals" | "showEvents" | "showLineSkips" | "showRecurring"
// showLineSkips / showRecurring stay in the union on purpose: the mode config
// still carries them and the Events page still gates its Weekly Access segment
// on showLineSkips. They are simply no longer NAV features (D2-6).
type BusinessRole = "owner" | "manager" | "staff" | "promoter"

type NavContext = { role?: BusinessRole; canViewPayouts?: boolean; businessId?: number | null }

type Item = {
  label: string
  href: string
  icon: React.ElementType
  lockWhenPending?: boolean
  /** Only show when the mode config flag is true; undefined = always show */
  feature?: Feature
  /** Only show for these roles; undefined = show for all. Server enforces regardless. */
  roles?: BusinessRole[]
  /** Fine-grained visibility predicate (e.g. Payouts: owner OR granted member).
   *  undefined = always show. Server enforces regardless. */
  show?: (ctx: NavContext) => boolean
}

/**
 * The 5.0 rail (D2-6). Exactly three groups, and deliberately short.
 *
 * What left, and where each capability went — the rail is the ONLY thing that
 * changed, no route was deleted:
 *   • Recurring      → recurring events are ordinary events (D2-2). Series are
 *                      reached from the Events list's grouped series rows,
 *                      which link to /business/recurring/:id as before.
 *   • Door Access    → not a nav item (D2-6): it is a TYPE inside Events/Home,
 *                      the pink Weekly Access rows. /business/door-access/:id
 *                      is still the series page those rows open.
 *   • Skip the line tickets     → D2-3. Legacy schedules stay reachable through a muted
 *                      link inside the Events page's Weekly Access view until
 *                      F15 converts them. NOT nav — that is the whole point.
 *   • Promo codes    → moved down into GROW, unchanged otherwise.
 */
const GROUPS: { label?: string; items: Item[] }[] = [
  { items: [
    { label: "Home", href: "/business", icon: Home },
    { label: "Events", href: "/business/events", icon: CalendarDays, feature: "showEvents" },
    { label: "Lib Menu", href: "/business/drinks", icon: BookOpen, show: (ctx) => isKnightBusiness(ctx.businessId != null ? { business_id: ctx.businessId } : null) },
    { label: "Deals", href: "/business/deals", icon: Tag, feature: "showDeals" },
  ] },
  { label: "Grow", items: [
    { label: "Marketing", href: "/business/marketing", icon: Megaphone, lockWhenPending: true },
    { label: "Analytics", href: "/business/analytics", icon: BarChart3, lockWhenPending: true },
    { label: "Universal promo codes", href: "/business/promo-codes", icon: TicketPercent, feature: "showEvents" },
    // PAYOUTS-PER-PERSON-ACCESS: owner OR a member the owner has granted
    // (/me → can_view_payouts). Same predicate the /business/payouts route guard
    // uses, so the tab and the screen can never disagree.
    { label: "Payouts", href: "/business/payouts", icon: Banknote, lockWhenPending: true, show: (ctx) => canAccessPayouts(ctx.role, ctx.canViewPayouts) },
  ] },
  { label: "Workspace", items: [
    { label: "Team", href: "/business/team", icon: Users },
    { label: "Settings", href: "/business/settings", icon: Settings },
  ] },
]

function initials(s?: string) {
  if (!s) return "?"
  return s.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")
}

/**
 * BETA visual polish: the framed avatar the mocks use everywhere (venue
 * switcher, footer, top bar). A rounded square with a hairline ring, initials
 * or a photo inside. Never a tinted blob.
 */
export function FramedAvatar({ label, src, className }: { label: string; src?: string | null; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 text-[12px] font-semibold text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="h-full w-full object-cover" />
      ) : (
        initials(label)
      )}
    </span>
  )
}

/** One look for every sidebar row: 44px, 20px outline icon, quiet until active. */
const NAV_ROW =
  "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#05EB54]/40"
const NAV_IDLE = "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-100"
const NAV_ICON = "size-5 shrink-0"

/**
 * Inner sidebar UI, shared between the static desktop rail and the mobile
 * drawer. `onNavigate` lets the drawer close itself when a link is followed.
 */
export function SidebarContent({ onNavigate, inDrawer = false }: { onNavigate?: () => void; inDrawer?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, business, isPending, logout } = useAuth()
  const { venues, selectedVenue, selectedVenueId, isAllVenues, setSelectedVenue } = useVenue()
  const { config } = useDashboardMode()
  const { openSearch } = useCommandPalette()

  const venueName = isAllVenues ? "All venues" : selectedVenue?.name ?? business?.name ?? "Select venue"

  const role = user?.business_role
  const navContext: NavContext = { role, canViewPayouts: user?.can_view_payouts, businessId: business?.business_id ?? null }
  const visibleGroups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        (!item.feature || config[item.feature]) &&
        (!item.roles || (role != null && item.roles.includes(role))) &&
        (!item.show || item.show(navContext)),
    ),
  })).filter((group) => group.items.length > 0)

  return (
    <div className="flex min-h-full flex-col gap-1 px-3 pb-3 pt-5">
      {/* brand: the real Bizzy wordmark asset, never a re-drawn logotype */}
      <Link href="/business" onClick={onNavigate} className="mb-2 flex w-fit items-center px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/bizzy-logo.png" alt="Bizzy" className="h-8 w-auto" />
      </Link>

      {/* venue switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger className="mt-1 flex items-center gap-3 rounded-[10px] border border-neutral-200 bg-white p-2.5 text-left outline-none transition-colors hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-[#05EB54]/40 data-[state=open]:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950/60 dark:hover:bg-neutral-800/60 dark:data-[state=open]:bg-neutral-800/60">
          {/* Selected venue's own photo; business logo for "All venues" or photo-less venues */}
          <FramedAvatar
            label={isAllVenues ? "All" : venueName}
            src={(!isAllVenues && selectedVenue?.photo_url) || business?.logo_url || null}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{venueName}</span>
            {business?.name && business.name !== venueName && (
              <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{business.name}</span>
            )}
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
          <DropdownMenuItem
            className="text-[#05EB54] focus:bg-green-50 [&_svg]:text-[#05EB54] dark:focus:bg-green-950/40"
            onSelect={() => { onNavigate?.(); router.push("/business/settings?action=add-venue") }}
          >
            <Plus /> Add venue
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* search / command palette trigger */}
      <button
        type="button"
        onClick={() => {
          openSearch()
          onNavigate?.()
        }}
        aria-label="Search"
        aria-haspopup="dialog"
        aria-keyshortcuts="Meta+K Control+K"
        className="mt-2 flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-left outline-none transition-colors hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-[#05EB54]/40 dark:border-neutral-800 dark:bg-neutral-950/60 dark:hover:bg-neutral-800/60"
      >
        <Search className="size-4 text-neutral-400 dark:text-neutral-500" />
        <span className="flex-1 text-sm text-neutral-500 dark:text-neutral-400">Search</span>
        <kbd className="font-sans text-xs font-medium text-neutral-400 dark:text-neutral-500">⌘K</kbd>
      </button>

      {/* nav */}
      <nav className="mt-3 flex flex-1 flex-col gap-0.5">
        {visibleGroups.map((group, gi) => (
          <div key={gi} className={cn("flex flex-col gap-0.5", gi > 0 && "mt-3")}>
            {/* Quiet group label: small and muted, no letterspacing. */}
            {group.label && (
              <div className="px-3 pb-1 pt-1 text-[11px] font-medium uppercase text-neutral-400 dark:text-neutral-500">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const active = item.href === "/business" ? pathname === "/business" : pathname.startsWith(item.href)
              const locked = isPending && item.lockWhenPending
              return (
                <Link
                  key={item.href}
                  href={locked ? "#" : item.href}
                  onClick={locked ? undefined : onNavigate}
                  aria-disabled={locked}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    NAV_ROW,
                    active
                      ? "bg-[#05EB54]/10 font-semibold text-neutral-900 dark:bg-[#05EB54]/[0.09] dark:text-neutral-100"
                      : NAV_IDLE,
                    locked && "cursor-default text-neutral-400 hover:bg-transparent hover:text-neutral-400 dark:text-neutral-600 dark:hover:bg-transparent dark:hover:text-neutral-600"
                  )}
                >
                  <item.icon
                    strokeWidth={1.75}
                    className={cn(NAV_ICON, active ? "text-[#0A8038] dark:text-[#05EB54]" : locked ? "text-neutral-300 dark:text-neutral-700" : "text-neutral-500 dark:text-neutral-400")}
                  />
                  <span className="flex-1">{item.label}</span>
                  {locked && <Lock className="size-3.5 text-neutral-300 dark:text-neutral-700" />}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* help */}
      <Link href="/business/help" onClick={onNavigate} className={cn(NAV_ROW, NAV_IDLE, "mt-2")}>
        <CircleHelp strokeWidth={1.75} className={cn(NAV_ICON, "text-neutral-500 dark:text-neutral-400")} /> Help & tutorials
      </Link>

      {/* footer: profile → settings, log out. Theme lives in the desktop top
          bar; the mobile drawer keeps its own toggle here. */}
      <div className="mt-2 flex items-center gap-1 border-t border-neutral-200 pt-3 dark:border-neutral-800">
        <Link
          href="/business/settings"
          onClick={onNavigate}
          title={user?.email ?? "Profile & settings"}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1.5 outline-none transition-colors hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-[#05EB54]/40 dark:hover:bg-neutral-800/60"
        >
          <FramedAvatar label={user?.full_name ?? "?"} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">{user?.full_name ?? "-"}</span>
            <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">{shellRoleLabel(role, user?.email)}</span>
          </span>
        </Link>
        {inDrawer && <ThemeToggleButton />}
        <button
          type="button"
          onClick={() => logout()}
          title="Log out"
          aria-label="Log out"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 outline-none transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-[#05EB54]/40 dark:text-neutral-400 dark:hover:bg-[#FF6B72]/10 dark:hover:text-[#FF6B72]"
        >
          <LogOut strokeWidth={1.75} className="size-[18px]" />
        </button>
      </div>
    </div>
  )
}

const TOP_ICON =
  "flex size-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 outline-none transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-[#05EB54]/40 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"

function ThemeToggleButton() {
  const { resolvedTheme, setTheme } = useTheme()
  const label = resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      title={label}
      aria-label={label}
      className={TOP_ICON}
    >
      {resolvedTheme === "dark" ? <Sun strokeWidth={1.75} className="size-[18px]" /> : <Moon strokeWidth={1.75} className="size-[18px]" />}
    </button>
  )
}

/**
 * Desktop-only top bar (lg+): "Venue › Page" on the left; chat, theme, help
 * and the account menu on the right. Below lg the MobileTopBar takes over.
 */
export function DesktopTopBar() {
  const pathname = usePathname()
  const { user, business, logout } = useAuth()
  const { selectedVenue, isAllVenues } = useVenue()
  const venueName = isAllVenues ? "All venues" : selectedVenue?.name ?? business?.name ?? ""

  return (
    <header className="sticky top-0 z-30 hidden h-14 items-center gap-2 border-b border-neutral-200 bg-white/95 px-8 backdrop-blur lg:flex dark:border-neutral-800 dark:bg-neutral-950/95">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13px]">
        {venueName && (
          <>
            <span className="truncate text-neutral-500 dark:text-neutral-400">{venueName}</span>
            <ChevronRight aria-hidden className="size-3.5 shrink-0 text-neutral-400 dark:text-neutral-600" />
          </>
        )}
        <span aria-current="page" className="truncate font-medium text-neutral-900 dark:text-neutral-100">{shellPageLabel(pathname)}</span>
      </nav>
      <div className="ml-auto flex items-center gap-1">
        <button type="button" onClick={toggleSupportChat} title="Chat with support" aria-label="Chat with support" className={TOP_ICON}>
          <MessageCircle strokeWidth={1.75} className="size-[18px]" />
        </button>
        <ThemeToggleButton />
        <Link href="/business/help" title="Help & tutorials" aria-label="Help & tutorials" className={TOP_ICON}>
          <CircleHelp strokeWidth={1.75} className="size-[18px]" />
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Account" className="ml-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#05EB54]/40">
            <FramedAvatar label={user?.full_name ?? "?"} className="size-8 text-[11px]" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[220px]">
            <DropdownMenuLabel className="truncate">{user?.email ?? user?.full_name}</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href="/business/settings"><Settings /> Profile & settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => logout()}>
              <LogOut /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

/** Static desktop rail - hidden below lg, where MobileTopBar takes over. */
export default function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 overflow-y-auto border-r border-neutral-200 bg-white lg:block dark:border-neutral-800 dark:bg-neutral-900">
      <SidebarContent />
    </aside>
  )
}

/** Mobile-only sticky top bar with a hamburger that opens the sidebar as a slide-in drawer. */
export function MobileTopBar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { user, business } = useAuth()
  const { selectedVenue, isAllVenues } = useVenue()
  const venueName = isAllVenues ? "All venues" : selectedVenue?.name ?? business?.name ?? ""

  // Safety net: close on any route change (covers navigations that bypass onNavigate)
  const [lastPathname, setLastPathname] = useState(pathname)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    if (open) setOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-neutral-200 bg-white/95 px-3 backdrop-blur lg:hidden dark:border-neutral-800 dark:bg-neutral-950/95">
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="flex size-10 items-center justify-center rounded-lg text-neutral-600 outline-none transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <Menu strokeWidth={1.75} className="size-5" />
      </button>
      <Link href="/business" className="flex shrink-0 items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/bizzy-logo.png" alt="Bizzy" className="h-7 w-auto" />
      </Link>
      <span className="min-w-0 flex-1 truncate text-center text-[13px] font-medium text-neutral-600 dark:text-neutral-300">{venueName}</span>
      <Link href="/business/settings" aria-label="Profile & settings" className="shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#05EB54]/40">
        <FramedAvatar label={user?.full_name ?? "?"} className="size-8 text-[11px]" />
      </Link>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-[1px] animate-[v2-fade-in_150ms_ease-out] dark:bg-neutral-950/70" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 w-[290px] max-w-[85vw] overflow-y-auto border-r border-neutral-200 bg-white shadow-xl outline-none animate-[v2-drawer-in_200ms_ease-out] dark:border-neutral-800 dark:bg-neutral-900"
          >
            <DialogPrimitive.Title className="sr-only">Navigation menu</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close menu"
              className="absolute right-2 top-4 flex size-9 items-center justify-center rounded-lg text-neutral-500 outline-none transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
            <SidebarContent inDrawer onNavigate={() => setOpen(false)} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </header>
  )
}
