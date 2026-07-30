// Unit tests for the CACHED-SERVE payouts contract (services :125 —
// notes/payouts-listexport-cache-contract.md). Runs under the Node built-in
// test runner (`npm test`), no extra deps.
//
// Covers exactly what would burn a business owner if the contract handling
// regressed:
//  (1) computing detection on /summary AND the list runs BEFORE normalization —
//      the computing body must never coerce into $0.00 tiles / an empty list,
//  (2) /deposits freshness rides in X-Payouts-* headers ([] + computing header
//      is "still working", not "no deposits"),
//  (3) MISSING headers = ready (back-compat with pre-:125 servers),
//  (4) export.csv fetch-then-blob: 202 → wait Retry-After → retry → 200 CSV;
//      the JSON computing body is NEVER returned as the file; give-up is finite,
//  (5) ?payout_id is window-bound (empty payouts is READY data, and the window
//      params always ride along),
//  (6) freshness display — "Updated h:mm a (ET)" in America/New_York + the
//      refreshing indicator + non-alarming computing copy, and
//  (7) the PAGE poll's patience rulings (payouts-computing-poll.ts): calm
//      crunching persists past the old 2-minute mark, the copy softens at
//      ~90 s, error + Retry only past the 10-minute ceiling (clear of whale
//      cold walks), and cancel (window/venue change) stops the loop cold.

import { test } from "node:test"
import assert from "node:assert/strict"
import {
  isComputingBody,
  parsePayoutsHeaders,
  summaryResultFromBody,
  depositsResultFromBody,
  listResultFromBody,
  combineFreshness,
  normalizeSummary,
  freshnessLabel,
  retryAfterSeconds,
  csvFilenameFromDisposition,
  isCsvExportResponse,
  fetchPayoutsExportCsv,
  COMPUTING_POLL_MS,
  COMPUTING_GIVE_UP_MS,
  COMPUTING_COPY,
  REFRESHING_LABEL,
  EXPORT_PREPARING_LABEL,
  type ExportResponseLike,
  type SummaryFetchResult,
  type DepositsFetchResult,
} from "./payouts-reconcile.ts"
import {
  startComputingPoll,
  computingPhaseAt,
  COMPUTING_PATIENCE_MS,
  COMPUTING_PATIENT_COPY,
  COMPUTING_GIVE_UP_MS as PAGE_COMPUTING_GIVE_UP_MS,
} from "./payouts-computing-poll.ts"
import { normalizePayoutsResponse, payoutsQuery } from "./payouts.ts"

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** The cold-cache body every JSON endpoint shares. */
const COMPUTING_BODY = { state: "computing", computed_at: null, refreshing: true }

const COMPUTED_AT = "2026-07-30T18:05:00Z" // 2:05 PM EDT

function readySummaryBody() {
  return {
    deposited_cents: 8690200,
    in_transit_cents: 139900,
    refunded_cents: 4200,
    computed_at: COMPUTED_AT,
    refreshing: false,
  }
}

function readyListBody() {
  return {
    currency: "usd",
    range: { since: "2026-04-30", until: "2026-07-30" },
    in_transit: { host_net_cents: 139900, ticket_count: 12, rows: [] },
    payouts: [
      {
        stripe_payout_id: "po_1TtHLl2eZvKYlo2CabcDEFGh",
        payout_date: "2026-07-28",
        status: "paid",
        payout_total_cents: 89000,
        ticket_count: 41,
        foots: true,
        fee_coverage: "",
        subtotals_by_event: [],
        rows: [],
      },
    ],
    summary: { payout_count: 1, all_foot: true },
    computed_at: COMPUTED_AT,
    refreshing: true,
  }
}

/** Case-insensitive header stub (real Headers is case-insensitive too). */
function headersOf(map: Record<string, string> = {}): { get(name: string): string | null } {
  const lower: Record<string, string> = {}
  for (const [k, v] of Object.entries(map)) lower[k.toLowerCase()] = v
  return { get: (name: string) => lower[name.toLowerCase()] ?? null }
}

