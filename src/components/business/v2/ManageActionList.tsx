"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/v2/utils"

export type ActionAccent = "event" | "access"

export interface ActionRowProps {
  href: string
  icon?: React.ElementType
  title: string
  subtitle?: string
  /** Right-side hint (a count, a status word). */
  trailing?: React.ReactNode
  accent?: ActionAccent
  /** Opens in a new tab (guest-facing links). */
  external?: boolean
}

/**
 * BETA shell: the "tight action list" that replaced the equal-tile mall on
 * Manage. One bordered container, 44-52px rows, row + chevron. Rows are plain
 * links to pages that already exist.
 *
 * Hover follows the surface accent: Bizzy green on an event, Weekly Cover pink
 * on a WC night (`hover:border-access/40` is the pin the WC tests look for).
 */
export function ActionList({
  children,
  className,
  label,
  description,
}: {
  children: React.ReactNode
  className?: string
  /** Sentence-case section label above the list (weight only, no eyebrow). */
  label?: string
  description?: string
}) {
  return (
    <section className={cn("flex flex-col gap-2", className)}>
      {(label || description) && (
        <div>
          {label && <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{label}</h2>}
          {description && <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">{description}</p>}
        </div>
      )}
      <div className="divide-y divide-neutral-100 overflow-hidden rounded-[10px] border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
        {children}
      </div>
    </section>
  )
}

export function ActionRow({ href, icon: Icon, title, subtitle, trailing, accent = "event", external }: ActionRowProps) {
  const hover =
    accent === "access"
      ? "hover:bg-access/5 hover:border-access/40 dark:hover:bg-access/10"
      : "hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
  const iconTone =
    accent === "access"
      ? "text-access"
      : "text-neutral-500 dark:text-neutral-400"
  const inner = (
    <>
      {Icon && <Icon className={cn("size-4 shrink-0", iconTone)} />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{title}</span>
        {subtitle && <span className="block truncate text-[13px] text-neutral-500 dark:text-neutral-400">{subtitle}</span>}
      </span>
      {trailing && <span className="shrink-0 text-[13px] text-neutral-500 dark:text-neutral-400">{trailing}</span>}
      <ChevronRight className="size-4 shrink-0 text-neutral-300 dark:text-neutral-600" />
    </>
  )
  const className = cn(
    "flex min-h-12 items-center gap-3 px-3 py-2 transition-colors border-l-0",
    hover,
  )
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    )
  }
  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  )
}
