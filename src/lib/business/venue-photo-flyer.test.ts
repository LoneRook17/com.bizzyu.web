import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { artworkTemplateForSave, resolvedCreateFlyerUrl } from "./venue-photo-flyer.ts"

test("own flyer wins over the venue photo", () => {
  assert.equal(
    resolvedCreateFlyerUrl("https://cdn/own.jpg", "https://cdn/venue.jpg"),
    "https://cdn/own.jpg",
  )
})

test("empty flyer uses the venue record photo URL", () => {
  assert.equal(resolvedCreateFlyerUrl("", "https://cdn/venue.jpg"), "https://cdn/venue.jpg")
  assert.equal(resolvedCreateFlyerUrl("   ", "https://cdn/venue.jpg"), "https://cdn/venue.jpg")
  assert.equal(resolvedCreateFlyerUrl(null, "https://cdn/venue.jpg"), "https://cdn/venue.jpg")
})

test("no flyer and no venue photo stays empty — never invent Classic", () => {
  assert.equal(resolvedCreateFlyerUrl("", ""), "")
  assert.equal(resolvedCreateFlyerUrl(null, null), "")
})

test("create never sends a Classic template default", () => {
  assert.equal(
    artworkTemplateForSave({
      uploadedFlyer: "",
      venuePhoto: "",
      explicitTemplate: null,
      isEditing: false,
    }),
    null,
  )
  assert.equal(
    artworkTemplateForSave({
      uploadedFlyer: "",
      venuePhoto: "https://cdn/venue.jpg",
      explicitTemplate: "classic",
      isEditing: false,
    }),
    null,
  )
})

test("edit can send a non-Classic template only when there is no photo", () => {
  assert.equal(
    artworkTemplateForSave({
      uploadedFlyer: "",
      venuePhoto: "",
      explicitTemplate: "night",
      isEditing: true,
    }),
    "night",
  )
  assert.equal(
    artworkTemplateForSave({
      uploadedFlyer: "",
      venuePhoto: "https://cdn/venue.jpg",
      explicitTemplate: "night",
      isEditing: true,
    }),
    null,
  )
  assert.equal(
    artworkTemplateForSave({
      uploadedFlyer: "",
      venuePhoto: "",
      explicitTemplate: "classic",
      isEditing: true,
    }),
    null,
  )
})

test("one-off create hides the template picker and defaults to the venue photo", () => {
  const eventForm = readFileSync(join(process.cwd(), "src/components/business/v2/events/EventForm.tsx"), "utf8")
  const artwork = readFileSync(join(process.cwd(), "src/components/business/v2/events/ArtworkSection.tsx"), "utf8")
  assert.ok(eventForm.includes("showTemplatePicker={isEditing}"), "create still hides the flyer template picker")
  assert.ok(eventForm.includes("resolvedCreateFlyerUrl"), "create persists the venue photo when they skip a flyer")
  assert.ok(eventForm.includes("artworkTemplateForSave"), "Classic is not auto-sent")
  assert.ok(!eventForm.includes("DEFAULT_ARTWORK_TEMPLATE"), "create/edit must not fall back to Classic")
  assert.ok(!eventForm.includes("we use Classic"), "create copy must not promise Classic")
  assert.ok(eventForm.includes("venue photo"), "create copy names the venue photo")
  assert.ok(artwork.includes("venuePhotoUrl"), "empty-state preview is the venue photo")
  assert.ok(artwork.includes("fallbackSrc"), "ImageUpload shows the venue photo until they add a flyer")
  assert.ok(!artwork.includes("we use Classic"), "artwork empty-state is not Classic")
  assert.ok(artwork.includes('showTemplatePicker = false'), "create default is no template picker")
})

test("green RC create has one photo step and promo codes stay on the remaining flow", () => {
  const wizard = readFileSync(
    join(process.cwd(), "src/components/business/v2/recurring/RecurringEventWizard.tsx"),
    "utf8",
  )
  const eventForm = readFileSync(join(process.cwd(), "src/components/business/v2/events/EventForm.tsx"), "utf8")
  assert.ok(!wizard.includes("ImageUpload"), "second RC photo-add screen is gone")
  assert.ok(eventForm.includes("ArtworkSection"), "the remaining photo step stays on Event details")
  assert.ok(wizard.includes("WcPromoCodesDraft"), "promo codes stay on the Promoter step, not the deleted flyer screen")
  assert.ok(wizard.includes("persistSeriesPromoDrafts"), "Publish posts series promo drafts after create")
  assert.ok(wizard.includes("resolvedCreateFlyerUrl"), "RC publish uses the venue photo when they skip a flyer")
  assert.ok(wizard.includes("promoterExtrasVisible"), "promoter extras still follow the Promoter toggle")
  assert.ok(eventForm.includes("RepeatsOnDays"), "Repeats on chips stay on the When card")
})