const READY_HEADERS = {
  "X-Payouts-State": "ready",
  "X-Payouts-Computed-At": COMPUTED_AT,
  "X-Payouts-Refreshing": "0",
}

// ── (1) Computing detection BEFORE normalization — summary and list ──────────

test("summary: the computing body is detected, not normalized", () => {
  const r = summaryResultFromBody(COMPUTING_BODY)
  assert.deepEqual(r, { kind: "computing" })
})

test("summary: normalizeSummary WOULD coerce the computing body to all-zeros — the trap the detection exists for", () => {
  // Document the failure mode: without the kind:'computing' short-circuit the
  // strip would render $0.00 tiles as if that were the answer.
  const coerced = normalizeSummary(COMPUTING_BODY as unknown as Record<string, never>)
  assert.equal(coerced.deposited_cents, 0)
  assert.equal(coerced.in_transit_cents, 0)
  assert.equal(coerced.refunded_cents, 0)
})

test("summary: ready body → normalized summary + computed_at + refreshing", () => {
  const r = summaryResultFromBody(readySummaryBody())
  assert.equal(r.kind, "ready")
  if (r.kind !== "ready") return
  assert.equal(r.summary.deposited_cents, 8690200)
  assert.equal(r.computedAt, COMPUTED_AT)
  assert.equal(r.refreshing, false)
})

test("summary: ready + refreshing:true stays READY (stale-while-revalidate, not a spinner)", () => {
  const r = summaryResultFromBody({ ...readySummaryBody(), refreshing: true })
  assert.equal(r.kind, "ready")
  if (r.kind === "ready") assert.equal(r.refreshing, true)
})

test("summary: pre-contract body (no computed_at/refreshing) is ready with null freshness", () => {
  const r = summaryResultFromBody({ deposited_cents: 500, in_transit_cents: 0, refunded_cents: 0 })
  assert.equal(r.kind, "ready")
  if (r.kind !== "ready") return
  assert.equal(r.summary.deposited_cents, 500)
  assert.equal(r.computedAt, null)
  assert.equal(r.refreshing, false)
})

test("list: the computing body is detected, not normalized", () => {
  assert.deepEqual(listResultFromBody(COMPUTING_BODY), { kind: "computing" })
})

test("list: normalizePayoutsResponse WOULD coerce the computing body into an empty-but-final list — same trap", () => {
  const coerced = normalizePayoutsResponse(COMPUTING_BODY as unknown as Record<string, never>)
  assert.deepEqual(coerced.payouts, [])
  assert.equal(coerced.in_transit.host_net_cents, 0)
})

test("list: ready body → normalized response with payouts intact + freshness", () => {
  const r = listResultFromBody(readyListBody())
  assert.equal(r.kind, "ready")
  if (r.kind !== "ready") return
  assert.equal(r.response.payouts.length, 1)
  assert.equal(r.response.payouts[0].payout_total_cents, 89000)
  assert.equal(r.response.summary.all_foot, true)
  assert.equal(r.computedAt, COMPUTED_AT)
  assert.equal(r.refreshing, true)
})

// ── (2) /deposits freshness in headers ───────────────────────────────────────

test("deposits: computing header + [] body → computing (never 'no deposits')", () => {
  const r = depositsResultFromBody([], headersOf({ "X-Payouts-State": "computing", "X-Payouts-Refreshing": "1" }))
  assert.deepEqual(r, { kind: "computing" })
})

test("deposits: ready headers → ready with parsed computed_at + refreshing", () => {
  const r = depositsResultFromBody(
    [{ payout_id: "po_1", arrival_date: "2026-07-28", amount_cents: 89000, sales_count: 41, status: "paid" }],
    headersOf({ ...READY_HEADERS, "X-Payouts-Refreshing": "1" }),
  )
  assert.equal(r.kind, "ready")
  if (r.kind !== "ready") return
  assert.equal(r.deposits.length, 1)
  assert.equal(r.deposits[0].amount_cents, 89000)
  assert.equal(r.computedAt, COMPUTED_AT)
  assert.equal(r.refreshing, true)
})

