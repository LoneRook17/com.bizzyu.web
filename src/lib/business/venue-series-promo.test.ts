import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
  SERIES_SECTION_DESCRIPTION,
  SERIES_SECTION_EMPTY_DESCRIPTION,
  SERIES_SECTION_EMPTY_TITLE,
  SERIES_SECTION_TITLE,
  isMissingSeriesPromoEndpoint,
  parseVenueSeriesPromoResponse,
  seriesKindChip,
  seriesPromoBasePath,
  seriesPromoListPath,
  seriesPromoManageHref,
} from "./venue-series-promo.ts"

const EM = "\u2014"
const EN = "\u2013"

function read(rel: string) {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8")
}

test("series section copy names WC vs named RC and not the whole venue", () => {
  assert.equal(SERIES_SECTION_TITLE, "Series codes")
  assert.match(SERIES_SECTION_DESCRIPTION, /Weekly Cover or named recurring event/)
  assert.match(SERIES_SECTION_DESCRIPTION, /not the whole venue/)
  assert.equal(SERIES_SECTION_EMPTY_TITLE, "No series codes yet")
  assert.match(SERIES_SECTION_EMPTY_DESCRIPTION, /never mix into the Universal list/)
  for (const s of [
    SERIES_SECTION_TITLE,
    SERIES_SECTION_DESCRIPTION,
    SERIES_SECTION_EMPTY_TITLE,
    SERIES_SECTION_EMPTY_DESCRIPTION,
  ]) {
    assert.ok(!s.includes(EM), `em dash in ${JSON.stringify(s)}`)
    assert.ok(!s.includes(EN), `en dash in ${JSON.stringify(s)}`)
  }
})

test("sibling path stays under venues and is not the Universal list", () => {
  assert.equal(seriesPromoListPath(12), "/business/venues/12/promo-codes/series")
  assert.equal(seriesPromoBasePath("weekly_cover", 44), "/business/door-access/44/promo-codes")
  assert.notEqual(seriesPromoListPath(12), "/business/venues/12/promo-codes")
})

test("series promo REST root routes by product_kind: RC never hits door-access", () => {
  // WC programs are served by door-access; named RC series by
  // /business/recurring-series (services businessRecurringSeries.ts).
  // Door-access resolution rejects non-door_access kinds, so sending an RC
  // group there silently empty-lists and 404s CRUD.
  assert.equal(seriesPromoBasePath("weekly_cover", 44), "/business/door-access/44/promo-codes")
  assert.equal(seriesPromoBasePath("event", 9), "/business/recurring-series/9/promo-codes")
})

test("WC vs green chips and manage hrefs", () => {
  const wc = seriesKindChip("weekly_cover")
  assert.equal(wc.kind, "access")
  assert.equal(wc.label, "WEEKLY COVER")
  assert.equal(seriesPromoManageHref("weekly_cover", 23), "/business/door-access/23")

  const green = seriesKindChip("event")
  assert.equal(green.kind, "event")
  assert.equal(green.label, "EVENT")
  assert.equal(seriesPromoManageHref("event", 9), "/business/recurring/9")
})

test("missing sibling (400/404/405) is empty, not an error wall", () => {
  assert.equal(isMissingSeriesPromoEndpoint(400), true)
  assert.equal(isMissingSeriesPromoEndpoint(404), true)
  assert.equal(isMissingSeriesPromoEndpoint(405), true)
  assert.equal(isMissingSeriesPromoEndpoint(401), false)
  assert.equal(isMissingSeriesPromoEndpoint(500), false)
})

test("parseVenueSeriesPromoResponse groups by series and reads product_kind", () => {
  const groups = parseVenueSeriesPromoResponse({
    series: [
      {
        id: 23,
        name: "The Dungeon",
        product_kind: "weekly_cover",
        promo_codes: [{ promo_code_id: 1, code: "COVER10" }],
      },
      {
        recurring_series_id: 9,
        name: "Thursday Nights",
        product_kind: "event",
        codes: [{ promo_code_id: 2, code: "THURS" }],
      },
    ],
  })
  assert.equal(groups.length, 2)
  assert.equal(groups[0].id, 23)
  assert.equal(groups[0].product_kind, "weekly_cover")
  assert.equal(groups[0].promo_codes[0].code, "COVER10")
  assert.equal(groups[1].id, 9)
  assert.equal(groups[1].product_kind, "event")
  assert.equal(groups[1].promo_codes[0].code, "THURS")
})

test("parse treats a live-not-yet / breakdown body as empty", () => {
  assert.deepEqual(parseVenueSeriesPromoResponse(null), [])
  assert.deepEqual(parseVenueSeriesPromoResponse({ message: "Invalid venue or promo code ID" }), [])
  assert.deepEqual(parseVenueSeriesPromoResponse({ series: [] }), [])
})

test("product_kind=event outranks a stale access_kind", () => {
  const [row] = parseVenueSeriesPromoResponse({
    series: [{ id: 4, name: "Green RC", product_kind: "event", access_kind: "door_access" }],
  })
  assert.equal(row.product_kind, "event")
})

test("venue promo page keeps Universal fetch separate and mounts Series under it", () => {
  const page = read("../../app/business/(dashboard)/promo-codes/page.tsx")
  assert.ok(page.includes("VENUE_PROMO_COPY"))
  assert.ok(page.includes("`/business/venues/${selectedVenueId}/promo-codes`"))
  assert.ok(!page.includes("`/business/venues/${selectedVenueId}/promo-codes/series`"), "Universal panel must not hit the series sibling")
  assert.ok(page.includes("SeriesPromoCodesSection"))
  assert.ok(page.includes("flex flex-col gap-10"), "Series sits under the venue block, not inside it")
})

test("series section fetches the sibling and reuses PromoCodesPanel with series copy", () => {
  const section = read("../../components/business/v2/promo/SeriesPromoCodesSection.tsx")
  assert.ok(section.includes("seriesPromoListPath"))
  assert.ok(section.includes("SERIES_PROMO_COPY"))
  assert.ok(section.includes("PromoCodesPanel"))
  assert.ok(section.includes("isMissingSeriesPromoEndpoint"))
  assert.ok(!section.includes("VENUE_PROMO_COPY"), "series panel must not leak venue copy")
  assert.ok(section.includes("SERIES_SECTION_DESCRIPTION"))
  assert.ok(section.includes("seriesKindChip"))
})

test("PromoCodesPanel series copy does not say every event at this venue", () => {
  const panel = read("../../components/business/v2/promo/PromoCodesPanel.tsx")
  assert.ok(panel.includes("export const SERIES_PROMO_COPY"))
  assert.match(panel, /every night of \$\{seriesName\}/)
  assert.match(panel, /not the whole venue/)
  const seriesFn = panel.slice(panel.indexOf("export const SERIES_PROMO_COPY"))
  const body = seriesFn.slice(0, seriesFn.indexOf("export function PromoCodesPanel"))
  assert.ok(!body.includes("every event at"), "series copy must not reuse venue reach")
  assert.ok(panel.includes("providedCodes"), "seed from the grouped sibling so a missing door-access GET still shows rows")
})

test("event manage promo page can list series codes with a Series tag", () => {
  const page = read("../../app/business/(dashboard)/events/[id]/manage/promo-codes/page.tsx")
  assert.ok(page.includes("series_promo_codes"))
  assert.ok(page.includes(">Series<") || page.includes('"Series"'))
})
