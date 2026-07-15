import { after } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { loadKnowledgePack } from "@/lib/support/kb"
import { resolveSupportUser } from "@/lib/support/auth"
import { checkRateLimit } from "@/lib/support/ratelimit"
import { classifyConversation, type Classification } from "@/lib/support/classify"
import { buildIngestPayload, postIngest } from "@/lib/support/ingest"

// Streaming support-chat endpoint, shared by two audiences (see auth.ts):
//   • students — /support-chat inside the iOS app WebView (Bearer Sanctum token)
//   • businesses — the dashboard help bubble (business session cookie)
// The audience is decided by the auth type on the request. Requires a valid
// session in one form or the other, plus ANTHROPIC_API_KEY in the environment.

export const maxDuration = 60

const MODEL = "claude-haiku-4-5"
const MAX_OUTPUT_TOKENS = 600 // support answers are short by design (see 00-policies.md)
const MAX_TURNS = 40 // hard cap per conversation — bot asks user to email support past this
const MAX_MSG_CHARS = 1500
// Only the most recent turns are sent to the model. Bounds input cost per
// request regardless of what a (possibly scripted) client sends, and support
// chats rarely need context older than this.
const HISTORY_SENT = 12

type ChatMessage = { role: "user" | "assistant"; content: string }

// Belt-and-braces house-style guard (see 00-policies.md "Formatting rules").
// The system prompt forbids markdown bold and em/en dashes, but Haiku mirrors
// the KB packs' own heavy formatting (hundreds of `**bold**` runs, dozens of
// em-dashes) and slips intermittently, so we also enforce the rules on the
// streamed output as a hard guarantee.
//
// Safety — this only ever removes characters that cannot be legitimate content
// in a support answer:
//   • Em/en dashes (`—`/`–`) are single code units that always arrive whole in
//     one delta and never appear in code or URLs. Replaced (with any adjacent
//     horizontal spaces) by ", ".
//   • Asterisk runs (length 1-3) are stripped as emphasis markers UNLESS both
//     sides look literal: both whitespace/boundary (a spaced `*`, a `***` rule)
//     or both alphanumeric (`2**8`). That strips `**bold**`, `*emph*`, `***x***`
//     and bold ending in punctuation (`**Cooldowns.**`) while leaving math and
//     bullets intact; URLs never contain `*`. A short tail is buffered so a run
//     split across two deltas is classified correctly before anything is emitted.
function replaceDashes(s: string): string {
  return s.replace(/[ \t]*[—–][ \t]*/g, ", ")
}

function isAlnum(c: string): boolean {
  return /[A-Za-z0-9]/.test(c)
}

// Stateful streaming sanitizer. push() takes a raw text delta and returns the
// text safe to emit now; flush() returns whatever was held back at stream end.
function createSanitizer() {
  let buf = "" // unprocessed tail — may hold an asterisk run awaiting right-context
  let prev = "" // last original char before buf (left-context for a run at buf[0])

  function drain(final: boolean): string {
    let out = ""
    let i = 0
    while (i < buf.length) {
      if (buf[i] !== "*") {
        out += buf[i]
        prev = buf[i]
        i++
        continue
      }
      // Consume the whole asterisk run [i, j).
      let j = i
      while (j < buf.length && buf[j] === "*") j++
      // A run at the very end can still be growing and has no right-context yet;
      // hold it back until more arrives (or the final flush).
      if (j === buf.length && !final) break
      const left = i > 0 ? buf[i - 1] : prev
      const right = j < buf.length ? buf[j] : ""
      const spaceLeft = left === "" || /\s/.test(left)
      const spaceRight = right === "" || /\s/.test(right)
      const literal = (spaceLeft && spaceRight) || (isAlnum(left) && isAlnum(right))
      if (j - i <= 3 && !literal) {
        prev = left // emphasis marker — drop the asterisks, keep surrounding text
      } else {
        out += buf.slice(i, j)
        prev = "*"
      }
      i = j
    }
    buf = buf.slice(i)
    return out
  }

  return {
    push(delta: string): string {
      buf += delta
      return replaceDashes(drain(false))
    },
    flush(): string {
      return replaceDashes(drain(true))
    },
  }
}

function err(status: number, code: string) {
  return Response.json({ error: code }, { status })
}

