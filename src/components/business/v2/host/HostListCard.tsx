"use client"

import Link from "next/link"
import { CalendarDays, ChevronRight, MoreHorizontal, Repeat } from "lucide-react"
import { cn } from "@/lib/v2/utils"
import { fmtRowWhen } from "@/lib/business/events-list"
import { Badge, type BadgeProps } from "@/components/business/v2/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/business/v2/ui/dropdown-menu"
import { WeeklyCoverChip } from "@/components/business/v2/WeeklyCoverChip"
import { ACCESS_ACCENT, EVENT_ACCENT, EVENT_TYPE_LABEL, WEEKLY_ACCESS_TYPE_LABEL } from "@/lib/business/door-access"

/**
 * The F9 list anatomy as a TABLE ROW (BETA visual polish, on the slice-1
 * shell). Desktop reads Event · Date & time · Status · Tickets sold ·
 * Revenue · ⋯ in fixed columns, so every row kind (event, series, Weekly Cover
 * night, program) lines up under one header (HostListHeader). Below md the
 * row folds to title / when + sold + ⋯, the mobile mock.
 *
 * One row shape, two kinds (D-F9.2): a green EVENT row and a pink WEEKLY
 * COVER row. Pink lives only on the lead tile and the type chip. Every
 * caller (EventCard, AccessNightCard, SeriesGroupRow, AccessProgramRow,
 * AccessEventGroupRow) passes the same data, so the kinds cannot drift.
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

/** Sentence-case a shouting type label ("WEEKLY COVER" → "Weekly Cover"). */
function tagCase(label: string) {
  return label.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

/** The column template, shared by the header and every row (md and up). */
const ROW_GRID =
  "md:grid md:grid-cols-[minmax(0,1fr)_9.5rem_5.5rem_6rem_6rem_2.25rem] md:items-center md:gap-x-4 lg:grid-cols-[minmax(0,1fr)_11rem_6rem_6.5rem_6.5rem_2.25rem]"

/**
 * The container rows live in. One border, hairlines between rows, and (for
 * a table) the column header on top. Lists that group by date put their day
 * labels inside the same container with HostListSubhead.
 */
export function HostListGroup({
  children,
  className,
  header = false,
  footer,
}: {
  children: React.ReactNode
  className?: string
  /** Render the Event · Date & time · Status · Tickets sold · Revenue header. */
  header?: boolean
  /** A muted count / pager line under the last row. */
  footer?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "divide-y divide-neutral-200 overflow-hidden rounded-[10px] border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900",
        className,
      )}
    >
      {header && <HostListHeader />}
      {children}
      {footer && (
        <div className="flex min-h-11 items-center gap-3 px-4 py-2 text-[13px] text-neutral-500 dark:text-neutral-400">{footer}</div>
      )}
    </div>
  )
}

export function HostListHeader() {
  return (
    <div
      role="row"
      className={cn(
        "hidden h-11 px-4 text-[12px] font-medium text-neutral-500 md:grid dark:text-neutral-400",
        ROW_GRID,
      )}
    >
      <span role="columnheader">Event</span>
      <span role="columnheader">Date &amp; time</span>
      <span role="columnheader">Status</span>
      <span role="columnheader" className="text-right">Tickets sold</span>
      <span role="columnheader" className="text-right">Revenue</span>
      <span aria-hidden />
    </div>
  )
}

/** A quiet day label inside a grouped table ("Tonight", "Fri, Oct 30"). */
export function HostListSubhead({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-neutral-50 px-4 py-1.5 text-[12px] font-medium text-neutral-500 dark:bg-neutral-950/40 dark:text-neutral-400">
      {children}
    </div>
  )
}

function StatCell({ stat, className }: { stat?: HostCardStat; className?: string }) {
  if (!stat) {
    return <span className={cn("text-right text-sm text-neutral-400 dark:text-neutral-600", className)}>-</span>
  }
  return (
    <span
      title={stat.pending ? stat.hint : stat.label}
      className={cn(
        "text-right text-sm font-medium tabular-nums",
        stat.pending
          ? "text-neutral-400 decoration-dashed decoration-from-font underline underline-offset-4 dark:text-neutral-600"
          : "text-neutral-900 dark:text-neutral-100",
        className,
      )}
    >
      {stat.value}
    </span>
  )
}

