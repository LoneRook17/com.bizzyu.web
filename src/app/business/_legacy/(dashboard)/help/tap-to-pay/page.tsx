"use client"

import Link from "next/link"

const STEPS = [
  {
    title: "Download the Bizzy app",
    body:
      "Get the Bizzy app on the iPhone of any door staff member who'll be collecting cover. It's the same app students use. Tap to Pay tools unlock once they're added to your team.",
  },
  {
    title: "Add their phone number to your event team",
    body:
      "From the event's Manage page, invite each door staff member by phone number with a role of Staff, Manager, or Cohost. They'll get a text linking them to the right event in the app.",
  },
  {
    title: "They unlock Accept Payments in the app",
    body:
      "Once added to the team, the door staff sees an Accept Payments button on the event in the Bizzy app. No setup, no card reader, no extra account.",
  },
  {
    title: "Tap to Pay at the door",
    body:
      "Door staff taps Accept Payments, enters the cover amount, and the customer taps their card or phone on the iPhone. Funds settle straight to the event owner's Stripe account and pay out same-day.",
  },
]

export default function TapToPayHelpPage() {
  return (
    <div className="max-w-3xl">
      <Link
        href="/business/events"
        className="text-xs text-gray-500 hover:text-primary mb-2 inline-block"
      >
        &larr; Back to Events
      </Link>
      <h1 className="text-xl font-bold text-ink mb-1">
        How to set up Tap to Pay at your door
      </h1>
      <p className="text-sm text-muted mb-6">
        Collect cover on any iPhone. No card reader, no separate POS.
        Payouts go straight to the event owner&rsquo;s Stripe account.
      </p>

      <ol className="space-y-3 mb-8">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="rounded-xl border border-gray-200 bg-white p-4 md:p-5 flex gap-4"
          >
            <div className="shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
              {i + 1}
            </div>
            <div>
              <h3 className="text-sm md:text-base font-bold text-ink mb-1">
                {step.title}
              </h3>
              <p className="text-sm text-muted leading-relaxed">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Requirements */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 md:p-5 mb-8">
        <h2 className="text-sm font-semibold text-blue-900 mb-2">
          Before you start
        </h2>
        <ul className="space-y-1.5 text-sm text-blue-900/80 list-disc list-inside">
          <li>The event owner must have Stripe connected for payouts.</li>
          <li>Tap to Pay requires an iPhone XS or newer running iOS 16.4+.</li>
          <li>
            Each door staff member needs to be invited to the specific event
            you want them collecting cover for.
          </li>
        </ul>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/business/events"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          Open my events
        </Link>
        <Link
          href="/business/team"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-gray-50 transition-colors"
        >
          Manage team
        </Link>
      </div>
    </div>
  )
}