export async function POST(req: Request) {
  // Ops kill switch: set SUPPORT_CHAT_DISABLED=1 in Vercel env to shut the
  // bot off instantly (no deploy needed — just redeploy env). The app UI
  // shows its generic "email support" fallback.
  if (process.env.SUPPORT_CHAT_DISABLED === "1") return err(503, "disabled")

  const user = await resolveSupportUser(req)
  if (!user) return err(401, "unauthorized")
  // Namespace the rate-limit key by audience so a student id and a business id
  // can never collide into a shared bucket.
  const rate = checkRateLimit(`${user.audience}:${user.id}`)
  if (!rate.ok) return err(429, rate.reason === "daily" ? "daily_limit" : "rate_limited")

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return err(400, "invalid_json")
  }
  const raw = (body as { messages?: unknown })?.messages
  if (!Array.isArray(raw) || raw.length === 0) return err(400, "messages_required")
  if (raw.length > MAX_TURNS) return err(409, "conversation_too_long")

  const messages: ChatMessage[] = []
  for (const m of raw) {
    const role = (m as ChatMessage)?.role
    const content = (m as ChatMessage)?.content
    if ((role !== "user" && role !== "assistant") || typeof content !== "string")
      return err(400, "invalid_message")
    if (!content.trim() || content.length > MAX_MSG_CHARS) return err(400, "message_too_long")
    messages.push({ role, content })
  }
  if (messages[messages.length - 1].role !== "user") return err(400, "last_message_must_be_user")

  // Per-conversation id from the client (see lib/support/history.ts). Used only
  // to correlate the transcript with the persisted DB row — a bad/missing value
  // never blocks the chat; it just means we skip ingest for this request.
  const ekRaw = (body as { external_key?: unknown })?.external_key
  const externalKey =
    typeof ekRaw === "string" && ekRaw.length >= 1 && ekRaw.length <= 100 ? ekRaw : null

  // Who the bot is talking to — placed AFTER the cached knowledge-pack block so
  // the per-user line never invalidates the prompt cache. Being in the system
  // role, it can't be spoofed by message content.
  const userContext = [
    "Context for this conversation (from the authenticated session, trustworthy):",
    user.name ? `The user's name is ${user.name}.` : null,
    user.audience === "business"
      ? user.business
        ? `They manage the business "${user.business}" on Bizzy.`
        : null
      : user.school
        ? `They attend ${user.school}.`
        : null,
    user.audience === "business"
      ? "They are a business owner/operator using the Bizzy business dashboard on the web."
      : "They are using the Bizzy iOS app.",
  ]
    .filter(Boolean)
    .join(" ")

  // Trim to the recent turns, making sure the slice still starts on a user
  // message (the API requires the first message to be role "user").
  let sent = messages.slice(-HISTORY_SENT)
  while (sent.length > 0 && sent[0].role !== "user") sent = sent.slice(1)

  const anthropic = new Anthropic()
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: [
      {
        type: "text",
        text: loadKnowledgePack(user.audience),
        cache_control: { type: "ephemeral" },
      },
      { type: "text", text: userContext },
    ],
    messages: sent,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const sanitize = createSanitizer()
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            const clean = sanitize.push(event.delta.text)
            if (clean) controller.enqueue(encoder.encode(clean))
          }
        }
        const tail = sanitize.flush()
        if (tail) controller.enqueue(encoder.encode(tail))
        controller.close()
      } catch (e) {
        console.error("support-chat stream error", e)
        controller.error(e)
      }
    },
    cancel() {
      stream.abort()
    },
  })

  // Post-stream work (usage log, classification, ingest) runs AFTER the response
  // has finished streaming, so the user never waits on it. Everything here is
  // best-effort — any failure is logged and swallowed, the chat is unaffected.
  after(async () => {
    let final: Anthropic.Message
    try {
      final = await stream.finalMessage()
    } catch (e) {
      // Client disconnected / stream aborted — nothing to persist.
      console.error("support-chat finalize error", e)
      return
    }

    const assistantText = final.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
    // The full transcript for persistence: everything the client sent plus the
    // reply we just streamed. (The client's history already carries prior
    // assistant turns, so this grows to the complete conversation.)
    const transcript = assistantText.trim()
      ? [...messages, { role: "assistant" as const, content: assistantText }]
      : messages

    const ingestSecret = process.env.SUPPORT_CHAT_INGEST_SECRET
    // Classify only on the ingest path. With no secret set, there's nowhere to
    // persist a verdict, so we skip the extra Haiku call — the route then
    // behaves exactly as it did before this feature (stream + usage log only).
    let classification: Classification | null = null
    if (ingestSecret && externalKey) {
      classification = await classifyConversation(anthropic, transcript)
    }

    // One structured log line per message — greppable in Vercel logs to watch
    // spend and spot abuse (filter on "support-chat-usage"). external_key +
    // flagged let a log line be correlated back to its persisted DB row.
    console.log(
      JSON.stringify({
        tag: "support-chat-usage",
        audience: user.audience,
        user: user.id,
        external_key: externalKey,
        flagged: classification?.flag === true,
        turns: sent.length,
        input_tokens: final.usage.input_tokens,
        cache_read_input_tokens: final.usage.cache_read_input_tokens ?? 0,
        cache_creation_input_tokens: final.usage.cache_creation_input_tokens ?? 0,
        output_tokens: final.usage.output_tokens,
      }),
    )

    if (ingestSecret && externalKey) {
      const payload = buildIngestPayload({ externalKey, user, messages: transcript, classification })
      await postIngest(payload)
    }
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  })
}
