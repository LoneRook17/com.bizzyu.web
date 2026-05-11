"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/business/api-client"
import type { TagWithCount } from "./types"

export interface AttendeeFilters {
  tag_id: number | null
  last_purchase_within_days: number | null
  has_phone: boolean
  has_push: boolean
}

export const EMPTY_FILTERS: AttendeeFilters = {
  tag_id: null,
  last_purchase_within_days: null,
  has_phone: false,
  has_push: false,
}

interface Props {
  open: boolean
  onClose: () => void
  filters: AttendeeFilters
  onApply: (next: AttendeeFilters) => void
}

const RECENCY_OPTIONS = [
  { label: "Any time", value: null },
  { label: "Last 30 days", value: 30 },
  { label: "Last 60 days", value: 60 },
  { label: "Last 90 days", value: 90 },
  { label: "Last year", value: 365 },
]

export default function AttendeeFilterSheet({ open, onClose, filters, onApply }: Props) {
  const [draft, setDraft] = useState<AttendeeFilters>(filters)
  const [tags, setTags] = useState<TagWithCount[]>([])

  useEffect(() => {
    if (!open) return
    setDraft(filters)
    apiClient
      .get<{ tags: TagWithCount[] }>("/business/marketing/tags")
      .then((r) => setTags(r.tags))
      .catch(() => setTags([]))
  }, [open, filters])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-lg bg-white shadow-xl sm:rounded-lg">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-base font-semibold text-ink">Filter attendees</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-ink">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Tag</label>
            <select
              value={draft.tag_id ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, tag_id: e.target.value ? Number(e.target.value) : null })
              }
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">Any tag</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Last purchase</label>
            <select
              value={draft.last_purchase_within_days ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  last_purchase_within_days: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              {RECENCY_OPTIONS.map((o) => (
                <option key={o.label} value={o.value ?? ""}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.has_phone}
                onChange={(e) => setDraft({ ...draft, has_phone: e.target.checked })}
              />
              Has phone number on file
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.has_push}
                onChange={(e) => setDraft({ ...draft, has_push: e.target.checked })}
              />
              Push subscribed
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
          <button
            type="button"
            onClick={() => {
              setDraft(EMPTY_FILTERS)
              onApply(EMPTY_FILTERS)
              onClose()
            }}
            className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft)
              onClose()
            }}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
