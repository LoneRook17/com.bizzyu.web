import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
  CATALOG_API_GAP_NOTE,
  campusPickerEmptyHint,
  comingSoonTitle,
  isValidRequestSchoolPayload,
  requestSchoolHref,
} from "./request-school.ts"

test("request-school href encodes the typed school", () => {
  assert.equal(requestSchoolHref(), "/request-school")
  assert.equal(requestSchoolHref("  "), "/request-school")
  assert.equal(
    requestSchoolHref("University of Iowa"),
    "/request-school?school=University%20of%20Iowa",
  )
})

test("coming soon title names the school instead of dumping the visitor", () => {
  assert.equal(comingSoonTitle("Iowa State University"), "Coming soon at Iowa State University")
  assert.equal(comingSoonTitle("  "), "Coming soon")
})

test("campus picker empty state points at request-school, not a dead end", () => {
  assert.match(campusPickerEmptyHint(""), /Request your school/)
  assert.match(campusPickerEmptyHint("Iowa"), /Request this school/)
  assert.ok(!campusPickerEmptyHint("Iowa").includes("\u2014"))
})

test("request payload requires a real school name and email", () => {
  assert.equal(isValidRequestSchoolPayload({}).ok, false)
  assert.equal(
    isValidRequestSchoolPayload({ name: "Sam", email: "sam@school.edu", school: "  " }).ok,
    false,
  )
  const ok = isValidRequestSchoolPayload({
    name: "Sam",
    email: "sam@school.edu",
    school: "  Iowa State  ",
  })
  assert.deepEqual(ok, {
    ok: true,
    name: "Sam",
    email: "sam@school.edu",
    school: "Iowa State",
  })
})

test("catalog write is documented as an API gap, not a web publish", () => {
  assert.match(CATALOG_API_GAP_NOTE, /university API/)
  const src = readFileSync(fileURLToPath(new URL("./request-school.ts", import.meta.url)), "utf8")
  assert.match(src, /API GAP/)
  assert.match(src, /university-list/)
  assert.ok(!src.includes("this form publishes"))
})

test("slug page and campus picker hook request-school instead of dumping", () => {
  const slug = readFileSync(fileURLToPath(new URL("../app/[slug]/page.tsx", import.meta.url)), "utf8")
  assert.match(slug, /ComingSoonCampus/)
  assert.match(slug, /fetchUniversityBySlug/)
  const combo = readFileSync(
    fileURLToPath(new URL("../components/business/v2/ui/campus-combobox.tsx", import.meta.url)),
    "utf8",
  )
  assert.match(combo, /requestSchoolHref/)
  const comingSoon = readFileSync(
    fileURLToPath(new URL("../components/campus/ComingSoonCampus.tsx", import.meta.url)),
    "utf8",
  )
  assert.match(comingSoon, /RequestSchoolForm/)
  const signup = readFileSync(
    fileURLToPath(new URL("../app/business/(auth)/signup/page.tsx", import.meta.url)),
    "utf8",
  )
  assert.match(signup, /request-school/)
})
