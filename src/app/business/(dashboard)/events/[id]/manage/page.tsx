"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/business/auth-context"
import { apiClient, ApiError } from "@/lib/business/api-client"
import ConfirmModal from "@/components/business/dashboard/ConfirmModal"
import { useRouter } from "next/navigation"
import type { EventDetail } from "@/lib/business/types"
import RolePermissionsModal from "@/components/business/dashboard/RolePermissionsModal"

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

interface ManageCardProps {
  href: string
  icon: React.ReactNode
  title: string
  subtitle: string
}

function ManageCard({ href, icon, title, subtitle }: ManageCardProps) {
  return (
    <Link
      href={href}
      className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 hover:border-primary/40 hover:shadow-sm transition-all group"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink group-hover:text-primary transition-colors">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
    </Link>
  )
}

function ComingSoonCard({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="relative flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 opacity-60">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-400">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      <span className="absolute top-3 right-3 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-400">
        Coming Soon
      </span>
    </div>
  )
}

export default function ManageEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showDelete, setShowDelete] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  const canEdit = user?.business_role === "owner" || user?.business_role === "manager"

  useEffect(() => {
    apiClient
      .get<EventDetail>(`/business/events/${id}`)
      .then(setEvent)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load event"))
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      await apiClient.delete(`/business/events/${id}`)
      router.push("/business/events")
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Delete failed")
    } finally {
      setDeleteLoading(false)
      setShowDelete(false)
    }
  }

  const handleCancel = async () => {
    setCancelLoading(true)
    try {
      await apiClient.patch(`/business/events/${id}/cancel`)
      router.push("/business/events")
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Cancel failed")
    } finally {
      setCancelLoading(false)
      setShowCancel(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-500 mb-4">{error || "Event not found"}</p>
        <Link href="/business/events" className="text-sm text-primary hover:underline">
          Back to Events
        </Link>
      </div>
    )
  }

  const base = `/business/events/${id}/manage`

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/business/events/${id}`} className="text-xs text-gray-500 hover:text-primary mb-2 inline-block">
          &larr; Back to Event
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-ink">{event.name}</h1>
          <RolePermissionsModal variant="event" />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {formatDate(event.start_date_time)} &middot; {event.venue_name}
        </p>
      </div>

      {/* Management cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {canEdit && (
          <ManageCard
            href={`/business/events/${id}/edit`}
            title="Edit Event"
            subtitle="Update event details, tickets, and flyer"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
            }
          />
        )}

        <ManageCard
          href={`${base}/tracking-links`}
          title="Tracking Links"
          subtitle="Manage promoter links and track performance"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
          }
        />

        <ManageCard
          href={`${base}/team`}
          title="Team Members"
          subtitle="Manage event co-hosts, crew, and promoters"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          }
        />

        {canEdit && (
          <ManageCard
            href={`${base}/promo-codes`}
            title="Promo Codes"
            subtitle="Create and manage discount codes"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
            }
          />
        )}

        <ManageCard
          href={`${base}/analytics`}
          title="Event Analytics"
          subtitle="Revenue, ticket access, check-in rates"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          }
        />

        <ManageCard
          href={`${base}/checkins`}
          title="Check-In History"
          subtitle="View attendee check-in status and details"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <ManageCard
          href={`${base}/scanner`}
          title="Scanner & QR Codes"
          subtitle="Check-in URLs and QR scanner access"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
            </svg>
          }
        />

        <ComingSoonCard
          title="Event Photos"
          subtitle="Upload and manage event photo gallery"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          }
        />
      </div>

      {/* Danger Zone */}
      {canEdit && (
        <div className="rounded-xl border border-red-200 bg-red-50/30 p-5">
          <h2 className="text-sm font-semibold text-red-700 mb-2">Danger Zone</h2>
          <div className="flex gap-3">
            {event.status !== "cancelled" && (
              <button
                onClick={() => setShowCancel(true)}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                Cancel Event
              </button>
            )}
            <button
              onClick={() => setShowDelete(true)}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors cursor-pointer"
            >
              Delete Event
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={handleCancel}
        title="Cancel Event"
        message="Are you sure you want to cancel this event? Attendees will be notified. This cannot be undone."
        confirmLabel="Cancel Event"
        variant="warning"
        loading={cancelLoading}
      />
      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmLabel="Delete Event"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  )
}