test("deposits: refreshing '0' parses false", () => {
  const r = depositsResultFromBody([], headersOf(READY_HEADERS))
  assert.equal(r.kind, "ready")
  if (r.kind === "ready") assert.equal(r.refreshing, false)
})

test("parsePayoutsHeaders is header-name case-insensitive", () => {
  const f = parsePayoutsHeaders(headersOf({ "x-payouts-state": "computing" }))
  assert.equal(f.state, "computing")
})

// ── (3) Back-compat: missing headers = ready ─────────────────────────────────

test("deposits: NO X-Payouts-* headers (pre-:125 server) → ready, array is final data", () => {
  const r = depositsResultFromBody(
    [{ payout_id: "po_old", arrival_date: null, amount_cents: 100, sales_count: 1, status: "paid" }],
    headersOf({}),
  )
  assert.equal(r.kind, "ready")
  if (r.kind !== "ready") return
  assert.equal(r.deposits.length, 1)
  assert.equal(r.computedAt, null)
  assert.equal(r.refreshing, false)
})

test("isComputingBody: only the literal state:'computing' marker, never arrays/null/ready bodies", () => {
  assert.equal(isComputingBody(COMPUTING_BODY), true)
  assert.equal(isComputingBody(readySummaryBody()), false)
  assert.equal(isComputingBody([]), false)
  assert.equal(isComputingBody(null), false)
  assert.equal(isComputingBody("computing"), false)
})

// ── (4) export.csv fetch-then-blob: 202 → retry → 200 CSV ────────────────────

const CSV_TEXT = "stripe_payout_id,payout_date\r\npo_1,2026-07-28"
const RANGE = { since: "2026-04-30", until: "2026-07-30" }

function csvResponse(filename = "bizzy-payouts-2026-04-30-to-2026-07-30.csv"): ExportResponseLike {
  return {
    status: 200,
    headers: headersOf({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      ...READY_HEADERS,
    }),
    text: async () => CSV_TEXT,
  }
}

function computing202(retryAfter = "5"): ExportResponseLike {
  return {
    status: 202,
    headers: headersOf({
      "Content-Type": "application/json; charset=utf-8",
      "X-Payouts-State": "computing",
      "X-Payouts-Refreshing": "1",
      "Retry-After": retryAfter,
    }),
    text: async () => JSON.stringify(COMPUTING_BODY),
  }
}

/** Scripted transport: shifts one response per request; records sleeps. */
function scriptedExport(responses: ExportResponseLike[]) {
  const sleeps: number[] = []
  const paths: string[] = []
  return {
    sleeps,
    paths,
    request: async (path: string) => {
      paths.push(path)
      const next = responses.shift()
      if (!next) throw new Error("script exhausted")
      return next
    },
    sleep: async (s: number) => {
      sleeps.push(s)
    },
  }
}

test("export: 202 → wait Retry-After → retry → 200 CSV downloads with the server filename", async () => {
  const script = scriptedExport([computing202(), computing202(), csvResponse()])
  let preparing = 0
  const r = await fetchPayoutsExportCsv({
    range: RANGE,
    request: script.request,
    sleep: script.sleep,
    onComputing: () => {
      preparing += 1
    },
  })
  assert.deepEqual(r, {
    kind: "ready",
    filename: "bizzy-payouts-2026-04-30-to-2026-07-30.csv",
    csv: CSV_TEXT,
  })
  assert.deepEqual(script.sleeps, [5, 5]) // honored Retry-After between attempts
  assert.equal(preparing, 2) // the button knew to show "Preparing export…"
})

test("export: the JSON computing body is NEVER the file — a non-CSV 200 keeps retrying", async () => {
  // Defensive: even a mislabeled 200 without CSV markers must not be blobbed.
  const sneaky200: ExportResponseLike = {
    status: 200,
    headers: headersOf({ "Content-Type": "application/json" }),
    text: async () => JSON.stringify(COMPUTING_BODY),
  }
  const script = scriptedExport([sneaky200, csvResponse()])
  const r = await fetchPayoutsExportCsv({ range: RANGE, request: script.request, sleep: script.sleep })
  assert.equal(r?.kind, "ready")
  if (r?.kind === "ready") {
    assert.equal(r.csv, CSV_TEXT)
    assert.doesNotMatch(r.csv, /"state":\s*"computing"/)
  }
})

