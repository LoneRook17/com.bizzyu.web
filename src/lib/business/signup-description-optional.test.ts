import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

test("business signup: description is optional in UI validation", () => {
  const src = readFileSync(
    join(process.cwd(), "src/app/business/(auth)/signup/page.tsx"),
    "utf8",
  )
  assert.ok(
    !src.includes('errs.description = "Business description is required"'),
    "client must not require description",
  )
  assert.ok(src.includes("description"), "field remains on the form")
  assert.ok(
    src.includes("(optional)") || !src.includes("Business Description<span"),
    "required asterisk removed / marked optional",
  )
})
