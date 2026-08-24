"use client"

// In-page line-skip payment (V426_FASTFOLLOW.md §6). Mounted only when
// `config.pi_flow_enabled` is true; with the flag off the buyer page keeps its
// Checkout-Session redirect and never loads this.

import { useCallback, useMemo, useState } from "react"
import {
  loadStripe,
  type Appearance,
  type CssFontSource,
  type StripeElementsOptions,
} from "@stripe/stripe-js"
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js"

import { ACCESS, ACCESS_CTA, ACCESS_LIGHT } from "@/lib/checkout/surfaces"
import type { LineSkipPiBreakdown } from "@/lib/lineskip-pi/types"
import { resolveElementsMode, elementsKey } from "@/lib/lineskip-pi/element-binding"

function formatPrice(cents: number): string {
  if (cents === 0) return "Free"
  return `$${(cents / 100).toFixed(2)}`
}

// Stripe caches by key string, so this is computed once per key, not per render.
const stripePromises = new Map<string, ReturnType<typeof loadStripe>>()
function getStripe(publishableKey: string) {
  let p = stripePromises.get(publishableKey)
  if (!p) {
    p = loadStripe(publishableKey)
    stripePromises.set(publishableKey, p)
  }
  return p
}

// Elements appearance, matched to the event checkout's configured theme
// (com.bizzyu.core resources/views/public/checkout.blade.php — the F9.3 Stripe.js
// island: theme "night", #0a0a0f background, #f3f4f6 text, 12px radius, Fira Sans).
// colorPrimary is magenta (door access / Weekly Cover), matching the app.
// Named events stay green. Never gold.
//
// fontFamily must be a real font name, NOT a `var(--font-*)`: Elements renders in a
// cross-origin iframe where the page's next/font CSS variable is undefined, which
// invalidated the whole declaration and dropped labels to the browser serif default.
const appearance: Appearance = {
  theme: "night",
  variables: {
    colorPrimary: ACCESS,
    colorBackground: "#0a0a0f",
    colorText: "#f3f4f6",
    colorDanger: "#f87171",
    borderRadius: "12px",
    fontFamily: "Fira Sans, system-ui, sans-serif",
  },
}

// The event checkout's document loads Fira Sans from Bunny Fonts but its iframe
// Elements fall back to system-ui (the blade never passes `fonts`). We go one step
// further and hand Elements the same stylesheet so the labels render in real Fira
// Sans — matching both the named fontFamily above and the surrounding page, which
// is Fira throughout. Same source the core blade preconnects to.
const fonts: CssFontSource[] = [
  { cssSrc: "https://fonts.bunny.net/css?family=fira-sans:400,500,600,700,800&display=swap" },
]

export interface LineSkipPaymentPanelProps {
  publishableKey: string
  /** The PI's clientSecret. Null until it arrives (live) or always (mock). */
  clientSecret: string | null
  /**
   * Dev mock flow only. When true (and no clientSecret) the Element mounts in
   * deferred mode, since there is no real PI. In LIVE mode a null clientSecret
   * renders a loading skeleton — never deferred mode, which would leak the
   * account's dashboard-default methods (e.g. ACH) onto a card-only PI.
   */
  mock?: boolean
  breakdown: LineSkipPiBreakdown
  quantity: number
  /** Where Stripe returns the buyer after an off-site redirect (3DS/bank app). */
  returnUrl: string
  /** Payment succeeded client-side; the caller now POSTs complete. */
  onPaid: () => void
}

/** The server's breakdown, rendered verbatim — buyer-facing, so fees are shown. */
function OrderSummary({ breakdown, quantity }: { breakdown: LineSkipPiBreakdown; quantity: number }) {
  return (
    <div className="mb-5 rounded-xl border border-[#1e1e2e] bg-[#0a0a0f]/60 p-4">
      <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-white/50">
        Order summary
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-white/70">
          <span>Skip the Line {quantity > 1 ? `× ${quantity}` : ""}</span>
          <span>{formatPrice(breakdown.base_cents)}</span>
        </div>
        {breakdown.discount_cents > 0 && (
          <div className="flex justify-between font-semibold" style={{ color: ACCESS }}>
            <span>Promo discount</span>
            <span>-{formatPrice(breakdown.discount_cents)}</span>
          </div>
        )}
        <div className="flex justify-between text-white/70">
          <span>Service fee</span>
          <span>{breakdown.fee_cents === 0 ? "Free" : formatPrice(breakdown.fee_cents)}</span>
        </div>
        <div className="my-2 border-t border-dashed border-white/15" />
        <div className="flex justify-between text-base font-extrabold text-white">
          <span>Total</span>
          <span style={{ color: ACCESS }}>{formatPrice(breakdown.total_cents)}</span>
        </div>
      </div>
    </div>
  )
}

