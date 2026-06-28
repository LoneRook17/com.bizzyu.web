const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 3000;

export type TurnstileResult =
  | { ok: true }
  | { ok: false; reason: "missing_token" | "honeypot" | "invalid" | "error" };

/**
 * Validate a Cloudflare Turnstile token + honeypot field from a public form.
 *
 * Fail-open if TURNSTILE_SECRET_KEY is not configured - logs a warning so a
 * missed env-var deploy doesn't lock real users out, but still flags it.
 */
export async function verifyTurnstile(
  token: string | undefined | null,
  honeypot: string | undefined | null,
  remoteIp?: string | null
): Promise<TurnstileResult> {
  if (honeypot) {
    return { ok: false, reason: "honeypot" };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    console.warn("[turnstile] TURNSTILE_SECRET_KEY not set, failing open");
    return { ok: true };
  }

  if (!token) {
    return { ok: false, reason: "missing_token" };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      signal: controller.signal,
    });
    const data: { success: boolean; "error-codes"?: string[] } = await res.json();
    if (data.success) return { ok: true };
    console.warn("[turnstile] verification failed", data["error-codes"]);
    return { ok: false, reason: "invalid" };
  } catch (err) {
    console.error("[turnstile] verification error, failing open", err);
    return { ok: true };
  } finally {
    clearTimeout(timeout);
  }
}

export function getClientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}
