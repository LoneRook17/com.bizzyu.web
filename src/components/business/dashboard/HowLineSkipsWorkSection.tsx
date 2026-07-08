export default function HowLineSkipsWorkSection() {
  return (
    <section className="mb-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
        <div className="mb-3">
          <h2 className="text-base md:text-lg font-bold text-ink mb-1">
            How line skips work
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            Line skips let students skip the line at your venue on busy
            nights. They purchase a skip in Bizzy, walk up to your line-skip
            line, and show the QR at the door. Your door staff scans it with
            any phone camera and they walk in.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
          <FactPill
            title="0% fees"
            body="We take nothing from line skips. Payouts go straight to your Stripe account."
          />
          <FactPill
            title="Includes cover"
            body="Skips include cover at the door. Price your skip with that built in."
          />
          <FactPill
            title="Universal scanner"
            body="Any phone camera reads the QR code. No app or special equipment needed."
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
        <p className="text-xs font-bold text-ink">{title}</p>
      </div>
      <p className="text-[11px] md:text-xs text-muted leading-snug">{body}</p>
    </div>
  )
}
