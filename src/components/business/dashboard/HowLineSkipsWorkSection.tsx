type Step = {
  icon: React.ReactNode
  title: string
  desc: string
  highlight?: boolean
}

const STEPS: Step[] = [
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-7 h-7"
      >
        <rect x="6" y="3" width="12" height="18" rx="2.5" />
        <path d="M9 7h6" />
        <path d="M9 11h6" />
        <path d="M9 15h4" />
      </svg>
    ),
    title: "Student buys their skip",
    desc: "They pick a venue and night in Bizzy, pay in-app, and get a QR ticket on their phone.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-7 h-7"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M14 14h3v3h-3z" />
        <path d="M19 14h2" />
        <path d="M14 19h3" />
        <path d="M19 19h2v2h-2z" />
      </svg>
    ),
    title: "Door staff scans the QR",
    desc:
      "When the student arrives, your door staff scans the QR on the student's phone with any phone camera — the iPhone camera reads it automatically. No app or special scanner needed.",
    highlight: true,
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-7 h-7"
      >
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <path d="M22 4L12 14.01l-3-3" />
      </svg>
    ),
    title: "Skip is honored, marked used",
    desc:
      "The ticket locks so it can't be reused. Student skips the line. The redemption shows up live on your dashboard.",
  },
]

export default function HowLineSkipsWorkSection() {
  return (
    <section className="mb-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
        <div className="mb-4">
          <h2 className="text-base md:text-lg font-bold text-ink mb-0.5">
            How students redeem your line skip
          </h2>
          <p className="text-xs text-muted">
            Three steps. The middle one is on your door staff.
          </p>
        </div>

        {/* Door-staff scan callout — make it impossible to miss */}
        <div className="mb-5 rounded-lg border border-primary/30 bg-primary/5 p-3 flex gap-2.5">
          <div className="shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
            !
          </div>
          <div className="text-xs">
            <p className="font-semibold text-ink mb-0.5">
              Your door staff must scan the QR on the student&rsquo;s phone.
            </p>
            <p className="text-muted">
              Any phone camera works &mdash; even the iPhone camera. No app
              or special scanner needed. If staff doesn&rsquo;t scan, the
              skip can&rsquo;t be marked used &mdash; you lose the audit
              trail and the ticket could be reused.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className={`flex flex-col items-center text-center rounded-xl p-3 border ${
                step.highlight
                  ? "border-primary/40 bg-primary/5"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-2.5 ${
                  step.highlight
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-ink"
                }`}
              >
                {step.icon}
              </div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className={`w-5 h-5 shrink-0 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    step.highlight
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-ink"
                  }`}
                >
                  {i + 1}
                </span>
                <h3 className="text-xs md:text-sm font-bold text-ink">
                  {step.title}
                </h3>
              </div>
              <p className="text-[11px] md:text-xs text-muted max-w-[240px]">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
