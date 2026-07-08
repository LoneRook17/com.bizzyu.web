"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

/**
 * Shared header for event "manage" subpages: a back link to the manage hub,
 * the page title, optional subtitle, and an optional right-aligned action slot.
 */
export function ManageSubheader({
  eventId,
  title,
  subtitle,
  backHref,
  backLabel = "Back to manage",
  actions,
}: {
  eventId: string | number
  title: string
  subtitle?: React.ReactNode
  backHref?: string
  backLabel?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <Link
        href={backHref ?? `/business/events/${eventId}/manage`}
        className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-neutral-500 dark:text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        <ArrowLeft className="size-3.5" /> {backLabel}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{title}</h1>
          {subtitle && <p className="mt-1 text-[15px] text-neutral-600 dark:text-neutral-400">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