test("export: gives up finitely when the walk outlives maxWaitSeconds", async () => {
  const script = scriptedExport([computing202(), computing202(), computing202(), computing202()])
  const r = await fetchPayoutsExportCsv({
    range: RANGE,
    request: script.request,
    sleep: script.sleep,
    maxWaitSeconds: 12,
  })
  assert.deepEqual(r, { kind: "gave_up" })
  assert.deepEqual(script.sleeps, [5, 5]) // 3rd delay would exceed 12s → stop
})

test("export: 404 (endpoint not deployed) degrades to null, other errors propagate", async () => {
  const notDeployed = await fetchPayoutsExportCsv({
    range: RANGE,
    request: async () => {
      throw { status: 404 }
    },
    sleep: async () => {},
  })
  assert.equal(notDeployed, null)
  await assert.rejects(
    fetchPayoutsExportCsv({
      range: RANGE,
      request: async () => {
        throw { status: 500 }
      },
      sleep: async () => {},
    }),
    (err: { status?: number }) => err.status === 500,
  )
})

test("retryAfterSeconds: contract default 5, clamped [1,30], garbage-safe", () => {
  assert.equal(retryAfterSeconds("5"), 5)
  assert.equal(retryAfterSeconds(null), 5)
  assert.equal(retryAfterSeconds("abc"), 5)
  assert.equal(retryAfterSeconds("0"), 5)
  assert.equal(retryAfterSeconds("120"), 30)
  assert.equal(retryAfterSeconds("2.6"), 3)
})

test("csvFilenameFromDisposition: quoted, bare, and absent", () => {
  assert.equal(
    csvFilenameFromDisposition('attachment; filename="bizzy-payout-po_1.csv"'),
    "bizzy-payout-po_1.csv",
  )
  assert.equal(csvFilenameFromDisposition("attachment; filename=export.csv"), "export.csv")
  assert.equal(csvFilenameFromDisposition(null), null)
})

test("isCsvExportResponse: disposition or text/csv say file; JSON says not", () => {
  assert.equal(isCsvExportResponse(headersOf({ "Content-Disposition": 'attachment; filename="a.csv"' })), true)
  assert.equal(isCsvExportResponse(headersOf({ "Content-Type": "text/csv; charset=utf-8" })), true)
  assert.equal(isCsvExportResponse(headersOf({ "Content-Type": "application/json" })), false)
})

// ── (5) ?payout_id is window-bound ───────────────────────────────────────────

test("payout_id rides WITH the window params — the cache is window-keyed, the range is never dropped", () => {
  const q = payoutsQuery({ range: RANGE, payoutId: "po_1TtHLl" })
  assert.match(q, /since=2026-04-30/)
  assert.match(q, /until=2026-07-30/)
  assert.match(q, /payout_id=po_1TtHLl/)
})

test("out-of-window payout_id ⇒ READY with empty payouts — data, not computing, not an error", () => {
  const r = listResultFromBody({ ...readyListBody(), payouts: [], summary: { payout_count: 0, all_foot: true } })
  assert.equal(r.kind, "ready")
  if (r.kind === "ready") assert.deepEqual(r.response.payouts, [])
})

// ── (6) Freshness display + computing-state rulings ──────────────────────────

test("freshnessLabel renders 'Updated h:mm a (ET)' in America/New_York (EDT)", () => {
  // 18:05Z on a July date = 2:05 PM Eastern (EDT, UTC-4).
  assert.match(freshnessLabel(COMPUTED_AT) ?? "", /^Updated 2:05[\s ]PM \(ET\)$/)
})

test("freshnessLabel handles EST too (winter instant)", () => {
  // 18:05Z in January = 1:05 PM Eastern (EST, UTC-5).
  assert.match(freshnessLabel("2026-01-15T18:05:00Z") ?? "", /^Updated 1:05[\s ]PM \(ET\)$/)
})

