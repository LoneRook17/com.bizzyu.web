import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import {
  DEV_LARAVEL_CHECKOUT_ORIGIN,
  PROD_LARAVEL_CHECKOUT_ORIGIN,
  checkoutOriginFromHostname,
  laravelCheckoutBaseUrl,
} from "./laravel-checkout.ts"

const ENV_KEYS = [
  "NEXT_PUBLIC_CHECKOUT_REDIRECT_BASE_URL",
  "CHECKOUT_REDIRECT_BASE_URL",
  "LARAVEL_CHECKOUT_BASE_URL",
  "VERCEL_ENV",
  "VERCEL_PROJECT_PRODUCTION_URL",
] as const

const saved: Record<string, string | undefined> = {}

function clearEnv() {
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k]
    delete process.env[k]
  }
}

afterEach(() => {
  for (const k of ENV_KEYS) {
    const v = saved[k]
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})

test("hostname: bizzyu.com → prod Laravel", () => {
  assert.equal(checkoutOriginFromHostname("bizzyu.com"), PROD_LARAVEL_CHECKOUT_ORIGIN)
  assert.equal(checkoutOriginFromHostname("www.bizzyu.com"), PROD_LARAVEL_CHECKOUT_ORIGIN)
})

test("hostname: l2gp / vercel.app → DEV Laravel", () => {
  assert.equal(
    checkoutOriginFromHostname("com-bizzyu-web-l2gp.vercel.app"),
    DEV_LARAVEL_CHECKOUT_ORIGIN,
  )
  assert.equal(checkoutOriginFromHostname("something.vercel.app"), DEV_LARAVEL_CHECKOUT_ORIGIN)
})

test("NEXT_PUBLIC wins over server-only and DEV fallback", () => {
  clearEnv()
  process.env.NEXT_PUBLIC_CHECKOUT_REDIRECT_BASE_URL = "https://bizzy-deals.com/"
  process.env.CHECKOUT_REDIRECT_BASE_URL = "https://dev.bizzy-deals.com"
  assert.equal(laravelCheckoutBaseUrl(), PROD_LARAVEL_CHECKOUT_ORIGIN)
})

test("server-only CHECKOUT_REDIRECT_BASE_URL used when public unset", () => {
  clearEnv()
  process.env.CHECKOUT_REDIRECT_BASE_URL = "https://bizzy-deals.com"
  assert.equal(laravelCheckoutBaseUrl(), PROD_LARAVEL_CHECKOUT_ORIGIN)
})

test("missing env without window falls back to DEV", () => {
  clearEnv()
  assert.equal(typeof window, "undefined")
  assert.equal(laravelCheckoutBaseUrl(), DEV_LARAVEL_CHECKOUT_ORIGIN)
})
