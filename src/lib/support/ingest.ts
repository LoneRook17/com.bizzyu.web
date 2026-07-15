// Fire-and-forget ingest of a completed support-chat exchange to the Node API
// (A2's endpoint), so transcripts + classifications land in the shared DB.
//
// Contract (A2): POST {INTERNAL_API_URL}/internal/support-chat/ingest
//   header  X-Support-Chat-Secret: {SUPPORT_CHAT_INGEST_SECRET}
//   body    { external_key, audience, user_id, business_id?, messages (<=40),
//             summary, flag? (only when the conversation is flagged) }
// The endpoint upserts by external_key, so replaying the same conversation as it
// grows updates one row rather than duplicating it.
//
// This is best-effort and MUST NOT affect the user's chat: it runs after the
// stream has finished (via the platform `after()` hook) and every failure — a
// 404 while the dev services aren't deployed yet, a timeout, a 401 — is a single
// log line and nothing more. If SUPPORT_CHAT_INGEST_SECRET is unset, posting is
// skipped entirely (silent no-op) and the route behaves exactly as before.
//
// `buildIngestPayload` is a pure function so the payload shape can be asserted in
// a test without a network or an Anthropic key.
import type { SupportUser } from "./auth"
import type { Classification, Turn } from "./classify"

const MAX_INGEST_MESSAGES = 40

export type IngestFlag = {
  category: Classification["category"]
  severity: number
  reason: string
  suggested_fix: string | null
}

export type IngestPayload = {
  external_key: string
  audience: SupportUser["audience"]
  user_id: string
  business_id?: string
  messages: Turn[]
  summary: string
  flag?: IngestFlag
}

/** Build the ingest body from the exchange + (optional) classifier verdict. */
export function buildIngestPayload(args: {
  externalKey: string
  user: Pick<SupportUser, "id" | "audience" | "businessId">
  messages: Turn[]
  classification: Classification | null
}): IngestPayload {
  const { externalKey, user, messages, classification } = args
  const payload: IngestPayload = {
    external_key: externalKey,
    audience: user.audience,
    user_id: user.id,
    messages: messages.slice(-MAX_INGEST_MESSAGES),
    summary: classification?.summary ?? "",
  }
  if (user.audience === "business" && user.businessId) {
    payload.business_id = user.businessId
  }
  // `flag` is present only when the conversation is actually flagged; its
  // presence is what the DB reads as flagged=1.
  if (classification?.flag) {
    payload.flag = {
      category: classification.category,
      severity: classification.severity,
      reason: classification.reason,
      suggested_fix: classification.suggested_fix,
    }
  }
  return payload
}

/**
 * POST the payload to A2's ingest endpoint. No-op (and no log) when the secret is
 * unset. Any transport/HTTP failure is caught and logged once; never thrown.
 */
export async function postIngest(payload: IngestPayload): Promise<void> {
  const secret = process.env.SUPPORT_CHAT_INGEST_SECRET
  if (!secret) return // silent no-op — route behaves exactly as today

  const base = process.env.INTERNAL_API_URL || "http://localhost:3000"
  try {
    const res = await fetch(`${base}/internal/support-chat/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Support-Chat-Secret": secret,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      console.warn(
        JSON.stringify({
          tag: "support-chat-ingest-error",
          status: res.status,
          external_key: payload.external_key,
        }),
      )
    }
  } catch (e) {
    console.warn(
      JSON.stringify({
        tag: "support-chat-ingest-error",
        external_key: payload.external_key,
        error: String(e),
      }),
    )
  }
}