function PaymentForm({
  breakdown,
  quantity,
  returnUrl,
  onPaid,
}: Omit<LineSkipPaymentPanelProps, "publishableKey" | "clientSecret">) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [expressReady, setExpressReady] = useState(false)

  // One confirm path for the card button and the express wallets alike: a
  // decline lands back here with the form still mounted and still filled, so
  // retry is just "fix it and press pay" — never a page reset.
  const confirm = useCallback(async () => {
    if (!stripe || !elements || submitting) return
    setSubmitting(true)
    setError("")

    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message || "Please check your payment details.")
      setSubmitting(false)
      return
    }

    // Compared inline rather than via an imported constant: only a literal in
    // THIS module folds at build time and takes the mock import with it.
    if (process.env.NEXT_PUBLIC_LINESKIP_PI_MOCK === "1") {
      const { mockConfirm } = await import("@/lib/lineskip-pi/mock")
      const result = await mockConfirm()
      if (!result.ok) {
        setError(result.message)
        setSubmitting(false)
        return
      }
      setSubmitting(false)
      onPaid()
      return
    }

    // redirect:"if_required" keeps 3DS in an inline modal where it can be, and
    // hands off to returnUrl only when the method truly demands leaving.
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    })

    if (confirmError) {
      setError(confirmError.message || "Payment failed. Please try again.")
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    onPaid()
  }, [stripe, elements, submitting, returnUrl, onPaid])

  return (
    <div>
      <OrderSummary breakdown={breakdown} quantity={quantity} />

      {/* Express wallets first — Apple Pay / Google Pay / Link. The element
          hides itself when none are available (desktop Chrome with no saved
          card, unregistered domain), so the divider is gated on onReady rather
          than assuming a wallet exists. */}
      <div className={expressReady ? "mb-4" : "hidden"}>
        <ExpressCheckoutElement
          options={{ buttonHeight: 48 }}
          onReady={({ availablePaymentMethods }) => {
            setExpressReady(Boolean(availablePaymentMethods))
          }}
          onConfirm={confirm}
        />
        <div className="mt-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs font-semibold text-white/30">or pay with card</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>
      </div>

      <PaymentElement options={{ layout: "tabs" }} />

      {error && (
        <p role="alert" className="mt-3 text-xs text-red-400">
          {error}
        </p>
      )}

      <button
        onClick={confirm}
        disabled={!stripe || submitting}
        className="mt-4 w-full rounded-xl py-3.5 text-sm font-extrabold text-black transition hover:brightness-110 disabled:opacity-50"
        style={{ background: `${ACCESS_CTA}` }}
      >
        {submitting ? "Processing..." : `Pay ${formatPrice(breakdown.total_cents)}`}
      </button>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-white/30">
        All sales are final. If the night is cancelled by the venue, you get a full refund.
      </p>
    </div>
  )
}

/** Shown in live mode while the PI's clientSecret is still in flight. Keeps the
 *  buyer on the order summary rather than mounting a deferred Element that would
 *  render dashboard-default methods the card-only PI forbids. */
function PaymentLoading({ breakdown, quantity }: { breakdown: LineSkipPiBreakdown; quantity: number }) {
  return (
    <div>
      <OrderSummary breakdown={breakdown} quantity={quantity} />
      <div className="space-y-3">
        <div className="h-11 animate-pulse rounded-xl bg-white/5" />
        <div className="h-11 animate-pulse rounded-xl bg-white/5" />
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-white/40">
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-white/20"
          style={{ borderTopColor: ACCESS }}
        />
        Loading secure payment…
      </div>
    </div>
  )
}

export default function LineSkipPaymentPanel({
  publishableKey,
  clientSecret,
  mock = false,
  breakdown,
  quantity,
  returnUrl,
  onPaid,
}: LineSkipPaymentPanelProps) {
  const mode = resolveElementsMode({ clientSecret, mock })

  const options = useMemo<StripeElementsOptions>(() => {
    // Bound: render exactly the PaymentIntent's methods (card only).
    if (mode.kind === "bound") return { clientSecret: mode.clientSecret, appearance, fonts }
    // Deferred (mock only): no real PI to bind to. Never reached in live mode —
    // resolveElementsMode returns `skeleton` there, guarded below.
    return {
      mode: "payment",
      amount: Math.max(50, breakdown.total_cents),
      currency: "usd",
      appearance,
      fonts,
    }
  }, [mode, breakdown.total_cents])

  // Live, secret not here yet: a loader — NOT a deferred Element showing
  // dashboard defaults (the ACH/"Direct debit" leak this fix closes).
  if (mode.kind === "skeleton") {
    return <PaymentLoading breakdown={breakdown} quantity={quantity} />
  }

  return (
    // Key on the secret: Stripe treats options.clientSecret as immutable, so a
    // secret that arrives/changes after mount is ignored unless the provider is
    // re-created. This forces a clean remount bound to the current PI.
    <Elements key={elementsKey(clientSecret)} stripe={getStripe(publishableKey)} options={options}>
      <PaymentForm
        breakdown={breakdown}
        quantity={quantity}
        returnUrl={returnUrl}
        onPaid={onPaid}
      />
    </Elements>
  )
}
