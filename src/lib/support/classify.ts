// Post-reply conversation classifier for the support bot. After a completed
// assistant reply, the route runs ONE extra cheap Haiku call over the recent
// turns and asks for a strict-JSON triage verdict. The result drives:
//   • the `flagged` field on the usage log line, and
//   • the optional `flag` block on the ingest payload (for the DB).
//
// This is best-effort and MUST NOT affect the user's chat: every failure mode
// (network error, non-JSON output, bad shape) is caught, logged, and turned
// into `null` (= "no verdict"). `parseClassification` is a pure function so it
// can be unit-tested without an Anthropic key.
//
// The Anthropic client is passed in (dependency injection) so this module has no
// runtime dependency on the SDK — only a type import — which keeps the pure
// parser importable in a plain-Node test harness.
import type Anthropic from "@anthropic-ai/sdk"

export type Turn = { role: "user" | "assistant"; content: string }

export type Classification = {
  flag: boolean
  category: "bug" | "complaint" | "unresolved" | "abuse" | "other"
  severity: number // 1..3
  reason: string
  summary: string
  suggested_fix: string | null
}

const MODEL = "claude-haiku-4-5"
// The char budgets below (reason 200 + summary 400 + suggested_fix 300) plus JSON
// framing can exceed ~200 tokens for a fully-populated flagged verdict, so we give
// a little headroom to guarantee the JSON is never truncated (a truncated object
// would fail the parse and silently drop a real flag).
const MAX_TOKENS = 300
const HISTORY_CLASSIFIED = 12

const CATEGORIES: Classification["category"][] = [
  "bug",
  "complaint",
  "unresolved",
  "abuse",
  "other",
]

const SYSTEM = [
  "You are a triage classifier for Bizzy support-chat conversations.",
  "You are given a transcript between a user and the Bizzy support assistant.",
  "Return a SINGLE JSON object and NOTHING else — no prose, no markdown, no code fences.",
  "Schema (all keys required):",
  "{",
  '  "flag": boolean,               // true ONLY for real issues a human should review',
  '  "category": "bug" | "complaint" | "unresolved" | "abuse" | "other",',
  '  "severity": 1 | 2 | 3,         // 1 low, 2 medium, 3 high',
  '  "reason": string,              // <=200 chars: why you classified it this way',
  '  "summary": string,             // <=400 chars: neutral summary of the conversation',
  '  "suggested_fix": string|null   // <=300 chars: concrete next action, or null',
  "}",
  "Set flag=true ONLY when the user reports a real bug, is angry or clearly unresolved,",
  "or is being abusive. Routine questions the assistant answered well must NOT be flagged.",
  'When flag=false, still fill category (use "other" if nothing fits), severity=1, a short',
  "reason, and a summary; suggested_fix may be null.",
].join("\n")

const INSTRUCTION = "Classify the conversation above. Output only the JSON object."

function clampStr(v: unknown, n: number): string {
  return typeof v === "string" ? v.slice(0, n) : ""
}

/**
 * Defensively parse a classifier reply into a Classification, or `null` if the
 * text can't be read as a JSON verdict. Tolerant of surrounding prose / code
 * fences (extracts the first `{ … }` span) and coerces/clamps every field.
 */
export function parseClassification(text: string): Classification | null {
  if (typeof text !== "string" || !text.trim()) return null
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) return null

  let obj: Record<string, unknown>
  try {
    const candidate = JSON.parse(text.slice(start, end + 1))
    if (!candidate || typeof candidate !== "object") return null
    obj = candidate as Record<string, unknown>
  } catch {
    return null
  }

  const flag = obj.flag === true
  const category = CATEGORIES.includes(obj.category as Classification["category"])
    ? (obj.category as Classification["category"])
    : "other"
  let severity = Number(obj.severity)
  if (!Number.isFinite(severity)) severity = 1
  severity = Math.min(3, Math.max(1, Math.round(severity)))
  const reason = clampStr(obj.reason, 200)
  const summary = clampStr(obj.summary, 400)
  const suggested_fix =
    typeof obj.suggested_fix === "string" ? obj.suggested_fix.slice(0, 300) : null

  return { flag, category, severity, reason, summary, suggested_fix }
}

/**
 * Run the classifier over the recent turns. Returns `null` on any failure
 * (logged, never thrown) so the caller can carry on regardless.
 */
export async function classifyConversation(
  client: Anthropic,
  turns: Turn[],
): Promise<Classification | null> {
  try {
    const recent = turns.slice(-HISTORY_CLASSIFIED)
    if (recent.length === 0) return null
    const transcript = recent
      .map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.content}`)
      .join("\n\n")

    const res = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0,
      system: SYSTEM,
      messages: [{ role: "user", content: `${transcript}\n\n${INSTRUCTION}` }],
    })

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")

    const parsed = parseClassification(text)
    if (!parsed) console.warn(JSON.stringify({ tag: "support-chat-classify-error", reason: "unparseable" }))
    return parsed
  } catch (e) {
    console.warn(JSON.stringify({ tag: "support-chat-classify-error", error: String(e) }))
    return null
  }
}
