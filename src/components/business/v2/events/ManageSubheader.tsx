"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

/**
 * Shared header for event "manage" subpages.
 *
 * BETA shell: the manage layout now carries the event title, the back link
 * and the five tabs, so this is a compact section header — the page's own
 * title at h2 weight plus its action slot. A back link renders only when a
 * caller asks for a custom destination (none do today; the tabs are the
 * navigation).
 */
export function ManageSubheader({
  title,
  subtitle,
  backHref,
  backLabel = "Back",
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
    <div className="flex flex-col gap-2">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-neutral-500 dark:text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="size-3.5" /> {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
