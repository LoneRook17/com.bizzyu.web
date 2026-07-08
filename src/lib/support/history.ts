// Device-local support-chat history (client-only). Persists the messages array
// to localStorage so a swiped-out / closed chat reopens where it left off.
//
// Keyed per audience + a hash of the caller's stable identifier (the student's
// token, or the business user id). We store ONLY the SHA-256 hash of that
// identifier — never the raw auth token — so the storage key can't be turned
// back into a credential. The server stays stateless; this is purely a local
// convenience.

export type StoredMsg = { role: "user" | "assistant"; content: string }

const PREFIX = "bizzy_support_chat:v1"
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
// Cap stored turns; matches the server's MAX_TURNS so we never persist more
// than a conversation is allowed to carry.
export const HISTORY_CAP = 40

// Tiny non-crypto fallback for the (unlikely) case SubtleCrypto is unavailable
// — still one-way, still never the raw token.
function djb2(input: string): string {
  let h = 5381
  for (let i = 0; i < input.length; i++) h = (h * 33) ^ input.charCodeAt(i)
  return (h >>> 0).toString(16)
}

/** Build the localStorage key from the audience + a one-way hash of the seed. */
export async function historyKey(audience: string, seed: string): Promise<string> {
  const material = `${audience}:${seed}`
  let hash: string
  try {
    const data = new TextEncoder().encode(material)
    const digest = await crypto.subtle.digest("SHA-256", data)
    hash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 32)
  } catch {
    hash = djb2(material)
  }
  return `${PREFIX}:${audience}:${hash}`
}

function isMsg(m: unknown): m is StoredMsg {
  const r = (m as StoredMsg)?.role
  return (r === "user" || r === "assistant") && typeof (m as StoredMsg)?.content === "string"
}

/** Load stored messages for a key, honouring the 7-day expiry and the cap. */
export function loadHistory(key: string): StoredMsg[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { ts?: unknown; messages?: unknown }
    if (typeof parsed?.ts !== "number" || !Array.isArray(parsed.messages)) return []
    if (Date.now() - parsed.ts > EXPIRY_MS) {
      window.localStorage.removeItem(key)
      return []
    }
    return parsed.messages.filter(isMsg).slice(-HISTORY_CAP)
  } catch {
    return []
  }
}

/** Persist messages (capped to the last HISTORY_CAP turns) with a fresh timestamp. */
export function saveHistory(key: string, messages: StoredMsg[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({ v: 1, ts: Date.now(), messages: messages.slice(-HISTORY_CAP) }),
    )
  } catch {
    // Quota / private-mode failures are non-fatal — history is best-effort.
  }
}

/** Clear a conversation ("Start new conversation"). */
export function clearHistory(key: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
