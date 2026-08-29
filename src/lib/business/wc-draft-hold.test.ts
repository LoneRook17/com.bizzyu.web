import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  WC_DRAFT_CHIP_LABEL,
  WC_DRAFT_CREATED_COPY,
  WC_DRAFT_REVIEW_BANNER,
  WC_DRAFT_WAITING_COPY,
  draftNightEventIds,
  isWeeklyCoverHoldStatus,
  queuedWeeklyCoverNightEventIds,
  weeklyCoverHoldChip,
} from "./wc-draft-hold.ts"

test("unapproved WC hold is draft, including leftover pending_approval", () => {
  assert.equal(isWeeklyCoverHoldStatus("draft"), true)
  assert.equal(isWeeklyCoverHoldStatus("pending_approval"), true)
  assert.equal(isWeeklyCoverHoldStatus("published"), false)
  assert.equal(isWeeklyCoverHoldStatus("pending_review"), false)
  assert.deepEqual(weeklyCoverHoldChip(), { label: "Draft", variant: "neutral" })
  assert.equal(WC_DRAFT_CHIP_LABEL, "Draft")
})

test("draft / waiting copy never says In review, manual review, or live and selling", () => {
  for (const line of [WC_DRAFT_REVIEW_BANNER, WC_DRAFT_CREATED_COPY, WC_DRAFT_WAITING_COPY]) {
    assert.ok(/draft/i.test(line), line)
    assert.ok(!/in review/i.test(line), line)
    assert.ok(!/manual review/i.test(line), line)
    assert.ok(!/live and selling/i.test(line), line)
    assert.ok(!/approve this event/i.test(line), line)
    assert.ok(!line.includes("\u2014") && !line.includes("\u2013"), line)
  }
  assert.ok(/business/i.test(WC_DRAFT_REVIEW_BANNER))
  assert.ok(/waiting on business approval/i.test(WC_DRAFT_WAITING_COPY))
})

test("D3 publishes draft nights and leftover pending_approval", () => {
  const nights = [
    { event_id: 20, status: "pending_approval" },
    { event_id: 21, status: "draft" },
    { event_id: 22, status: "published" },
    { event_id: 23, status: null },
    { event_id: null, status: "draft" },
  ]
  assert.deepEqual(draftNightEventIds(nights), [21])
  assert.deepEqual(queuedWeeklyCoverNightEventIds(nights), [20, 21])
})

test("WC dash surfaces use draft hold copy, not In review", () => {
  const files = [
    "src/components/business/v2/door-access/DoorAccessWizard.tsx",
    "src/components/business/v2/door-access/AccessProgramRow.tsx",
    "src/app/business/(dashboard)/door-access/[id]/page.tsx",
    "src/app/business/(dashboard)/door-access/[id]/nights/[date]/page.tsx",
    "src/components/business/v2/events/EventCard.tsx",
    "src/app/business/(dashboard)/events/[id]/page.tsx",
  ]
  for (const rel of files) {
    const src = readFileSync(join(process.cwd(), rel), "utf8")
    assert.ok(!src.includes("In review"), `${rel} still chips In review`)
    assert.ok(!/manual review/i.test(src), `${rel} still says manual review`)
    assert.ok(!/approve this event/i.test(src), `${rel} still has a per-event approve form`)
  }
  const detail = readFileSync(
    join(process.cwd(), "src/app/business/(dashboard)/events/[id]/page.tsx"),
    "utf8",
  )
  assert.ok(
    detail.includes("!isWeeklyCoverProduct(event)"),
    "WC nights must not show the named-event draft/publish card",
  )
})
