"use client"

import { useState, useEffect, useCallback } from "react"
import { Lock, Banknote, Download, Loader2, Info, MapPin, ChevronRight } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { useVenue, useVenueParam } from "@/lib/business/venue-context"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { cn } from "@/lib/v2/utils"
import {
  fetchPayouts,
  rangeForDays,
  isoDate,
  DEFAULT_PAYOUT_RANGE_DAYS,
  buildPayoutsCsv,
  csvFilename,
  downloadCsv,
} from "@/lib/business/payouts"
import {
  fetchPayoutsSummary,
  fetchDeposits,
  fetchPayoutsExportCsv,
  combineFreshness,
  untilIsPast,
  COMPUTING_COPY,
  EXPORT_PREPARING_LABEL,
  type PayoutsWindow,
  type PayoutsSummary,
  type DepositListItem,
  type SummaryFetchResult,
  type DepositsFetchResult,
} from "@/lib/business/payouts-reconcile"
import {
  startComputingPoll,
  COMPUTING_PATIENT_COPY,
  type ComputingPhase,
} from "@/lib/business/payouts-computing-poll"
import {
  canAccessPayouts,
  reconcileOutcomeFromData,
  reconcileOutcomeFromError,
  PAYOUTS_ACCESS_COPY,
  type ReconcileOutcome,
} from "@/lib/business/payouts-access"
import {
  isScopedPayoutsMember,
  shouldShowVenuePicker,
  pickerVenueList,
  scopeRequiredVenuesFromError,
  scoped404IsOutOfScope,
  venuePickIntent,
  PAYOUTS_VENUE_PICKER_COPY,
  type ScopeVenue,
} from "@/lib/business/payouts-scope"
import ReconcileView, { RangePicker } from "@/components/business/v2/payouts/ReconcileView"

/** EmptyState-compatible icon for the computing state — the stock Loader2 with
 *  the spin it needs to read as "working", not "empty". */
function ComputingSpinner({ className }: { className?: string }) {
  return <Loader2 className={cn(className, "animate-spin")} />
}

function PayoutsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[84px] rounded-xl" />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-[76px] rounded-xl" />
      ))}
    </div>
  )
}

// ── Access state (never an error) ────────────────────────────────────────────
// Payouts is owner OR owner-granted (PAYOUTS-PER-PERSON-ACCESS). Users without
// access never see a FAIL: the nav tab is hidden, and a direct visit — or a 403
// on the reconcile endpoints despite an access-looking session (a just-revoked
// grant / stale role) — lands on this clean, no-error state.

function PayoutsAccessState() {
  return (
    <>
      <PageHeader title="Payouts" description="Reconcile every deposit to the tickets and refunds inside it." />
      <div className="mt-6">
        <EmptyState icon={Lock} title={PAYOUTS_ACCESS_COPY.title} description={PAYOUTS_ACCESS_COPY.description} />
      </div>
    </>
  )
}

// ── Venue-scoped picker state (PAYOUTS-PER-PERSON-ACCESS) ─────────────────────
// A scoped granted member on "All venues" can't see a whole-account view (the
// server 403s an all-venues payouts call for them). Instead of an error, we mirror
// the line-skips tab's "pick a venue" pattern EXACTLY: a calm chooser of only
// their accessible venues, no payouts data, no error styling. Choosing one sets
// the GLOBAL venue switcher (onPick → setSelectedVenue), and from then on the page
// behaves like today's single-venue view. Owner / global members never reach here.

