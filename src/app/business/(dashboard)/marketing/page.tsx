"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/business/auth-context"
import { apiClient, ApiError } from "@/lib/business/api-client"
import TagChip from "@/components/business/dashboard/marketing/TagChip"
import TagManagerModal from "@/components/business/dashboard/marketing/TagManagerModal"
import AttendeeDetailDrawer from "@/components/business/dashboard/marketing/AttendeeDetailDrawer"
import AttendeeFilterSheet, {
  EMPTY_FILTERS,
  type AttendeeFilters,
} from "@/components/business/dashboard/marketing/AttendeeFilterSheet"
import BlastComposerModal from "@/components/business/dashboard/marketing/BlastComposerModal"
import type {
  AttendeesResponse,
  AttendeeRow,
  AudiencePreviewResponse,
  BlastAudienceBody,
  BlastChannel,
} from "@/components/business/dashboard/marketing/types"

const DISCLAIMER =
  "Marketing SMS blasts to all attendees are limited to 1 per 24h. To send unlimited event-specific updates, head to your event dashboard and use the SMS Blast tab there."

function formatShortDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export default function AttendeesPage() {
  const { user } = useAuth()
  const role = user?.business_role
  const isOwner = role === "owner"
  const canManageTags = role === "owner" || role === "manager"

  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounced(search, 300)

  const [filters, setFilters] = useState<AttendeeFilters>(EMPTY_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const [drawerUserId, setDrawerUserId] = useState<number | null>(null)

  const [page, setPage] = useState(1)
  const [data, setData] = useState<AttendeesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selected, setSelected] = useState<Set<number>>(new Set())

  const fetchAttendees = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim())
    if (filters.tag_id != null) params.set("tag_id", String(filters.tag_id))
    if (filters.last_purchase_within_days != null)
      params.set("last_purchase_within_days", String(filters.last_purchase_within_days))
    if (filters.has_phone) params.set("has_phone", "true")
    if (filters.has_push) params.set("has_push", "true")
    params.set("page", String(page))
    params.set("limit", "50")
    try {
      const res = await apiClient.get<AttendeesResponse>(
        `/business/marketing/attendees?${params.toString()}`
      )
      setData(res)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load attendees")
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, filters, page])

  useEffect(() => {
    fetchAttendees()
  }, [fetchAttendees])

  // Reset to page 1 when search or filters change.
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, filters])

  const allOnPageSelected = useMemo(() => {
    if (!data || data.attendees.length === 0) return false
    return data.attendees.every((a) => selected.has(a.id))
  }, [data, selected])

  const togglePageSelection = () => {
    if (!data) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (allOnPageSelected) {
        for (const a of data.attendees) next.delete(a.id)
      } else {
        for (const a of data.attendees) next.add(a.id)
      }
      return next
    })
  }

  const toggleRow = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearSelection = () => setSelected(new Set())

  const selectedIds = useMemo(() => Array.from(selected), [selected])

  const filterCount =
    (filters.tag_id != null ? 1 : 0) +
    (filters.last_purchase_within_days != null ? 1 : 0) +
    (filters.has_phone ? 1 : 0) +
    (filters.has_push ? 1 : 0)

  // ─── Composer wiring (Session 5.1) ─────────────────────────────────────
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerChannel, setComposerChannel] = useState<BlastChannel>("sms")
  const [composerAudience, setComposerAudience] = useState<BlastAudienceBody>({})
  const [composerLabel, setComposerLabel] = useState<string>("")

  /**
   * Build the audience payload for filter-driven sends. Mirrors PRD §6.5.5:
   * exactly one of `user_ids` or `filters` per request.
   */
  const filterAudience = useMemo<BlastAudienceBody | null>(() => {
    if (filterCount === 0) return null
    return {
      filters: {
        ...(filters.tag_id != null ? { tag_id: filters.tag_id } : {}),
        ...(filters.last_purchase_within_days != null
          ? { purchased_within_days: filters.last_purchase_within_days }
          : {}),
        ...(filters.has_phone ? { has_phone: true } : {}),
        ...(filters.has_push ? { has_push: true } : {}),
      },
    }
  }, [filterCount, filters])

  // Live count for the active filter set (debounced via apiClient call).
  const [filterPreview, setFilterPreview] = useState<AudiencePreviewResponse | null>(null)
  useEffect(() => {
    if (!filterAudience) {
      setFilterPreview(null)
      return
    }
    let cancelled = false
    const t = setTimeout(() => {
      apiClient
        .post<AudiencePreviewResponse>("/business/marketing/blasts/audience-preview", {
          audience: filterAudience,
        })
        .then((res) => {
          if (!cancelled) setFilterPreview(res)
        })
        .catch(() => {
          if (!cancelled) setFilterPreview(null)
        })
    }, 500)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [filterAudience])

  const openSelectionComposer = (channel: BlastChannel) => {
    setComposerChannel(channel)
    setComposerAudience({ user_ids: selectedIds })
    setComposerLabel(`${selectedIds.length} selected attendee${selectedIds.length === 1 ? "" : "s"}`)
    setComposerOpen(true)
  }

  const openFilterComposer = (channel: BlastChannel) => {
    if (!filterAudience) return
    setComposerChannel(channel)
    setComposerAudience(filterAudience)
    setComposerLabel(buildFilterLabel(filters))
    setComposerOpen(true)
  }

  const openSingleSmsComposer = (userId: number, displayName: string) => {
    setComposerChannel("sms")
    setComposerAudience({ user_ids: [userId] })
    setComposerLabel(`Direct SMS to ${displayName}`)
    setComposerOpen(true)
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">Attendees</h2>
        <Link
          href="/business/marketing/campaigns"
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          View SMS Campaigns
        </Link>
      </div>

      <p className="mb-3 text-xs text-gray-500">{DISCLAIMER}</p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search (Name, Email, Phone Number)"
            className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Filter{filterCount > 0 ? ` (${filterCount})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setTagManagerOpen(true)}
          className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Tag
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="w-8 px-3 py-2">
                <input type="checkbox" checked={allOnPageSelected} onChange={togglePageSelection} />
              </th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-right">Tickets</th>
              <th className="px-3 py-2 text-right">Total Spend</th>
              <th className="px-3 py-2 text-left">Contact</th>
              <th className="px-3 py-2 text-left">Tags</th>
              <th className="px-3 py-2 text-left">Last Purchase</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (!data || data.attendees.length === 0) && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-gray-500">
                  Loading attendees…
                </td>
              </tr>
            )}
            {!loading && data && data.attendees.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-gray-500">
                  No attendees match these filters.
                </td>
              </tr>
            )}
            {data?.attendees.map((a) => (
              <AttendeeRowView
                key={a.id}
                row={a}
                selected={selected.has(a.id)}
                onToggle={() => toggleRow(a.id)}
                onOpenDrawer={() => setDrawerUserId(a.id)}
                onSendSms={
                  canManageTags && a.contact.sms_reachable
                    ? () => openSingleSmsComposer(a.id, a.full_name)
                    : undefined
                }
                isOwner={isOwner}
              />
            ))}
          </tbody>
        </table>
      </div>

      {data && data.pagination.total_pages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {data.pagination.page} of {data.pagination.total_pages} · {data.pagination.total} attendees
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= data.pagination.total_pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {filterAudience && selected.size === 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="text-sm text-ink">
            {filterPreview
              ? `Sending to ${filterPreview.recipients_count} attendee${filterPreview.recipients_count === 1 ? "" : "s"}`
              : "Calculating audience…"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => openFilterComposer("sms")}
              disabled={!canManageTags || !filterPreview || filterPreview.recipients_count === 0}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Send SMS Blast
            </button>
            <button
              type="button"
              onClick={() => openFilterComposer("announcement")}
              disabled={!canManageTags || !filterPreview || filterPreview.recipients_count === 0}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Send Announcement
            </button>
          </div>
        </div>
      )}

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3 shadow-lg md:left-64">
          <span className="text-sm font-medium text-ink">{selected.size} selected</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openSelectionComposer("sms")}
              disabled={!canManageTags}
              title={canManageTags ? "" : "Owner or manager only"}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Send SMS
            </button>
            <button
              type="button"
              onClick={() => openSelectionComposer("announcement")}
              disabled={!canManageTags}
              title={canManageTags ? "" : "Owner or manager only"}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Send Announcement
            </button>
            <button
              type="button"
              onClick={() => setTagManagerOpen(true)}
              disabled={!canManageTags}
              title={canManageTags ? "" : "Owner or manager only"}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:bg-gray-300"
            >
              Add Tag
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <BlastComposerModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        channel={composerChannel}
        audience={composerAudience}
        audienceLabel={composerLabel}
        onSent={() => {
          // Clear selection after a multi-select send so the user gets visual
          // feedback that the cohort was consumed.
          if (composerAudience.user_ids && composerAudience.user_ids.length > 1) {
            clearSelection()
          }
        }}
      />

      <AttendeeFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onApply={setFilters}
      />

      <TagManagerModal
        open={tagManagerOpen}
        onClose={() => setTagManagerOpen(false)}
        selectedUserIds={selected.size > 0 ? selectedIds : undefined}
        onTagsChanged={() => {
          fetchAttendees()
        }}
        canMutate={canManageTags}
      />

      <AttendeeDetailDrawer userId={drawerUserId} onClose={() => setDrawerUserId(null)} />
    </div>
  )
}

function buildFilterLabel(filters: AttendeeFilters): string {
  const parts: string[] = []
  if (filters.tag_id != null) parts.push(`tag #${filters.tag_id}`)
  if (filters.last_purchase_within_days != null)
    parts.push(`last ${filters.last_purchase_within_days}d`)
  if (filters.has_phone) parts.push("has phone")
  if (filters.has_push) parts.push("has push")
  return parts.length > 0 ? `Filter: ${parts.join(", ")}` : "Filter audience"
}

function AttendeeRowView({
  row,
  selected,
  onToggle,
  onOpenDrawer,
  onSendSms,
  isOwner,
}: {
  row: AttendeeRow
  selected: boolean
  onToggle: () => void
  onOpenDrawer: () => void
  onSendSms?: () => void
  isOwner: boolean
}) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-2">
        <input type="checkbox" checked={selected} onChange={onToggle} />
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          {row.profile_photo_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.profile_photo_path}
              alt=""
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
              {row.full_name?.slice(0, 1).toUpperCase() || "?"}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{row.full_name}</p>
            <p className="truncate text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{row.tickets}</td>
      <td className="px-3 py-2 text-right tabular-nums">${(row.spend_cents / 100).toFixed(2)}</td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2 text-gray-500">
          {row.contact.sms_reachable && onSendSms && (
            <button
              type="button"
              onClick={onSendSms}
              title="Send 1-on-1 SMS"
              aria-label="Send SMS"
              className="hover:text-primary"
            >
              💬
            </button>
          )}
          {row.contact.sms_reachable && !onSendSms && (
            <span title="SMS reachable" aria-label="SMS reachable">
              💬
            </span>
          )}
          {row.has_phone && (
            <span title={`Phone on file: ${row.phone_masked ?? ""}`} aria-label="Phone on file">
              📞
            </span>
          )}
          {row.contact.push_subscribed && (
            <span title="Push subscribed" aria-label="Push subscribed">
              🔔
            </span>
          )}
          {row.contact.marketing_muted && (
            <span title="Marketing-muted globally" className="text-yellow-600">
              ⚠
            </span>
          )}
          {row.has_phone && (
            <span className="ml-1 text-xs text-gray-400">{row.phone_masked}</span>
          )}
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {row.tags.map((t) => (
            <TagChip key={t.id} tag={t} />
          ))}
        </div>
      </td>
      <td className="px-3 py-2 text-xs text-gray-600">{formatShortDate(row.last_purchase_at)}</td>
      <td className="px-3 py-2 text-right">
        {isOwner && (
          <button
            type="button"
            onClick={onOpenDrawer}
            title="View details"
            className="text-gray-400 hover:text-ink"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </button>
        )}
      </td>
    </tr>
  )
}
