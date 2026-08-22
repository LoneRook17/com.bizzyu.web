"use client"

import Link from "next/link"
import { ChevronRight, Check, DoorOpen, PartyPopper, Lock } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import {
  ACCESS_ACCENT,
  EVENT_ACCENT,
  EVENT_TYPE_LABEL,
  WEEKLY_ACCESS_CREATION_LABEL,
  WEEKLY_ACCESS_TYPE_LABEL,
} from "@/lib/business/door-access"
import RequireVenue from "@/components/business/v2/RequireVenue"
import { EmptyState } from "@/components/business/v2/ui/empty-state"

/**
 * D2-1 — the ONE create funnel. "What are you setting up?"
 *
 * Two products now live behind one create button, so the fork is explicit
 * rather than hidden in a form toggle: a named event and a Weekly Cover
 * program diverge on every subsequent screen (dates vs nights, ticket tiers vs
 * access tiers, event page vs series page). This mirrors the app's
 * CreateChoicePage one-for-one, down to the copy — a host who learns the fork
 * on their phone finds the same fork here.
 *
 * WHY THE DASHBOARD NEVER SKIPS THE CHOICE. The app skips straight to Details
 * for a personal host, because the Weekly Cover card is businesses-only (D7).
 * The dashboard is businesses only (DD1), so both cards are always live and
 * there is no single-option shortcut to build.
 *
 * Recurrence is deliberately NOT a third card (D2-2): a recurring event is an
 * ordinary event with a recurrence section inside the event path.
 */
export default function CreateFunnelPage() {
  const { user } = useAuth()
  const canCreate = user?.business_role === "owner" || user?.business_role === "manager"

  if (!canCreate) {
    return (
      <EmptyState
        icon={Lock}
        title="You can't create here"
        description="Only owners and managers can set up events and access programs. Ask a manager on your team to add one."
      />
    )
  }

  return (
    <RequireVenue>
      <div className="flex max-w-3xl flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          What are you setting up?
        </h1>

        <ChoiceCard
          href="/business/events/new"
          kindLabel={EVENT_TYPE_LABEL}
          accent={EVENT_ACCENT}
          icon={PartyPopper}
          title="An event"
          blurb="One night with a name: a show, a party, a mixer. Sell tickets or let people in free."
          bullets={[
            "Pick a date and time",
            "As many ticket tiers as you want",
            "Optional weekly repeat",
            "Scan with the in-app Bizzy scanner",
          ]}
        />

        <ChoiceCard
          href="/business/door-access/new"
          kindLabel={WEEKLY_ACCESS_TYPE_LABEL}
          accent={ACCESS_ACCENT}
          icon={DoorOpen}
          title={WEEKLY_ACCESS_CREATION_LABEL}
          tag="Low Maintenance Option"
          blurb="Your regular nights, sold ahead. Set your prices once and they run every week."
          bullets={[
            "Pick the nights it runs",
            "Cover, line skip, VIP. Price them all.",
            "No staff setup. Scan with any phone camera.",
          ]}
        />
      </div>
    </RequireVenue>
  )
}

function ChoiceCard({
  href,
  kindLabel,
  accent,
  icon: Icon,
  title,
  tag,
  blurb,
  bullets,
}: {
  href: string
  kindLabel: string
  accent: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  title: string
  tag?: string
  blurb: string
  bullets: string[]
}) {
  return (
    <Link
      href={href}
      // Accents are runtime hex (F9's green/magenta pair), so the tinted
      // border and chip come through style. Tailwind cannot build a class
      // from a variable.
      style={{ borderColor: `${accent}59` }}
      className="group flex flex-col rounded-2xl border bg-white p-6 transition-shadow hover:shadow-md dark:bg-neutral-900"
    >
      <div className="flex items-center gap-3">
        <span
          className="flex size-12 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accent}1f` }}
        >
          <Icon className="size-6" style={{ color: accent }} />
        </span>
        <span
          className="flex-1 text-[13px] font-extrabold uppercase tracking-wider"
          style={{ color: accent }}
        >
          {kindLabel}
        </span>
        <ChevronRight className="size-5 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5 dark:text-neutral-500" />
      </div>

      <div className="mt-5 flex items-center gap-2">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
        {tag && (
          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            {tag}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[14px] leading-relaxed text-neutral-600 dark:text-neutral-400">{blurb}</p>

      <ul className="mt-5 flex flex-col gap-2">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0" style={{ color: accent }} />
            <span className="text-[13px] leading-snug text-neutral-700 dark:text-neutral-300">{bullet}</span>
          </li>
        ))}
      </ul>
    </Link>
  )
}