function PayoutsVenuePickerState({
  venues,
  onPick,
}: {
  venues: ScopeVenue[]
  onPick: (id: number) => void
}) {
  return (
    <>
      <PageHeader title="Payouts" description="Reconcile every deposit to the tickets and refunds inside it." />
      <div className="mt-6 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
        <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-400">{PAYOUTS_VENUE_PICKER_COPY.prompt}</p>
        <div className="space-y-2">
          {venues.map((v) => (
            <button
              key={v.id}
              onClick={() => onPick(v.id)}
              className="flex w-full items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 text-left text-sm font-medium text-neutral-800 transition-colors hover:border-[#05EB54]/40 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-800/60"
            >
              <span className="inline-flex items-center gap-2">
                <MapPin className="size-4 text-neutral-400" /> {v.name}
              </span>
              <ChevronRight className="size-4 text-neutral-300 dark:text-neutral-600" />
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

export default function PayoutsPage() {
  const { user } = useAuth()
  // Gate is the ONE predicate the sidebar nav also uses — tab and screen agree.
  // PAYOUTS-PER-PERSON-ACCESS: owner OR an owner-granted member (/me →
  // can_view_payouts). Users without access still land on the clean access state.
  if (!canAccessPayouts(user?.business_role, user?.can_view_payouts)) return <PayoutsAccessState />
  return <ReconcileContainer />
}

// ── Global period-level Export CSV (server file, fetch-then-blob) ─────────────
// Services :125 serves /business/payouts/export.csv from the shared payouts
// cache: 200 + Content-Disposition is the file; 202 + Retry-After means the key
// is still computing — the fetcher waits and retries while the button shows
// "Preparing export…", and it NEVER blobs the JSON computing body. A 404
// (pre-contract server) falls back to the original client-side CSV build so the
// accountant file keeps working everywhere.

type ExportPhase = "idle" | "busy" | "preparing" | "failed"

const EXPORT_LABEL: Record<ExportPhase, string> = {
  idle: "Export CSV",
  busy: "Export CSV",
  preparing: EXPORT_PREPARING_LABEL,
  failed: "Export failed — retry",
}

function GlobalCsvExportButton({ timeWindow, venueParam }: { timeWindow: PayoutsWindow; venueParam: string }) {
  const [phase, setPhase] = useState<ExportPhase>("idle")
  const working = phase === "busy" || phase === "preparing"
  const onExport = useCallback(async () => {
    setPhase("busy")
    try {
      // Custom window → the exact since/until the summary shows; presets keep
      // the derived N-day range. Either way the export (and therefore the
      // downloaded file) covers the same window as the page.
      const range =
        timeWindow.kind === "custom"
          ? { since: timeWindow.since, until: timeWindow.until }
          : rangeForDays(timeWindow.days, new Date())
      const result = await fetchPayoutsExportCsv({
        range,
        status: "all",
        venueParam,
        onComputing: () => setPhase("preparing"),
      })
      if (result === null) {
        // Endpoint not deployed: the pre-:125 client-side projection, unchanged.
        const resp = await fetchPayouts({ range, status: "all", venueParam })
        if (resp) downloadCsv(csvFilename(range), buildPayoutsCsv(resp))
        setPhase("idle")
        return
      }
      if (result.kind === "ready") {
        downloadCsv(result.filename, result.csv)
        setPhase("idle")
      } else {
        // gave_up — the walk outlived our patience; the button turns retryable.
        setPhase("failed")
      }
    } catch {
      // Non-fatal: the period export is a convenience, never blocks the page.
      setPhase("failed")
    }
  }, [timeWindow, venueParam])

  return (
    <button
      type="button"
      onClick={onExport}
      disabled={working}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800/60",
        phase === "failed" && "border-red-200 text-red-700 dark:border-red-900 dark:text-red-400",
      )}
    >
      {working ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} {EXPORT_LABEL[phase]}
    </button>
  )
}

// ── Owner reconciliation container ────────────────────────────────────────────
// Owner-only by the time we get here. Outcomes (payouts-access.ts):
//   ready       → the reconciliation view
//   notdeployed → P2-B1s not live yet (404 → null): graceful "coming soon"
//   forbidden   → 403 on an owner-looking session (stale role): access state
//   error       → genuine 5xx / network failure: error + retry (owner keeps this)

type ReconMode = "loading" | ReconcileOutcome

// ── Which-venue scope label ───────────────────────────────────────────────────
// The payouts view respects the global venue switcher. This pill makes the current
// scope explicit — "Showing: All venues" (whole business) or "Showing: <venue>"
// (that venue's contribution). Rendered in every owner outcome (loading, coming-
// soon, error, ready) so the scope is always visible.

function ScopePill({ label }: { label: string }) {
  return (
    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
      <MapPin className="size-3.5 text-neutral-400 dark:text-neutral-500" />
      Showing: <span className="text-neutral-900 dark:text-neutral-100">{label}</span>
    </div>
  )
}

function ReconcileContainer() {
  const { user } = useAuth()
  const venueParam = useVenueParam()
  const { venues, selectedVenue, isAllVenues, setSelectedVenue } = useVenue()
  // PAYOUTS-PER-PERSON-ACCESS: /me tells us the payouts MODE. A SCOPED granted
  // member (all_venues:false) can only see one of THEIR venues at a time; owner /
  // global members (all_venues:true) are undefined-scoped and keep today's full
  // account view. `access` is absent on a pre-contract /me — the VENUE_SCOPE_REQUIRED
  // 403 fallback below still drives the picker in that case.
  const access = user?.payouts_access
  const scoped = isScopedPayoutsMember(access)
  // Bare venue name for the per-deposit share callout (undefined ⇒ "This venue").
  const venueName = isAllVenues ? undefined : selectedVenue?.name
  // Venue id marks "this venue" in the summary breakdown table.
  const venueId = isAllVenues ? undefined : selectedVenue?.id
  // Scope pill label: concrete venue name, else "All venues" (also the transient
  // pre-resolution default, matching the switcher's own fallback).
  const scopeLabel = !isAllVenues && selectedVenue?.name ? selectedVenue.name : "All venues"
  // Preset days=N by default; the picker's Custom mode swaps in a since/until
  // window that summary, deposits, and the CSV export all share.
  const [timeWindow, setTimeWindow] = useState<PayoutsWindow>({ kind: "days", days: DEFAULT_PAYOUT_RANGE_DAYS })
  const [summary, setSummary] = useState<PayoutsSummary | null>(null)
  const [deposits, setDeposits] = useState<DepositListItem[] | null>(null)
  const [freshness, setFreshness] = useState<{ computedAt: string | null; refreshing: boolean } | null>(null)
  const [mode, setMode] = useState<ReconMode>("loading")
  // calm → the standard crunching copy; patient (past ~90 s) → the softened
  // "large accounts take a few minutes" copy. Never an error while computing.
  const [crunchPhase, setCrunchPhase] = useState<ComputingPhase>("calm")
  // Bumped by Retry to restart the whole fetch/poll cycle after a give-up.
  const [fetchNonce, setFetchNonce] = useState(0)
  // Set when a fetch PROVES scope is needed: a VENUE_SCOPE_REQUIRED 403 (no venue
  // chosen) or a scoped member's out-of-scope 404. Either forces the venue picker.
  // Only ever set for a provably-scoped caller, so owner/global can't reach it.
  const [scopeForcedPicker, setScopeForcedPicker] = useState(false)
  // Venues from a VENUE_SCOPE_REQUIRED 403 body — the fallback venue source for a
  // pre-contract /me that didn't carry payouts_access.venues.
  const [scopeRequiredVenues, setScopeRequiredVenues] = useState<ScopeVenue[] | null>(null)

  // A scoped member on "All venues" has no whole-account view — render the picker
  // (below) instead of firing an all-venues fetch the server would 403.
  const skipFetch = scoped && isAllVenues

  // Clear a stale fetch-forced picker whenever the fetch INPUTS change (a new venue
  // via the top switcher, a new window, or a Retry). React's "adjust state when a
  // key changes" pattern (done in render, not an effect): a 403/404-forced chooser
  // for one venue must never survive onto the next. Only touches the scope flags —
  // summary/deposits/mode are left alone, so prior data still stays on screen while
  // the next window loads (no skeleton flash).
  const fetchKey = `${venueParam}|${
    timeWindow.kind === "custom" ? `${timeWindow.since}~${timeWindow.until}` : `d${timeWindow.days}`
  }|${fetchNonce}`
  const [seenFetchKey, setSeenFetchKey] = useState(fetchKey)
  if (seenFetchKey !== fetchKey) {
    setSeenFetchKey(fetchKey)
    setScopeForcedPicker(false)
    setScopeRequiredVenues(null)
  }

  // fetchAll does NO state work (just returns the two payloads) so the effect
  // never contains a synchronous state update. Applying the result happens in the
  // async .then, after the await.
  const fetchAll = useCallback(
    () =>
      Promise.all([
        fetchPayoutsSummary({ window: timeWindow, venueParam }),
        fetchDeposits({ window: timeWindow, venueParam }),
      ]),
    [timeWindow, venueParam],
  )

  const apply = useCallback(
    (s: SummaryFetchResult | null, d: DepositsFetchResult | null) => {
      const outcome = reconcileOutcomeFromData(s, d)
      // A scoped member's 404 (both endpoints degrade to null) means the SELECTED
      // venue is outside their scope — fold it into the picker, never "coming soon".
      if (scoped404IsOutOfScope(access, outcome)) {
        setScopeForcedPicker(true)
        return
      }
      if (outcome === "ready" && s?.kind === "ready" && d?.kind === "ready") {
        setSummary(s.summary)
        setDeposits(d.deposits)
        // One cache key feeds both endpoints, so their freshness agrees; merge
        // defensively anyway. ready+refreshing renders data normally — the view
        // just gets a subtle indicator, never a spinner wall.
        setFreshness(combineFreshness(s, d))
      }
      setMode(outcome)
    },
    [access],
  )

  useEffect(() => {
    // Scoped member on All venues → the picker renders below; never fetch (a
    // whole-account payouts call 403s VENUE_SCOPE_REQUIRED for them).
    if (skipFetch) return
    // `mode` initializes to "loading"; on a range re-fetch the current deposits
    // stay on screen until the new data resolves (no skeleton flash) — EXCEPT
    // a cold cache key ({state:'computing'}), which swaps in the crunching
    // state and polls until the walk finishes. The loop itself lives in
    // payouts-computing-poll.ts (pure, unit-tested): calm copy first, the
    // softened "large accounts" copy past ~90 s, and only past
    // COMPUTING_GIVE_UP_MS (10 min — clear of whale cold walks) does it hand
    // over to the existing error + Retry state. Its cancel function is this
    // effect's cleanup — the same `active` semantics as before, so a
    // window/venue change (new fetchAll identity) or unmount stops the loop
    // mid-computing.
    return startComputingPoll({
      fetchAll,
      onSettled: apply,
      onComputing: (phase) => {
        setCrunchPhase(phase)
        setMode("computing")
      },
      onGiveUp: () => setMode("error"),
      onError: (err) => {
        // A VENUE_SCOPE_REQUIRED 403 (a scoped member hit the endpoint with no
        // venue) is NOT the stale-role 403 → drive the picker with the body's
        // venues, not the access-denied state.
        const scopeVenues = scopeRequiredVenuesFromError(err)
        if (scopeVenues) {
          setScopeRequiredVenues(scopeVenues)
          setScopeForcedPicker(true)
          return
        }
        setMode(reconcileOutcomeFromError(err))
      },
    })
  }, [fetchAll, apply, fetchNonce, skipFetch])

  const retry = () => {
    // Restart the effect's fetch/poll cycle (fresh give-up clock included).
    setMode("loading")
    setFetchNonce((n) => n + 1)
  }

  // SWITCHER SYNC: choosing a venue from the picker sets the GLOBAL venue switcher
  // to it (exactly the line-skips tab) — `venueParam` flips, the fetch effect
  // re-fires for that venue, and the page becomes today's single-venue view. Clear
  // the fetch-forced flag so a prior 403/404 can't strand us on the chooser.
  const pickVenue = (id: number) => {
    const intent = venuePickIntent(id)
    if (intent.clearScopeForced) setScopeForcedPicker(false)
    setSelectedVenue(intent.switcherVenueId)
  }

  // PICKER STATE: a scoped member on All venues (or after a scope-required/out-of-
  // scope fetch) gets the calm "pick a venue" chooser instead of any payouts data.
  // Owner / global members never satisfy this — their view is byte-identical to
  // today. Venues come from /me payouts_access.venues, then the 403 body, then the
  // switcher's own restricted set (defensive — always non-empty for a scoped user).
  if (shouldShowVenuePicker({ isAllVenues, access, scopeForced: scopeForcedPicker })) {
    const fromContract = pickerVenueList(access, scopeRequiredVenues)
    const pickerVenues =
      fromContract.length > 0 ? fromContract : venues.map((v) => ({ id: v.id, name: v.name }))
    return <PayoutsVenuePickerState venues={pickerVenues} onPick={pickVenue} />
  }

  // A 403 on an owner-looking session (stale role) → the clean access state, not
  // an error wall (Luke's ruling — never a FAIL on this surface for lack of access).
  if (mode === "forbidden") return <PayoutsAccessState />

  return (
    <>
      <PageHeader
        title="Payouts"
        description="Reconcile every deposit to the tickets and refunds inside it."
        actions={
          <>
            <RangePicker value={timeWindow} onChange={setTimeWindow} disabled={mode === "loading"} />
            <GlobalCsvExportButton timeWindow={timeWindow} venueParam={venueParam} />
          </>
        }
      />
      <ScopePill label={scopeLabel} />
      <div className="mt-6">
        {mode === "loading" ? (
          <PayoutsSkeleton />
        ) : mode === "computing" ? (
          // Non-alarming: a cold cache key is expected behavior (first visit,
          // new window/venue, Eastern-midnight key rotation) — never $0.00
          // tiles, never an error. The effect above is polling; this state
          // resolves itself. Past ~90 s the copy softens to set expectations
          // for whale-scale first walks — still no error, no Retry.
          <EmptyState
            icon={ComputingSpinner}
            title={(crunchPhase === "patient" ? COMPUTING_PATIENT_COPY : COMPUTING_COPY).title}
            description={(crunchPhase === "patient" ? COMPUTING_PATIENT_COPY : COMPUTING_COPY).description}
          />
        ) : mode === "notdeployed" ? (
          <EmptyState
            icon={Info}
            title="Payout reconciliation is coming soon"
            description="Detailed payout breakdowns aren't available yet. Your deposits still land in your bank on Stripe's normal schedule — this tab will show exactly what each one paid for once it's live."
          />
        ) : mode === "error" ? (
          <EmptyState
            icon={Banknote}
            title="Couldn't load payouts"
            description="Something went wrong fetching your deposits. Please try again in a moment."
            action={
              <button
                type="button"
                onClick={retry}
                className="rounded-lg bg-[#05EB54] px-4 py-2 text-sm font-semibold text-neutral-900 transition-colors hover:brightness-95"
              >
                Retry
              </button>
            }
          />
        ) : summary && deposits ? (
          <ReconcileView
            summary={summary}
            deposits={deposits}
            venueParam={venueParam}
            venueName={venueName}
            venueId={venueId}
            untilInPast={untilIsPast(timeWindow, isoDate(new Date()))}
            freshness={freshness ?? undefined}
          />
        ) : null}
      </div>
    </>
  )
}
