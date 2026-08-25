"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { useRouter } from "next/navigation"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { CalendarDays, Search, Tag } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenueParam } from "@/lib/business/venue-context"
import { apiClient } from "@/lib/business/api-client"
import {
  buildDealItems,
  buildEventItems,
  buildPageItems,
  dedupeItems,
  filterPaletteItems,
  groupPaletteItems,
  isCommandPaletteHotkey,
  type PaletteItem,
} from "@/lib/business/command-palette"
import { probeInactiveSeriesIds } from "@/lib/business/inactive-series-probe"
import { useDashboardMode } from "@/lib/v2/mode"
import { cn } from "@/lib/v2/utils"
import type { DealListItem, EventListItem } from "@/lib/business/types"

interface CommandPaletteContextValue {
  openSearch: () => void
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null)

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext)
  if (!ctx) throw new Error("useCommandPalette must be used within CommandPaletteProvider")
  return ctx
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isCommandPaletteHotkey(event)) return
      event.preventDefault()
      setOpen((current) => !current)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const openSearch = useCallback(() => setOpen(true), [])

  return (
    <CommandPaletteContext.Provider value={{ openSearch }}>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} />
    </CommandPaletteContext.Provider>
  )
}

function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const { user, isPending } = useAuth()
  const { config } = useDashboardMode()
  const venueParam = useVenueParam()
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const [eventItems, setEventItems] = useState<PaletteItem[]>([])
  const [dealItems, setDealItems] = useState<PaletteItem[]>([])
  const [loadingRecords, setLoadingRecords] = useState(false)

  const pageItems = useMemo(
    () =>
      buildPageItems({
        showDeals: config.showDeals,
        showEvents: config.showEvents,
        isPending,
        role: user?.business_role,
        canViewPayouts: user?.can_view_payouts,
      }),
    [config.showDeals, config.showEvents, isPending, user?.business_role, user?.can_view_payouts],
  )

  const items = useMemo(
    () => filterPaletteItems([...pageItems, ...eventItems, ...dealItems], query),
    [pageItems, eventItems, dealItems, query],
  )
  const groups = useMemo(() => groupPaletteItems(items), [items])

  useEffect(() => {
    if (!open) {
      setQuery("")
      setActiveIndex(0)
      return
    }
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    active?.scrollIntoView({ block: "nearest" })
  }, [activeIndex, items])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoadingRecords(true)

    const load = async () => {
      try {
        const eventRequests: Promise<EventListItem[]>[] = []
        if (config.showEvents) {
          for (const tab of ["upcoming", "drafts", "past"] as const) {
            eventRequests.push(
              apiClient
                .get<{ events: EventListItem[] }>(`/business/events?tab=${tab}&page=1&limit=30${venueParam}`)
                .then((data) => data.events ?? [])
                .catch(() => []),
            )
          }
        }
        const dealRequest = config.showDeals
          ? apiClient
              .get<{ deals: DealListItem[] }>(`/business/deals?tab=live&page=1&limit=30${venueParam}`)
              .then((data) => buildDealItems(data.deals ?? []))
              .catch(() => [] as PaletteItem[])
          : Promise.resolve([] as PaletteItem[])

        const [eventChunks, dealItems] = await Promise.all([
          Promise.all(eventRequests),
          dealRequest,
        ])
        if (cancelled) return
        const events = eventChunks.flat()
        const inactive = await probeInactiveSeriesIds(events, (id) =>
          apiClient.get(`/business/recurring-series/${id}`),
        )
        if (cancelled) return
        const all = dedupeItems([...buildEventItems(events, inactive), ...dealItems])
        setEventItems(all.filter((item) => item.kind === "event"))
        setDealItems(all.filter((item) => item.kind === "deal"))
      } finally {
        if (!cancelled) setLoadingRecords(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [open, venueParam, config.showEvents, config.showDeals])

  const go = useCallback(
    (item: PaletteItem) => {
      onOpenChange(false)
      router.push(item.href)
    },
    [onOpenChange, router],
  )

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((index) => (items.length === 0 ? 0 : (index + 1) % items.length))
      return
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((index) => (items.length === 0 ? 0 : (index - 1 + items.length) % items.length))
      return
    }
    if (event.key === "Enter") {
      event.preventDefault()
      const item = items[activeIndex]
      if (item) go(item)
    }
  }

  let optionOffset = 0

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-[1px] animate-[v2-fade-in_150ms_ease-out] dark:bg-neutral-950/70" />
        <DialogPrimitive.Content
          aria-label="Search"
          className="fixed left-1/2 top-[12%] z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl outline-none animate-[v2-fade-in_150ms_ease-out] dark:border-neutral-800 dark:bg-neutral-900"
        >
          <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search pages, events, and deals. Use the arrow keys to move and Enter to open.
          </DialogPrimitive.Description>

          <div className="flex items-center gap-2 border-b border-neutral-200 px-3 dark:border-neutral-800">
            <Search className="size-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Search pages, events, and deals"
              className="h-12 min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100 dark:placeholder:text-neutral-500"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={items[activeIndex] ? `${listId}-${items[activeIndex].id}` : undefined}
            />
            <kbd className="hidden rounded-md bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-500 sm:inline dark:bg-neutral-800 dark:text-neutral-400">
              ESC
            </kbd>
          </div>

          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Search results"
            className="max-h-[min(420px,60vh)] overflow-y-auto p-2"
          >
            {groups.map((group) => {
              const start = optionOffset
              optionOffset += group.items.length
              return (
                <div key={group.kind} className="mb-1">
                  <div className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    {group.label}
                  </div>
                  {group.items.map((item, index) => {
                    const absolute = start + index
                    const active = absolute === activeIndex
                    return (
                      <button
                        key={item.id}
                        id={`${listId}-${item.id}`}
                        type="button"
                        role="option"
                        aria-selected={active}
                        data-active={active || undefined}
                        onMouseEnter={() => setActiveIndex(absolute)}
                        onClick={() => go(item)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                          active
                            ? "bg-green-50 font-semibold text-green-700 dark:bg-green-950/40 dark:text-green-400"
                            : "text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800/60",
                        )}
                      >
                        <ResultIcon kind={item.kind} active={active} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{item.label}</span>
                          {item.hint && (
                            <span className={cn(
                              "block truncate text-xs font-normal",
                              active ? "text-green-700/70 dark:text-green-400/70" : "text-neutral-400 dark:text-neutral-500",
                            )}>
                              {item.hint}
                            </span>
                          )}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            })}

            {items.length === 0 && !loadingRecords && (
              <p className="px-2.5 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                Nothing matches that search.
              </p>
            )}
            {items.length === 0 && loadingRecords && (
              <p className="px-2.5 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                Searching…
              </p>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function ResultIcon({ kind, active }: { kind: PaletteItem["kind"]; active: boolean }) {
  const className = cn("size-4 shrink-0", active ? "text-green-600 dark:text-green-400" : "text-neutral-400 dark:text-neutral-500")
  if (kind === "event") return <CalendarDays className={className} />
  if (kind === "deal") return <Tag className={className} />
  return <Search className={className} />
}
