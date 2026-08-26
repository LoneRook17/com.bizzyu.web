"use client"

import { useState, useRef, useEffect, useMemo, useId } from "react"
import Link from "next/link"
import { Check, ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/v2/utils"
import { campusPickerEmptyHint, requestSchoolHref } from "@/lib/request-school"

export interface CampusOption {
  id: number
  name: string
  full_name?: string | null
}

interface CampusComboboxProps {
  campuses: CampusOption[]
  /** Selected campus id as a string ("" when nothing is selected). */
  value: string
  onChange: (campusId: string) => void
  id?: string
  placeholder?: string
  error?: boolean
  className?: string
}

/** Full institution name with the short handle in parentheses, e.g. "University of South Florida (USF)". */
export function campusLabel(c: CampusOption): string {
  const full = c.full_name?.trim()
  return full ? `${full} (${c.name})` : c.name
}

const inputBase =
  "flex w-full items-center rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#05EB54]/30 focus-visible:border-[#05EB54] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus-visible:border-[#05EB54] dark:focus-visible:ring-[#05EB54]/30"

export default function CampusCombobox({
  campuses,
  value,
  onChange,
  id,
  placeholder = "Select a campus",
  error = false,
  className,
}: CampusComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [highlight, setHighlight] = useState(0)

  const wrapperRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listboxId = useId()

  const selected = useMemo(
    () => campuses.find((c) => String(c.id) === value) ?? null,
    [campuses, value]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return campuses
    return campuses.filter((c) => {
      const full = c.full_name?.toLowerCase() ?? ""
      return c.name.toLowerCase().includes(q) || full.includes(q)
    })
  }, [campuses, query])

  // Close on outside click.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // When opening, reset the query and focus the search field.
  useEffect(() => {
    if (open) {
      setQuery("")
      setHighlight(0)
      // Focus after the panel has mounted.
      const t = setTimeout(() => searchRef.current?.focus(), 0)
      return () => clearTimeout(t)
    }
  }, [open])

  // Keep the highlighted option in view.
  useEffect(() => {
    if (!open) return
    const node = listRef.current?.children[highlight] as HTMLElement | undefined
    node?.scrollIntoView({ block: "nearest" })
  }, [highlight, open])

  const commit = (c: CampusOption) => {
    onChange(String(c.id))
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setHighlight((h) => Math.min(h + 1, filtered.length - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlight((h) => Math.max(h - 1, 0))
        break
      case "Enter":
        e.preventDefault()
        if (filtered[highlight]) commit(filtered[highlight])
        break
      case "Escape":
        e.preventDefault()
        setOpen(false)
        break
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className={cn(
          inputBase,
          "h-10 justify-between px-3 py-2",
          error && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/20",
          className
        )}
      >
        <span className={cn("truncate", !selected && "text-neutral-400 dark:text-neutral-500")}>
          {selected ? campusLabel(selected) : placeholder}
        </span>
        <ChevronDown className="ml-2 size-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-1.5 shadow-lg">
          <div className="relative mb-1.5">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setHighlight(0)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search by name…"
              autoComplete="off"
              className={cn(inputBase, "h-9 pl-8 pr-3 py-2 placeholder:text-neutral-400 dark:placeholder:text-neutral-500")}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="px-2.5 py-3 text-center text-sm text-neutral-500 dark:text-neutral-400">
              <p>{campusPickerEmptyHint(query)}</p>
              <Link
                href={requestSchoolHref(query)}
                className="mt-2 inline-block font-medium text-[#05EB54] hover:underline"
              >
                Request this school
              </Link>
            </div>
          ) : (
            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              className="max-h-56 overflow-y-auto"
            >
              {filtered.map((c, i) => {
                const isSelected = String(c.id) === value
                return (
                  <li
                    key={c.id}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      commit(c)
                    }}
                    onMouseEnter={() => setHighlight(i)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-neutral-900 dark:text-neutral-100",
                      i === highlight && "bg-neutral-100 dark:bg-neutral-800"
                    )}
                  >
                    <Check
                      className={cn(
                        "size-4 shrink-0 text-[#05EB54]",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">
                      {c.full_name?.trim() ? (
                        <>
                          {c.full_name.trim()}{" "}
                          <span className="text-neutral-500 dark:text-neutral-400">({c.name})</span>
                        </>
                      ) : (
                        c.name
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
