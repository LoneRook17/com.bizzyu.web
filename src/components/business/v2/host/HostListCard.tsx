"use client"

import Link from "next/link"
import { ChevronRight, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/v2/utils"
import { Badge, type BadgeProps } from "@/components/business/v2/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/business/v2/ui/dropdown-menu"
import { ACCESS_ACCENT, EVENT_ACCENT, EVENT_TYPE_LABEL, WEEKLY_ACCESS_TYPE_LABEL } from "@/lib/business/door-access"

/**
 * The F9 list anatomy, re-cut as a dense ROW (BETA biz-dash shell, slice 1).
 *
 * One row shape, two kinds (D-F9.2): a green EVENT row and a magenta WEEKLY
 * COVER row. What changed in the shell: the card chrome (border, 3px spine,
 * 64px thumbnail, action footer) became a 48-52px table row — date block ·
 * title + meta · status chips · stats · ⋯ menu. Rows sit inside a
 * HostListGroup (one border, dividers), so a list reads as one table rather
 * than a stack of cards.
 *
 * What did NOT change: every caller (EventCard, AccessNightCard, SeriesGroupRow,
 * AccessProgramRow, AccessEventGroupRow) still passes the same data, so the
 * two kinds cannot drift. The accent lives on the date block and the type
 * chip, never on the title.
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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** Calendar parts of a `YYYY-MM-DD…` string, read as a CALENDAR date (never UTC). */
function dateParts(value: string): { month: string; day: number; weekday: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (!mo || !d) return null
  const local = new Date(y, mo - 1, d)
  return { month: MONTHS[mo - 1] ?? "", day: d, weekday: WEEKDAYS[local.getDay()] ?? "" }
}

/** Sentence-case a shouting type label ("WEEKLY COVER" → "Weekly Cover"). */
function tagCase(label: string) {
  return label.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

/** The row's leading date block. Month over day, weekday under; tinted by kind. */
export function DateBlock({ date, kind }: { date: string; kind: HostCardKind }) {
  const parts = dateParts(date)
  const ink = ACCENTS[kind].ink
  if (!parts) {
    return <div aria-hidden className="w-11 shrink-0" />
  }
  return (
    <div className="flex w-11 shrink-0 flex-col items-center leading-none" aria-label={`${parts.weekday} ${parts.month} ${parts.day}`}>
      <span className="text-[11px] font-medium" style={{ color: kind === "access" ? ink : undefined }}>
        <span className={kind === "event" ? "text-neutral-500 dark:text-neutral-400" : undefined}>{parts.month}</span>
      </span>
      <span className="mt-0.5 text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{parts.day}</span>
      <span className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">{parts.weekday}</span>
    </div>
  )
}

/**
 * The container rows live in. One border, dividers between rows. Lists that
 * group by date render one of these per group.
 */
export function HostListGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "divide-y divide-neutral-100 overflow-hidden rounded-[10px] border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900",
        className,
      )}
    >
      {children}
    </div>
  )
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
  date,
  menu,
}: {
  kind: HostCardKind
  href: string
  title: string
  /** The single muted line under the title. Truncates — never wraps. */
  meta: string
  /** Desktop-only second line, folded into the meta line on the row. */
  secondary?: string
  chips?: HostCardChip[]
  stats?: HostCardStat[]
  /** Shown in the leading slot when the row has no date (programs, series). */
  thumbnail?: React.ReactNode
  /** Overrides the type tag. Series rows pass "SERIES"; events show none. */
  typeLabel?: string
  /** Inline controls at the right edge (a disclosure toggle). */
  actions?: React.ReactNode
  /** `YYYY-MM-DD…` — renders the date block in the leading slot. */
  date?: string | null
  /** DropdownMenuItems for the ⋯ menu. No menu renders without them. */
  menu?: React.ReactNode
}) {
  const accent = ACCENTS[kind]
  const tag = typeLabel ?? (kind === "access" ? accent.label : null)

  return (
    <div className="group flex items-center gap-3 px-3 py-2 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
      {/* Leading slot: date block for dated rows, a 40px tile otherwise. */}
      {date ? (
        <DateBlock date={date} kind={kind} />
      ) : thumbnail ? (
        <div className="shrink-0 [&_img]:size-10 [&_img]:rounded-lg [&>div]:size-10 [&>div]:rounded-lg [&_svg]:size-4">{thumbnail}</div>
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={href} className="min-w-0 truncate text-sm font-semibold text-neutral-900 hover:underline dark:text-neutral-100">
            {title}
          </Link>
          {tag && (
            <span
              className="inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
              style={{ backgroundColor: `${accent.ink}1A`, color: kind === "access" ? accent.ink : "#0A8038" }}
            >
              {tagCase(tag)}
            </span>
          )}
          {chips.map((chip) => (
            <Badge key={chip.label} variant={chip.variant} size="sm">
              {chip.label}
            </Badge>
          ))}
        </div>
        <p className="mt-0.5 truncate text-[13px] text-neutral-500 dark:text-neutral-400">
          {meta}
          {secondary ? <span className="hidden sm:inline"> · {secondary}</span> : null}
        </p>
      </div>

      {/* Stats collapse below md rather than squeezing the title. */}
      {stats.length > 0 && (
        <div className="hidden shrink-0 items-center gap-5 md:flex">
          {stats.map((stat) => (
            <div key={stat.label} className="min-w-14 text-right" title={stat.pending ? stat.hint : undefined}>
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
              <p className={cn("text-[11px]", stat.pending ? "text-neutral-400 dark:text-neutral-600" : "text-neutral-500 dark:text-neutral-400")}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {actions && <div className="hidden shrink-0 items-center gap-1 sm:flex">{actions}</div>}

      {menu ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Actions for ${title}`}
            className="shrink-0 rounded-lg p-1.5 text-neutral-400 outline-none transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:ring-2 focus-visible:ring-[#05EB54]/40 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">{menu}</DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Link
          href={href}
          aria-label={`Open ${title}`}
          className="shrink-0 rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
        >
          <ChevronRight className="size-4" />
        </Link>
      )}
    </div>
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
