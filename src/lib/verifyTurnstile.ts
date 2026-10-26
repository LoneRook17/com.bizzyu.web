const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 3000;

export type TurnstileFailure = "missing_token" | "honeypot" | "invalid" | "error" | "misconfigured";
export type TurnstileResult = { ok: true } | { ok: false; reason: TurnstileFailure };

export interface TurnstileOptions {
  /** Injected for tests; defaults to global fetch. */
  fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>;
  /** Injected for tests; defaults to process.env. */
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
  log?: Pick<Console, "warn" | "error">;
}

/**
 * Whether a missing TURNSTILE_SECRET_KEY may let submissions through.
 *
 * Audit W7 A02: production and preview deployments fail CLOSED. The only two
 * ways to fail open are an explicit opt-in for local development
 * (`TURNSTILE_FAIL_OPEN=1`, default off, document it in .env.example) or the
 * unit-test environment (`NODE_ENV=test`). A missed env-var deploy therefore
 * shows up as "Verification failed" on the form plus a server-side error log,
 * not as a silently unprotected form.
 */
export function turnstileFailOpenAllowed(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV === "test" || env.TURNSTILE_FAIL_OPEN === "1";
}

/**
 * Validate a Cloudflare Turnstile token + honeypot field from a public form.
 *
 * Order: honeypot → secret configured → token present → siteverify. Every
 * failure mode of the verify call itself (timeout, network error, non-2xx,
 * unparsable JSON) is a refusal (`reason: "error"`), never a pass.
 */
export async function verifyTurnstile(
  token: string | undefined | null,
  honeypot: string | undefined | null,
  remoteIp?: string | null,
  opts: TurnstileOptions = {}
): Promise<TurnstileResult> {
  const env = opts.env ?? process.env;
  const log = opts.log ?? console;
  const fetchImpl = opts.fetchImpl ?? ((url: string, init?: RequestInit) => fetch(url, init));

  if (honeypot) {
    return { ok: false, reason: "honeypot" };
  }

  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    if (turnstileFailOpenAllowed(env)) {
      log.warn("[turnstile] TURNSTILE_SECRET_KEY not set; failing OPEN (NODE_ENV=test or TURNSTILE_FAIL_OPEN=1)");
      return { ok: true };
    }
    log.error("[turnstile] TURNSTILE_SECRET_KEY not set; refusing submission (fail closed)");
    return { ok: false, reason: "misconfigured" };
  }

  if (!token) {
    return { ok: false, reason: "missing_token" };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? TIMEOUT_MS);

  try {
    const res = await fetchImpl(VERIFY_URL, {
      method: "POST",
      body,
      signal: controller.signal,
    });
    if (!res.ok) {
      log.error("[turnstile] siteverify HTTP status", res.status, "- failing closed");
      return { ok: false, reason: "error" };
    }
    const data = (await res.json()) as { success?: unknown; "error-codes"?: unknown };
    if (data?.success === true) return { ok: true };
    log.warn("[turnstile] verification failed", data?.["error-codes"]);
    return { ok: false, reason: "invalid" };
  } catch (err) {
    log.error("[turnstile] verification error - failing closed", err);
    return { ok: false, reason: "error" };
  } finally {
    clearTimeout(timeout);
  }
}

export function getClientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}
