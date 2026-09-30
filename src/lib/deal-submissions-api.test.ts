import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  TRUSTED_DEAL_SUBMISSIONS_ORIGIN,
  dealSubmissionsApiOrigin,
} from "./deal-submissions-api.ts"

test("unset or blank deal-submissions host falls back to the trusted origin", () => {
  assert.equal(dealSubmissionsApiOrigin(undefined), TRUSTED_DEAL_SUBMISSIONS_ORIGIN)
  assert.equal(dealSubmissionsApiOrigin(null), "https://bizzy-deals.com")
  assert.equal(dealSubmissionsApiOrigin(""), "https://bizzy-deals.com")
  assert.equal(dealSubmissionsApiOrigin("   "), "https://bizzy-deals.com")
})

test("an explicit DEAL_SUBMISSIONS_API_URL is used, trailing slash stripped", () => {
  assert.equal(
    dealSubmissionsApiOrigin("http://127.0.0.1:8001/"),
    "http://127.0.0.1:8001",
  )
  assert.equal(
    dealSubmissionsApiOrigin("https://bizzy-deals.com"),
    "https://bizzy-deals.com",
  )
})

test("the submissions route does not read ADMIN_API_URL", () => {
  const here = dirname(fileURLToPath(import.meta.url))
  const src = readFileSync(join(here, "../app/api/submissions/route.ts"), "utf8")
  assert.equal(src.includes("process.env.ADMIN_API_URL"), false)
  assert.equal(src.includes("dealSubmissionsApiOrigin"), true)
})