test("freshnessLabel: null / unparseable → null (the caption simply doesn't render)", () => {
  assert.equal(freshnessLabel(null), null)
  assert.equal(freshnessLabel("not-a-date"), null)
})

test("combineFreshness: first computed_at wins; refreshing if either says so", () => {
  assert.deepEqual(
    combineFreshness({ computedAt: COMPUTED_AT, refreshing: false }, { computedAt: null, refreshing: true }),
    { computedAt: COMPUTED_AT, refreshing: true },
  )
  assert.deepEqual(
    combineFreshness({ computedAt: null, refreshing: false }, { computedAt: COMPUTED_AT, refreshing: false }),
    { computedAt: COMPUTED_AT, refreshing: false },
  )
})

test("computing cadence pins: poll inside the contract's 2–5s; PAGE give-up 10 min, clear of whale walks", () => {
  assert.ok(COMPUTING_POLL_MS >= 2000 && COMPUTING_POLL_MS <= 5000)
  assert.equal(PAGE_COMPUTING_GIVE_UP_MS, 600_000)
  // The worst observed whale (Backroads/RBS) cold walk is ~8 min — the page
  // ceiling must clear it with at least 2 minutes of margin.
  const WORST_OBSERVED_WHALE_WALK_MS = 8 * 60_000
  assert.ok(PAGE_COMPUTING_GIVE_UP_MS >= WORST_OBSERVED_WHALE_WALK_MS + 120_000)
  assert.equal(COMPUTING_PATIENCE_MS, 90_000)
  // The export button keeps the contract's own 2-minute ceiling — its give-up
  // is a soft retryable button state, not an error wall.
  assert.equal(COMPUTING_GIVE_UP_MS, 120_000)
})

test("computing copy is non-alarming and sets the 'first load can take a minute' expectation", () => {
  assert.match(COMPUTING_COPY.description, /take a minute/i)
  assert.doesNotMatch(`${COMPUTING_COPY.title} ${COMPUTING_COPY.description}`, /error|fail|wrong|problem/i)
  assert.equal(REFRESHING_LABEL, "Refreshing…")
  assert.equal(EXPORT_PREPARING_LABEL, "Preparing export…")
})

test("patient copy sets the 'few minutes' expectation and stays just as calm", () => {
  assert.match(COMPUTING_PATIENT_COPY.description, /few minutes/i)
  assert.doesNotMatch(`${COMPUTING_PATIENT_COPY.title} ${COMPUTING_PATIENT_COPY.description}`, /error|fail|wrong|problem/i)
})

// ── (7) Page poll patience rulings (payouts-computing-poll.ts) ───────────────

test("computingPhaseAt: calm under 90 s, patient at and past it", () => {
  assert.equal(computingPhaseAt(0), "calm")
  assert.equal(computingPhaseAt(COMPUTING_PATIENCE_MS - 1), "calm")
  assert.equal(computingPhaseAt(COMPUTING_PATIENCE_MS), "patient")
  assert.equal(computingPhaseAt(150_000), "patient")
})

type PollResults = [SummaryFetchResult | null, DepositsFetchResult | null]

function computingResults(): PollResults {
  return [{ kind: "computing" }, { kind: "computing" }]
}

function readyResults(): PollResults {
  return [summaryResultFromBody(readySummaryBody()), depositsResultFromBody([], headersOf(READY_HEADERS))]
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve))

/** Drive startComputingPoll with a fake clock and fake timers. The loop
 *  schedules at most one poll timer at a time; fire() runs it and flushes. */
function startPollHarness(fetchAll: () => Promise<PollResults>) {
  let clock = 0
  let nextTimerId = 1
  const events: string[] = []
  const pending: Array<{ id: number; fn: () => void; ms: number }> = []
  const cleared: number[] = []
  const cancel = startComputingPoll({
    fetchAll,
    onSettled: (s, d) => events.push(`settled:${s?.kind}/${d?.kind}`),
    onComputing: (phase) => events.push(`computing:${phase}`),
    onGiveUp: () => events.push("gave_up"),
    onError: () => events.push("error"),
    now: () => clock,
    schedule: (fn, ms) => {
      const id = nextTimerId++
      pending.push({ id, fn, ms })
      return id
    },
    unschedule: (t) => {
      cleared.push(t as number)
      const i = pending.findIndex((p) => p.id === t)
      if (i >= 0) pending.splice(i, 1)
    },
  })
  return {
    events,
    pending,
    cleared,
    cancel,
    tick: (ms: number) => {
      clock = ms
    },
    fire: async () => {
      const p = pending.shift()
      if (!p) throw new Error("no pending poll timer")
      p.fn()
      await flush()
    },
  }
}

