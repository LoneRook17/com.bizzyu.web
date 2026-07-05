import Anthropic from "@anthropic-ai/sdk"
import { loadKnowledgePack } from "@/lib/support/kb"
import { verifySupportToken } from "@/lib/support/auth"
import { checkRateLimit } from "@/lib/support/ratelimit"

// Streaming support-chat endpoint. Loaded by /support-chat (inside the iOS
// app's WebView). Requires a valid app auth token — see lib/support/auth.ts.
// Requires ANTHROPIC_API_KEY in the environment.

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

function err(status: number, code: string) {
  return Response.json({ error: code }, { status })
}

export async function POST(req: Request) {
  // Ops kill switch: set SUPPORT_CHAT_DISABLED=1 in Vercel env to shut the
  // bot off instantly (no deploy needed — just redeploy env). The app UI
  // shows its generic "email support" fallback.
  if (process.env.SUPPORT_CHAT_DISABLED === "1") return err(503, "disabled")

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "")
  const user = await verifySupportToken(token)
  if (!user) return err(401, "unauthorized")
  const rate = checkRateLimit(user.id)
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

  // Who the bot is talking to — placed AFTER the cached knowledge-pack block so
  // the per-user line never invalidates the prompt cache. Being in the system
  // role, it can't be spoofed by message content.
  const userContext = [
    "Context for this conversation (from the authenticated session, trustworthy):",
    user.name ? `The user's name is ${user.name}.` : null,
    user.school ? `They attend ${user.school}.` : null,
    "They are using the Bizzy iOS app.",
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
        text: loadKnowledgePack(),
        cache_control: { type: "ephemeral" },
      },
      { type: "text", text: userContext },
    ],
    messages: sent,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
        // One structured log line per message — greppable in Vercel logs to
        // watch spend and spot abuse (filter on "support-chat-usage").
        const final = await stream.finalMessage()
        console.log(
          JSON.stringify({
            tag: "support-chat-usage",
            user: user.id,
            turns: sent.length,
            input_tokens: final.usage.input_tokens,
            cache_read_input_tokens: final.usage.cache_read_input_tokens ?? 0,
            cache_creation_input_tokens: final.usage.cache_creation_input_tokens ?? 0,
            output_tokens: final.usage.output_tokens,
          }),
        )
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

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  })
}
