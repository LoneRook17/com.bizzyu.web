import Link from "next/link"

export default function HowEventsWorkSection() {
  return (
    <section className="mb-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
        <div className="mb-3">
          <h2 className="text-base md:text-lg font-bold text-ink mb-1">
            Sell tickets, keep 100%
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            List your event on Bizzy and get it in front of students at your
            campus. Sell tickets, accept cover at the door, and scan tickets
            in, all from one place. We take{" "}
            <span className="font-semibold text-ink">0% of every ticket</span>.
            Payouts go straight to your Stripe account.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
          <FactPill
            title="Sell tickets, keep 100%"
            body="No platform fees. Payouts go straight to your Stripe account."
          />
          <FactPill
            title="Built-in promotion"
            body="Your event lands in the Bizzy student feed at your campus. Not just a checkout link."
          />
          <FactPillLink
            title="Tap to Pay at the door"
            body="Collect cover on any iPhone. No separate POS needed."
            href="/business/help/tap-to-pay"
          />
        </div>
      </div>
    </section>
  )
}

function FactPill({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <CheckIcon />
        <p className="text-xs font-bold text-ink">{title}</p>
      </div>
      <p className="text-[11px] md:text-xs text-muted leading-snug">{body}</p>
    </div>
  )
}

/** Same shape as FactPill, but the whole card is a tappable link with a chevron hint. */
function FactPillLink({
  title,
  body,
  href,
}: {
  title: string
  body: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-primary/20 bg-primary/5 p-3 hover:bg-primary/10 hover:border-primary/40 transition-colors group"
    >
      <div className="flex items-center gap-1.5 mb-1">
        <CheckIcon />
        <p className="text-xs font-bold text-ink flex-1">{title}</p>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3 h-3 text-primary group-hover:translate-x-0.5 transition-transform"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
      <p className="text-[11px] md:text-xs text-muted leading-snug">{body}</p>
      <p className="text-[11px] font-semibold text-primary mt-1.5">
        How to set up &rarr;
      </p>
    </Link>
  )
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-3.5 h-3.5 text-primary"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}
