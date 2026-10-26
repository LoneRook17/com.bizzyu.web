/**
 * Server-side proxy for Google Places (autocomplete + details), used by the
 * business dashboard address pickers (EventForm / AddressAutocomplete).
 *
 * Audit W7 A01: both routes are public GETs that forward GOOGLE_PLACES_API_KEY
 * server-side, so without a limiter one script could burn the Google quota
 * (and the bill) from a single laptop. This module adds:
 *   • a per-IP rate limit (burst + daily) → 429
 *   • input-length / place_id-shape validation → 400
 *   • a short in-memory cache keyed by normalized input / place_id, so a
 *     typing burst, a retype, or a double-mounted form does not hit Google
 *     twice for the same thing
 *   • no logging of the key or of the full upstream URL (which carries it)
 *
 * Limiter and cache are per serverless instance (same caveat as
 * lib/ratelimit.ts). Prod should ALSO cap the key in GCP — a daily quota on
 * the Places API, plus an API restriction to Places only; HTTP-referrer
 * restrictions do not apply to a server-side call, so use IP restrictions
 * only if Vercel egress IPs are pinned. If abuse shows up, move the limiter
 * to Upstash or a Vercel WAF rate rule without changing the routes.
 */
import { createRateLimiter, type RateLimitOptions } from "../ratelimit.ts"

export const AUTOCOMPLETE_MIN_INPUT = 3
export const AUTOCOMPLETE_MAX_INPUT = 120
/**
 * Google place ids are URL-safe tokens (`ChIJ…`, `GhIJ…`, `Ei…`): letters,
 * digits, `-` and `_`. No documented maximum, real ones are well under 300
 * characters, so 400 is a generous ceiling that still rejects garbage.
 */
export const PLACE_ID_RE = /^[A-Za-z0-9_-]{10,400}$/

export interface Prediction {
  description: string
  place_id: string
}
export interface LatLng {
  lat: number | null
  lng: number | null
}
export type AutocompleteBody = { predictions: Prediction[] } | { error: string }
export type DetailsBody = LatLng | { error: string }
export interface ProxyResult<B> {
  status: 200 | 400 | 429
  body: B
}

export interface PlacesProxyOptions {
  fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>
  getApiKey?: () => string | undefined
  now?: () => number
  cacheTtlMs?: number
  cacheMax?: number
  limits?: { autocomplete?: RateLimitOptions; details?: RateLimitOptions }
  log?: Pick<Console, "warn">
}

export const DEFAULT_LIMITS: { autocomplete: RateLimitOptions; details: RateLimitOptions } = {
  // A person typing an address behind the form's 400 ms debounce fires maybe
  // 10-20 autocomplete calls per address; 60/min leaves room for retyping and
  // for a few people behind one NAT. 1 500/day is ~100 addresses per IP.
  autocomplete: { burstWindowMs: 60_000, burstMax: 60, dailyMax: 1500 },
  // One details call per picked prediction.
  details: { burstWindowMs: 60_000, burstMax: 20, dailyMax: 300 },
}

export const RATE_LIMITED_ERROR = "Too many requests. Please slow down and try again."
export const INPUT_TOO_LONG_ERROR = `Input must be ${AUTOCOMPLETE_MAX_INPUT} characters or fewer.`
export const INVALID_PLACE_ID_ERROR = "Invalid place_id."

export function normalizeAutocompleteInput(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\s+/g, " ").trim()
}

export function isValidPlaceId(raw: string | null | undefined): raw is string {
  return typeof raw === "string" && PLACE_ID_RE.test(raw)
}

function createTtlCache<V>(ttlMs: number, max: number, now: () => number) {
  const map = new Map<string, { at: number; value: V }>()
  return {
    get(key: string): V | undefined {
      const hit = map.get(key)
      if (!hit) return undefined
      if (now() - hit.at >= ttlMs) {
        map.delete(key)
        return undefined
      }
      return hit.value
    },
    set(key: string, value: V): void {
      if (map.size >= max) {
        // Map iterates in insertion order: evict the oldest entry.
        const oldest = map.keys().next().value
        if (oldest !== undefined) map.delete(oldest)
      }
      map.set(key, { at: now(), value })
    },
    get size() {
      return map.size
    },
  }
}

const AUTOCOMPLETE_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
const DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"

