"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/v2/utils"
import { Badge, type BadgeProps } from "@/components/business/v2/ui/badge"
import { Card } from "@/components/business/v2/ui/card"
import { ACCESS_ACCENT, EVENT_ACCENT, EVENT_TYPE_LABEL, WEEKLY_ACCESS_TYPE_LABEL } from "@/lib/business/door-access"

/**
 * The F9 list-card anatomy, desktop-sized.
 *
 * One row shape, two kinds (D-F9.2): a green EVENT row and a magenta WEEKLY
 * ACCESS row. The app stacks this into a phone-width card; the dashboard has
 * horizontal room, so the metadata that the app hides behind a tap sits inline
 * on the right — same anatomy, more of it visible, which is the whole point of
 * "desktop-sized" rather than a port of the phone layout.
 *
 * Anatomy, top to bottom:
 *   Row 1 — type label + status chips
 *   Row 2 — thumbnail · title + metadata line (+ a second line, desktop only)
 *           · stats · chevron
 *
 * The accent lives on the type chip and the leading spine, never on the title:
 * a magenta heading on a green-accented dashboard reads as an error state.
 */

export type HostCardKind = "event" | "access"

/** Derived from Badge so a new variant there can't desync this row's chips. */
export interface HostCardChip {
  label: string
  variant: NonNullable<BadgeProps["variant"]>
}

export interface HostCardStat {
  label: string
  value: string
  /**
   * D2-C. The number is real but this payload can't see it yet. Renders muted
   * with a dashed rule so it reads as "not loaded here", never as a zero — on a
   * sold or revenue column those two say opposite things.
   */
  pending?: boolean
  /** Hover text on a pending cell: what would have to change to fill it in. */
  hint?: string
}

const ACCENTS: Record<HostCardKind, { ink: string; label: string }> = {
  event: { ink: EVENT_ACCENT, label: EVENT_TYPE_LABEL },
  access: { ink: ACCESS_ACCENT, label: WEEKLY_ACCESS_TYPE_LABEL },
}

export function HostListCard({
  kind,
  href,
  title,
  meta,
  secondary,
  chips = [],
  stats = [],
  thumbnail,
  typeLabel,
  actions,
}: {
  kind: HostCardKind
  href: string
  title: string
  /** The single muted line under the title. Truncates — never wraps. */
  meta: string
  /** Desktop-only second line. The app has no room for this; we do. */
  secondary?: string
  chips?: HostCardChip[]
  stats?: HostCardStat[]
  thumbnail?: React.ReactNode
  /** Overrides the host label. Student surfaces would pass their own (D-P5). */
  typeLabel?: string
  /**
   * Optional footer of direct links. Desktop-only affordance — the app reaches
   * these by opening the row first, but a dashboard has room to skip the hop.
   */
  actions?: React.ReactNode
}) {
  const accent = ACCENTS[kind]

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      <div className="flex">
        {/* The 3px accent spine — the fastest read of "which kind is this row". */}
        <div aria-hidden className="w-[3px] shrink-0" style={{ backgroundColor: accent.ink }} />

        <div className="min-w-0 flex-1 p-4">
          {/* Row 1 — type label + status */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-[0.06em]"
              style={{ backgroundColor: `${accent.ink}1A`, color: accent.ink }}
            >
              {typeLabel ?? accent.label}
            </span>
            {chips.map((chip) => (
              <Badge key={chip.label} variant={chip.variant} size="sm">
                {chip.label}
              </Badge>
            ))}
          </div>

          {/* Row 2 — thumbnail · title/meta · stats · chevron */}
          <div className="mt-3 flex items-center gap-4">
            {thumbnail && <div className="shrink-0">{thumbnail}</div>}

            <div className="min-w-0 flex-1">
              <Link
                href={href}
                className="block truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100"
              >
                <span className="transition-colors group-hover:underline">{title}</span>
              </Link>
              <p className="mt-0.5 truncate text-[13px] text-neutral-600 dark:text-neutral-400">
                {meta}
              </p>
              {secondary && (
                <p className="mt-0.5 truncate text-[13px] text-neutral-500 dark:text-neutral-500">
                  {secondary}
                </p>
              )}
            </div>

            {/* Stats collapse below the md breakpoint rather than squeezing the
                title — on a narrow window the row degrades to the app's shape. */}
            {stats.length > 0 && (
              <div className="hidden shrink-0 items-center gap-6 md:flex">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="text-right"
                    title={stat.pending ? stat.hint : undefined}
                  >
                    <p
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        stat.pending
                          ? "text-neutral-400 decoration-dashed decoration-from-font underline underline-offset-4 dark:text-neutral-600"
                          : "text-neutral-900 dark:text-neutral-100",
                      )}
                    >
                      {stat.value}
                    </p>
                    <p
                      className={cn(
                        "text-[11px]",
                        stat.pending
                          ? "text-neutral-400 dark:text-neutral-600"
                          : "text-neutral-500 dark:text-neutral-400",
                      )}
                    >
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <Link
              href={href}
              aria-label={`Open ${title}`}
              className="shrink-0 rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
            >
              <ChevronRight className="size-5" />
            </Link>
          </div>

          {actions && (
            <div className="-mx-4 -mb-4 mt-3 flex items-center gap-1 border-t border-neutral-100 px-4 py-2.5 dark:border-neutral-800">
              {actions}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

/**
 * The square media slot. Falls back to a tinted icon tile in the kind's accent
 * so a flyerless program still reads as an access row at a glance.
 */
export function HostCardThumbnail({
  kind,
  src,
  alt,
  icon: Icon,
}: {
  kind: HostCardKind
  src?: string | null
  alt: string
  icon: React.ComponentType<{ className?: string }>
}) {
  const accent = ACCENTS[kind]

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className="size-16 rounded-lg object-cover"
      />
    )
  }

  return (
    <div
      className={cn("flex size-16 items-center justify-center rounded-lg")}
      style={{ backgroundColor: `${accent.ink}14`, color: accent.ink }}
    >
      <Icon className="size-6" />
    </div>
  )
}
