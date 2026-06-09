"use client"

import { useState, useRef, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { apiClient } from "@/lib/business/api-client"
import { cn } from "@/lib/v2/utils"
import { Input } from "@/components/business/v2/ui/input"

interface UserResult {
  id: number
  full_name: string
  email: string
}

interface UserSearchInputProps {
  value: string
  onChange: (value: string) => void
  onSelect: (user: UserResult) => void
  placeholder?: string
  autoFocus?: boolean
}

export default function UserSearchInput({
  value,
  onChange,
  onSelect,
  placeholder = "Search by name or email…",
  autoFocus = false,
}: UserSearchInputProps) {
  const [results, setResults] = useState<UserResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleChange = (val: string) => {
    onChange(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (val.trim().length < 2) {
      setResults([])
      setShowDropdown(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await apiClient.get<UserResult[]>(
          `/business/team/search-users?q=${encodeURIComponent(val.trim())}`
        )
        setResults(data)
        setShowDropdown(data.length > 0)
      } catch {
        setResults([])
        setShowDropdown(false)
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  const handleSelect = (user: UserResult) => {
    onSelect(user)
    onChange(user.email)
    setShowDropdown(false)
    setResults([])
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        className={cn(loading && "pr-9")}
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-neutral-400" />
      )}

      {showDropdown && results.length > 0 && (
        <ul className="absolute z-20 mt-1.5 max-h-52 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg">
          {results.map((user) => (
            <li
              key={user.id}
              className="cursor-pointer rounded-lg px-2.5 py-2 transition-colors hover:bg-neutral-100"
              onMouseDown={() => handleSelect(user)}
            >
              <p className="truncate text-sm font-medium text-neutral-900">{user.full_name}</p>
              <p className="truncate text-xs text-neutral-500">{user.email}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
