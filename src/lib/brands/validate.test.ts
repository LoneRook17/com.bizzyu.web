import { test } from "node:test"
import assert from "node:assert/strict"
import { normalizeUrl, validateBrandApplication } from "./validate.ts"

const good = {
  companyName: "DoorDash",
  website: "doordash.com",
  contactName: "Sam Rivera",
  workEmail: "Sam@DoorDash.com",
  title: "Partnerships Manager",
  offerName: "DashPass for Students",
  offerDescription: "Half-price DashPass for verified students.",
  qualifies: "all",
  verification: "sheerid",
  landingUrl: "https://www.doordash.com/students",
  hasAffiliateProgram: "yes",
  affiliateNetwork: "impact",
  partnerTierInterest: true,
  attribution: { utmSource: "outreach", utmCampaign: "sep-2026", referrer: "https://mail.google.com/" },
}

test("normalizeUrl accepts bare domains and rejects junk", () => {
  assert.equal(normalizeUrl("doordash.com"), "https://doordash.com/")
  assert.equal(normalizeUrl("www.spotify.com/student"), "https://www.spotify.com/student")
  assert.equal(normalizeUrl("http://brand.co/x?y=1"), "http://brand.co/x?y=1")
  assert.equal(normalizeUrl("not a url"), null)
  assert.equal(normalizeUrl("localhost"), null)
  assert.equal(normalizeUrl("javascript:alert(1)"), null)
  assert.equal(normalizeUrl("ftp://brand.com"), null)
})

test("a complete application validates and is normalized", () => {
  const r = validateBrandApplication(good)
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.equal(r.data.website, "https://doordash.com/")
  assert.equal(r.data.workEmail, "sam@doordash.com")
  assert.equal(r.data.affiliateNetwork, "impact")
  assert.equal(r.data.partnerTierInterest, true)
  assert.equal(r.data.attribution.utmSource, "outreach")
  assert.equal(r.data.attribution.utmMedium, "")
})

test("required fields, formats and enums are enforced", () => {
  const r = validateBrandApplication({
    ...good,
    companyName: "  ",
    workEmail: "not-an-email",
    landingUrl: "claim here",
    qualifies: "everyone",
    verification: "magic",
    hasAffiliateProgram: "maybe",
  })
  assert.equal(r.ok, false)
  if (r.ok) return
  assert.ok(r.errors.companyName)
  assert.ok(r.errors.workEmail)
  assert.ok(r.errors.landingUrl)
  assert.ok(r.errors.qualifies)
  assert.ok(r.errors.verification)
  assert.ok(r.errors.hasAffiliateProgram)
  assert.equal(r.errors.title, undefined)
})

test("conditional fields only bite when their parent says so", () => {
  const noNetwork = validateBrandApplication({ ...good, affiliateNetwork: "" })
  assert.equal(noNetwork.ok, false)
  if (!noNetwork.ok) assert.ok(noNetwork.errors.affiliateNetwork)

  const noProgram = validateBrandApplication({ ...good, hasAffiliateProgram: "no", affiliateNetwork: "" })
  assert.equal(noProgram.ok, true)
  if (noProgram.ok) assert.equal(noProgram.data.affiliateNetwork, "")

  const schools = validateBrandApplication({ ...good, qualifies: "specific_schools", qualifiesDetail: "" })
  assert.equal(schools.ok, false)
  if (!schools.ok) assert.ok(schools.errors.qualifiesDetail)
})

test("length limits hold and attribution is clipped, never rejected", () => {
  const r = validateBrandApplication({ ...good, offerName: "x".repeat(81) })
  assert.equal(r.ok, false)
  if (!r.ok) assert.match(r.errors.offerName ?? "", /80 characters/)

  const clipped = validateBrandApplication({
    ...good,
    attribution: { utmSource: "s".repeat(500), referrer: 42 },
  })
  assert.equal(clipped.ok, true)
  if (clipped.ok) {
    assert.equal(clipped.data.attribution.utmSource.length, 200)
    assert.equal(clipped.data.attribution.referrer, "")
  }
})

test("garbage input does not throw", () => {
  assert.equal(validateBrandApplication(null).ok, false)
  assert.equal(validateBrandApplication("nope").ok, false)
  assert.equal(validateBrandApplication({ attribution: "x", partnerTierInterest: "yes" }).ok, false)
})