export function HostListCard({
  kind,
  href,
  title,
  meta,
  secondary,
  chips = [],
  status,
  when,
  sold,
  revenue,
  typeLabel,
  actions,
  date,
  menu,
  icon,
}: {
  kind: HostCardKind
  href: string
  title: string
  /** The single muted line under the title. Truncates — never wraps. */
  meta?: string
  /** Desktop-only tail of the meta line. */
  secondary?: string
  /** Extra chips beside the title (cancellation, Custom, Suspended…). */
  chips?: HostCardChip[]
  /** The Status column's chip. */
  status?: HostCardChip | null
  /** The Date & time cell. Defaults to `date` formatted by fmtRowWhen. */
  when?: string
  sold?: HostCardStat
  revenue?: HostCardStat
  /** Overrides the type tag. Series rows pass "SERIES"; events show none. */
  typeLabel?: string
  /** Inline controls at the end of the Event cell (a disclosure toggle). */
  actions?: React.ReactNode
  /** `YYYY-MM-DD…` — feeds the Date & time cell when `when` is not given. */
  date?: string | null
  /** DropdownMenuItems for the ⋯ menu. No menu renders without them. */
  menu?: React.ReactNode
  /** The lead tile's glyph. Defaults by kind: calendar (event), repeat (WC). */
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>
  /** Accepted for older callers; the row now leads with a type tile. */
  thumbnail?: React.ReactNode
}) {
  const accent = ACCENTS[kind]
  const tag = typeLabel ?? (kind === "access" ? accent.label : null)
  const whenText = when ?? (date ? fmtRowWhen(date) : "")
  const Glyph = icon ?? (kind === "access" ? Repeat : CalendarDays)

  return (
    <div className={cn("group relative flex min-h-[52px] items-center gap-3 px-4 py-2 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40", ROW_GRID)}>
      {/* Event cell: type tile · title + chips · muted meta line */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            kind === "access"
              ? "bg-[#FF3ED1]/12 text-[#C20C97] dark:bg-[#FF3ED1]/15 dark:text-[#FF3ED1]"
              : "bg-[#05EB54]/10 text-[#0A8038] dark:bg-[#05EB54]/10 dark:text-[#05EB54]",
          )}
        >
          <Glyph strokeWidth={1.75} className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            {/* The title link stretches over the whole row (after::), so the
                row is one tap target; the ⋯ menu sits above it. */}
            <Link
              href={href}
              className="min-w-0 truncate text-sm font-semibold text-neutral-900 outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline dark:text-neutral-100"
            >
              {title}
            </Link>
            {tag && (kind === "access" ? (
              <WeeklyCoverChip label={tagCase(tag)} className="hidden sm:inline-flex" />
            ) : (
              <Badge variant="neutral" size="sm" className="hidden sm:inline-flex">{tagCase(tag)}</Badge>
            ))}
            {chips.map((chip) => (
              <Badge key={chip.label} variant={chip.variant} size="sm" className="hidden sm:inline-flex">
                {chip.label}
              </Badge>
            ))}
          </div>
          {/* Below md the Date & time column folds into this line. */}
          <p className="mt-0.5 truncate text-[12px] text-neutral-500 dark:text-neutral-400">
            <span className="md:hidden">{[whenText, meta].filter(Boolean).join(" · ")}</span>
            <span className="hidden md:inline">{meta}</span>
            {secondary ? <span className="hidden lg:inline">{meta ? " · " : ""}{secondary}</span> : null}
          </p>
        </div>
        {actions && <div className="relative z-[1] hidden shrink-0 items-center gap-1 lg:flex">{actions}</div>}
      </div>

      {/* Date & time / Status / Tickets sold / Revenue: md and up */}
      <span className="hidden truncate text-[13px] text-neutral-600 md:block dark:text-neutral-300">{whenText || "-"}</span>
      <span className="hidden md:block">
        {status ? (
          <Badge variant={status.variant} size="sm">{status.label}</Badge>
        ) : (
          <span className="text-sm text-neutral-400 dark:text-neutral-600">-</span>
        )}
      </span>
      <StatCell stat={sold} className="hidden md:block" />
      <StatCell stat={revenue} className="hidden md:block" />

      {/* Phone: the sold figure rides at the right edge (mobile mock). */}
      {sold && !sold.pending && (
        <span className="shrink-0 text-[13px] font-medium tabular-nums text-neutral-700 md:hidden dark:text-neutral-200">{sold.value}</span>
      )}

      {menu ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Actions for ${title}`}
            className="relative z-[1] flex size-9 shrink-0 items-center justify-center justify-self-end rounded-lg text-neutral-400 outline-none transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:ring-2 focus-visible:ring-[#05EB54]/40 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">{menu}</DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <ChevronRight aria-hidden className="size-4 shrink-0 justify-self-end text-neutral-400 dark:text-neutral-600" />
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