export function createPlacesProxy(opts: PlacesProxyOptions = {}) {
  const fetchImpl = opts.fetchImpl ?? ((url: string, init?: RequestInit) => fetch(url, init))
  const getApiKey = opts.getApiKey ?? (() => process.env.GOOGLE_PLACES_API_KEY)
  const now = opts.now ?? Date.now
  const log = opts.log ?? console
  const autocompleteLimit = createRateLimiter(opts.limits?.autocomplete ?? DEFAULT_LIMITS.autocomplete)
  const detailsLimit = createRateLimiter(opts.limits?.details ?? DEFAULT_LIMITS.details)
  const ttl = opts.cacheTtlMs ?? 60_000
  const cacheMax = opts.cacheMax ?? 500
  const autocompleteCache = createTtlCache<Prediction[]>(ttl, cacheMax, now)
  const detailsCache = createTtlCache<LatLng>(ttl, cacheMax, now)

  /**
   * Fetch one upstream JSON document. Returns null on any failure. Logs the
   * HTTP status or Google's `status` string only — never the URL (it carries
   * the key) and never the body.
   */
  async function fetchUpstream(url: string): Promise<Record<string, unknown> | null> {
    try {
      const res = await fetchImpl(url, { headers: { Accept: "application/json" } })
      if (!res.ok) {
        log.warn("[places] upstream HTTP status", res.status)
        return null
      }
      const data = (await res.json()) as Record<string, unknown>
      const status = typeof data?.status === "string" ? data.status : ""
      if (status && status !== "OK" && status !== "ZERO_RESULTS") {
        log.warn("[places] upstream status", status)
        return null
      }
      return data
    } catch {
      log.warn("[places] upstream request failed")
      return null
    }
  }

  return {
    async autocomplete(
      rawInput: string | null | undefined,
      ip: string | null | undefined,
    ): Promise<ProxyResult<AutocompleteBody>> {
      const input = normalizeAutocompleteInput(rawInput)
      if (input.length > AUTOCOMPLETE_MAX_INPUT) {
        return { status: 400, body: { error: INPUT_TOO_LONG_ERROR } }
      }
      // Short input never reaches Google, so it does not count against the limit.
      if (input.length < AUTOCOMPLETE_MIN_INPUT) {
        return { status: 200, body: { predictions: [] } }
      }
      if (!autocompleteLimit(ip || "unknown").ok) {
        return { status: 429, body: { error: RATE_LIMITED_ERROR } }
      }
      const apiKey = getApiKey()
      if (!apiKey) return { status: 200, body: { predictions: [] } }

      const cacheKey = input.toLowerCase()
      const cached = autocompleteCache.get(cacheKey)
      if (cached) return { status: 200, body: { predictions: cached } }

      const url = `${AUTOCOMPLETE_URL}?input=${encodeURIComponent(input)}&key=${encodeURIComponent(apiKey)}`
      const data = await fetchUpstream(url)
      const raw = Array.isArray(data?.predictions) ? (data!.predictions as unknown[]) : []
      const predictions: Prediction[] = raw.map((p) => {
        const o = (p ?? {}) as Record<string, unknown>
        return {
          description: typeof o.description === "string" ? o.description : "",
          place_id: typeof o.place_id === "string" ? o.place_id : "",
        }
      })
      // Only a successful upstream answer (including ZERO_RESULTS) is cached;
      // an outage must not pin an empty list for a minute.
      if (data) autocompleteCache.set(cacheKey, predictions)
      return { status: 200, body: { predictions } }
    },

    async details(
      rawPlaceId: string | null | undefined,
      ip: string | null | undefined,
    ): Promise<ProxyResult<DetailsBody>> {
      // Unchanged contract for a missing id: the picker treats nulls as "no fix".
      if (!rawPlaceId) return { status: 200, body: { lat: null, lng: null } }
      if (!isValidPlaceId(rawPlaceId)) {
        return { status: 400, body: { error: INVALID_PLACE_ID_ERROR } }
      }
      if (!detailsLimit(ip || "unknown").ok) {
        return { status: 429, body: { error: RATE_LIMITED_ERROR } }
      }
      const apiKey = getApiKey()
      if (!apiKey) return { status: 200, body: { lat: null, lng: null } }

      const cached = detailsCache.get(rawPlaceId)
      if (cached) return { status: 200, body: cached }

      const url = `${DETAILS_URL}?place_id=${encodeURIComponent(rawPlaceId)}&fields=geometry&key=${encodeURIComponent(apiKey)}`
      const data = await fetchUpstream(url)
      const result = (data?.result ?? null) as { geometry?: { location?: { lat?: unknown; lng?: unknown } } } | null
      const loc = result?.geometry?.location
      const body: LatLng = {
        lat: typeof loc?.lat === "number" ? loc.lat : null,
        lng: typeof loc?.lng === "number" ? loc.lng : null,
      }
      if (data) detailsCache.set(rawPlaceId, body)
      return { status: 200, body }
    },

    /** Test/diagnostic hook: how many entries each cache currently holds. */
    cacheSizes(): { autocomplete: number; details: number } {
      return { autocomplete: autocompleteCache.size, details: detailsCache.size }
    },
  }
}

export type PlacesProxy = ReturnType<typeof createPlacesProxy>

let defaultProxy: PlacesProxy | null = null
/** Module-level instance shared by the two route handlers (per serverless instance). */
export function getPlacesProxy(): PlacesProxy {
  if (!defaultProxy) defaultProxy = createPlacesProxy()
  return defaultProxy
}
