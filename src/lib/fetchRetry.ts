/**
 * fetch, retried, that THROWS instead of degrading to a null result.
 *
 * The V1 deals API fails intermittently under no particular load: a sequential
 * sweep of 34 schools produced 8 failures while the same sweep in parallel
 * produced none, so it is flakiness rather than throttling and no call pattern
 * avoids it.
 *
 * That matters because callers used to swallow the error and return [], which
 * makes "the API blipped" and "this school has no deals" the same value. Any
 * gate downstream then reads a blip as an empty campus and drops the page.
 *
 * So: retry a few times, and if it still fails, throw. An exception is
 * recoverable information; a silent [] is not.
 */
export async function fetchRetry(
  input: string,
  init: RequestInit & { next?: { revalidate?: number } } = {},
  attempts = 3,
): Promise<Response> {
  let lastErr: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(input, init);
      // 5xx and 429 are worth another go; a 404 or 400 will never change.
      if (res.ok) return res;
      if (res.status < 500 && res.status !== 429) {
        throw new Error(`${input} -> HTTP ${res.status}`);
      }
      lastErr = new Error(`${input} -> HTTP ${res.status}`);
    } catch (err) {
      lastErr = err;
    }

    // 250ms, 500ms. Short: this runs inside a build and a page render.
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, 250 * 2 ** i));
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/**
 * fetchRetry, plus "the body is actually JSON" as a retry condition.
 *
 * The V1 API's flaky mode is not only 5xx: it also answers HTTP 200 with an
 * HTML error page. res.ok is true, so fetchRetry hands it back happily and the
 * caller's .json() throws a SyntaxError on the first byte, past the point where
 * a retry could help. Observed live while building this, not hypothetical.
 *
 * Treating an unparseable body as retryable turns that from a hard failure into
 * the blip it actually is.
 */
export async function fetchJSONRetry<T = unknown>(
  input: string,
  init: RequestInit & { next?: { revalidate?: number } } = {},
  attempts = 3,
): Promise<T> {
  let lastErr: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      // attempts:1 — this function owns the retry loop, so the inner call must
      // not multiply it (3 x 3 = 9 requests per fetch).
      const res = await fetchRetry(input, init, 1);
      const body = await res.text();
      try {
        return JSON.parse(body) as T;
      } catch {
        throw new Error(
          `${input} -> 200 but body is not JSON (starts: ${body.slice(0, 40).replace(/\s+/g, " ")})`,
        );
      }
    } catch (err) {
      lastErr = err;
    }
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, 250 * 2 ** i));
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
