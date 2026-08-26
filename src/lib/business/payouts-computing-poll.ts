// The Payouts page's computing-poll loop, extracted pure so its give-up
// behavior is unit-testable under `node --test` (page.tsx is JSX and can't be
// imported there). This module owns the PAGE's patience rulings for a cold
// cache key: how long the calm crunching state keeps polling, when the copy
// softens to set expectations, and when the page finally hands over to the
// error + Retry state. The reconcile contract itself (fetchers, computing
// detection, the export flow's own ceiling) stays in payouts-reconcile.ts.

import { reconcileOutcomeFromData } from "./payouts-access.ts"
import {
  COMPUTING_POLL_MS,
  type SummaryFetchResult,
  type DepositsFetchResult,
} from "./payouts-reconcile.ts"

/** Give-up ceiling for the page poll. Whale businesses (Backroads/RBS) cold-walk
 *  in 6–8 minutes on PROD :125 — the walk is progressing server-side the whole
 *  time and the data always lands, so the old 2-minute ceiling showed those
 *  owners a false error + Retry mid-walk. 10 minutes clears the worst observed
 *  walk with over 2 minutes of margin while still surfacing a genuinely wedged
 *  compute. (The export button keeps payouts-reconcile.ts's own 2-minute
 *  ceiling — its give-up is a soft retryable button state, not an error wall.) */
export const COMPUTING_GIVE_UP_MS = 600_000

/** After ~90 s of crunching, swap in expectation-setting copy — still calm,
 *  still polling, never an error — so a whale's multi-minute first walk reads
 *  as "working", not "hung". */
export const COMPUTING_PATIENCE_MS = 90_000

/** The softened copy shown past COMPUTING_PATIENCE_MS. */
export const COMPUTING_PATIENT_COPY = {
  title: "Still working on it",
  description:
    "Large accounts can take a few minutes on the first load. We're reconciling every deposit with Stripe, and this page will update by itself.",
} as const

/** calm → the standard crunching copy; patient → COMPUTING_PATIENT_COPY. */
export type ComputingPhase = "calm" | "patient"

export function computingPhaseAt(elapsedMs: number): ComputingPhase {
  return elapsedMs >= COMPUTING_PATIENCE_MS ? "patient" : "calm"
}

export interface ComputingPollOptions {
  fetchAll(): Promise<[SummaryFetchResult | null, DepositsFetchResult | null]>
  /** Non-computing settle (ready / notdeployed mix) — the page's apply(). */
  onSettled(s: SummaryFetchResult | null, d: DepositsFetchResult | null): void
  /** Still computing and under the ceiling; phase picks the copy. */
  onComputing(phase: ComputingPhase): void
  /** The ceiling passed while still computing — the genuine-failure net. */
  onGiveUp(): void
  /** The fetch itself rejected (5xx / network / 403). */
  onError(err: unknown): void
  /** Test seams; production uses the real clock and timers. */
  now?: () => number
  schedule?: (fn: () => void, ms: number) => unknown
  unschedule?: (timer: unknown) => void
}

/** Start the fetch/poll cycle; returns the cancel function the page effect
 *  hands back as its cleanup. Cancelling both clears any pending poll timer
 *  AND drops an in-flight fetch's result (the `active` flag), so a window or
 *  venue change — a new fetchAll identity — stops the loop mid-computing
 *  without a stale state update. */
export function startComputingPoll(opts: ComputingPollOptions): () => void {
  const now = opts.now ?? Date.now
  const schedule = opts.schedule ?? ((fn: () => void, ms: number) => setTimeout(fn, ms))
  const unschedule = opts.unschedule ?? ((t: unknown) => clearTimeout(t as ReturnType<typeof setTimeout>))
  let active = true
  let timer: unknown
  const startedAt = now()
  const attempt = () => {
    opts
      .fetchAll()
      .then(([s, d]) => {
        if (!active) return
        if (reconcileOutcomeFromData(s, d) === "computing") {
          const elapsed = now() - startedAt
          if (elapsed >= COMPUTING_GIVE_UP_MS) {
            opts.onGiveUp()
            return
          }
          opts.onComputing(computingPhaseAt(elapsed))
          timer = schedule(attempt, COMPUTING_POLL_MS)
          return
        }
        opts.onSettled(s, d)
      })
      .catch((err) => {
        if (active) opts.onError(err)
      })
  }
  attempt()
  return () => {
    active = false
    if (timer !== undefined) unschedule(timer)
  }
}
