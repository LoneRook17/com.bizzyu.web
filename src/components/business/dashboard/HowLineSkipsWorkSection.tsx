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
        className="w-9 h-9"
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
        className="w-9 h-9"
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
      "When the student arrives, your door staff opens the Bizzy scanner and scans the QR on the student's phone. Takes 2 seconds.",
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
        className="w-9 h-9"
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
    <section className="mb-8">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-8">
        <div className="mb-6">
          <h2 className="text-lg md:text-xl font-bold text-ink mb-1">
            How students redeem your line skip
          </h2>
          <p className="text-sm text-muted">
            Three steps. The middle one is on your door staff.
          </p>
        </div>

        {/* Door-staff scan callout — make it impossible to miss */}
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 flex gap-3">
          <div className="shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
            !
          </div>
          <div className="text-sm">
            <p className="font-semibold text-ink mb-0.5">
              Your door staff must scan the QR on the student&rsquo;s phone.
            </p>
            <p className="text-muted">
              If staff doesn&rsquo;t scan, the skip can&rsquo;t be marked
              used &mdash; you lose the audit trail and the ticket could be
              reused. Make sure scanner devices are set up and your team
              knows where the scanner button lives in the app.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className={`flex flex-col items-center text-center rounded-2xl p-5 border ${
                step.highlight
                  ? "border-primary/40 bg-primary/5"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  step.highlight
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-ink"
                }`}
              >
                {step.icon}
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`w-6 h-6 shrink-0 rounded-full text-xs font-bold flex items-center justify-center ${
                    step.highlight
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-ink"
                  }`}
                >
                  {i + 1}
                </span>
                <h3 className="text-sm md:text-base font-bold text-ink">
                  {step.title}
                </h3>
              </div>
              <p className="text-xs md:text-sm text-muted max-w-[260px]">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
