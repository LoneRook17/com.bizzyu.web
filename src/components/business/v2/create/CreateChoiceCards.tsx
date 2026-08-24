import Link from "next/link"
import { Check, DoorOpen, PartyPopper, type LucideIcon } from "lucide-react"
import {
  ACCESS_ACCENT,
  EVENT_ACCENT,
  EVENT_TYPE_LABEL,
  WEEKLY_ACCESS_CREATION_LABEL,
  WEEKLY_ACCESS_TYPE_LABEL,
} from "@/lib/business/door-access"
import {
  IN_APP_CHOICE_BODY,
  IN_APP_CHOICE_TITLE,
  InAppIconTile,
  inAppChoiceSurfaceStyle,
} from "@/components/business/v2/create/in-app-choice"

/**
 * Flutter CreateChoicePage cards. Dark charcoal + thin green/pink outline.
 * Selected is a colored check — the card never fills with neon.
 */
export function CreateChoiceCards() {
  return (
    <>
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
          "Cover and Skip the Line. Price them per night.",
          "No staff setup. Scan with any phone camera.",
        ]}
      />
    </>
  )
}

export function ChoiceCard({
  href,
  kindLabel,
  accent,
  icon,
  title,
  tag,
  blurb,
  bullets,
}: {
  href: string
  kindLabel: string
  accent: string
  icon: LucideIcon
  title: string
  tag?: string
  blurb: string
  bullets: string[]
}) {
  return (
    <Link
      href={href}
      style={inAppChoiceSurfaceStyle(accent, true)}
      className="flex flex-col rounded-2xl border p-6 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 [&:hover_.choice-hover-check]:opacity-100 [&:focus-visible_.choice-hover-check]:opacity-100"
    >
      <div className="flex items-center gap-3">
        <InAppIconTile accent={accent} icon={icon} />
        <span className="flex-1 text-[11px] font-extrabold uppercase tracking-wider" style={{ color: accent }}>
          {kindLabel}
        </span>
        <Check
          aria-hidden
          className="choice-hover-check size-5 shrink-0 opacity-0 transition-opacity"
          style={{ color: accent }}
          strokeWidth={2.5}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold" style={{ color: IN_APP_CHOICE_TITLE }}>
          {title}
        </h2>
        {tag && (
          <span
            className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
            style={{ borderColor: accent, color: accent }}
          >
            {tag}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[14px] leading-relaxed" style={{ color: IN_APP_CHOICE_BODY }}>
        {blurb}
      </p>

      <ul className="mt-5 flex flex-col gap-2">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0" style={{ color: accent }} />
            <span className="text-[13px] leading-snug" style={{ color: IN_APP_CHOICE_BODY }}>
              {bullet}
            </span>
          </li>
        ))}
      </ul>
    </Link>
  )
}