test("page poll: calm-waiting persists PAST the old 2-minute mark — patient copy, still polling, never an error", async () => {
  const h = startPollHarness(async () => computingResults())
  await flush()
  assert.deepEqual(h.events, ["computing:calm"]) // first response: the standard crunching state
  assert.equal(h.pending[0]?.ms, COMPUTING_POLL_MS) // cadence unchanged (~4 s)

  h.tick(COMPUTING_PATIENCE_MS) // ~90 s — the copy escalation fires
  await h.fire()
  assert.equal(h.events.at(-1), "computing:patient")

  h.tick(150_000) // past the OLD 120 s give-up — the false-error this change removes
  await h.fire()
  assert.equal(h.events.at(-1), "computing:patient")

  h.tick(480_000) // 8 min — worst observed whale walk, still calmly polling
  await h.fire()
  assert.equal(h.events.at(-1), "computing:patient")
  assert.ok(!h.events.includes("gave_up") && !h.events.includes("error"))
  assert.equal(h.pending.length, 1) // the loop is still alive
  h.cancel()
})

test("page poll: error + Retry is reached only past the NEW 10-minute ceiling", async () => {
  const h = startPollHarness(async () => computingResults())
  await flush()
  h.tick(PAGE_COMPUTING_GIVE_UP_MS - 1)
  await h.fire()
  assert.equal(h.events.at(-1), "computing:patient") // one ms under: still waiting
  h.tick(PAGE_COMPUTING_GIVE_UP_MS)
  await h.fire()
  assert.equal(h.events.at(-1), "gave_up") // the genuine-failure safety net
  assert.equal(h.pending.length, 0) // polling stopped for good
})

test("page poll: a long walk that FINISHES settles into ready data, no give-up on the way", async () => {
  let calls = 0
  const h = startPollHarness(async () => (++calls < 3 ? computingResults() : readyResults()))
  await flush()
  h.tick(300_000) // 5 min in — a realistic whale walk completing
  await h.fire()
  await h.fire()
  assert.equal(h.events.at(-1), "settled:ready/ready")
  assert.ok(!h.events.includes("gave_up"))
  assert.equal(h.pending.length, 0)
})

test("page poll: cancel (window/venue change) clears the pending timer AND drops an in-flight result", async () => {
  // Pending-timer case: the cleanup must unschedule the poll.
  const a = startPollHarness(async () => computingResults())
  await flush()
  assert.equal(a.pending.length, 1)
  const timerId = a.pending[0].id
  a.cancel()
  assert.deepEqual(a.cleared, [timerId])
  assert.equal(a.pending.length, 0)

  // In-flight case: the fetch resolves AFTER cancel — nothing may land.
  let release!: (r: PollResults) => void
  const gate = new Promise<PollResults>((resolve) => {
    release = resolve
  })
  const b = startPollHarness(() => gate)
  b.cancel()
  release(computingResults())
  await flush()
  assert.deepEqual(b.events, []) // no state update, no new timer
  assert.equal(b.pending.length, 0)
})

test("page poll: a rejected fetch is an error immediately (unchanged) — but not after cancel", async () => {
  const h = startPollHarness(async () => {
    throw { status: 500 }
  })
  await flush()
  assert.deepEqual(h.events, ["error"])

  let reject!: (err: unknown) => void
  const gate = new Promise<PollResults>((_resolve, rej) => {
    reject = rej
  })
  const c = startPollHarness(() => gate)
  c.cancel()
  reject({ status: 500 })
  await flush()
  assert.deepEqual(c.events, [])
})
