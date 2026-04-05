"use client"

import { useState, useRef, useEffect } from "react"
import { apiClient } from "@/lib/business/api-client"

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
  className?: string
  autoFocus?: boolean
}

export default function UserSearchInput({
  value,
  onChange,
  onSelect,
  placeholder = "Search by name or email...",
  className = "",
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
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary ${className}`}
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <svg className="h-4 w-4 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {showDropdown && results.length > 0 && (
        <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map((user) => (
            <li
              key={user.id}
              className="px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
              onMouseDown={() => handleSelect(user)}
            >
              <p className="text-sm font-medium text-ink truncate">{user.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
