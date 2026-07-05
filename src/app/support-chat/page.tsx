"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"

// Support chat UI, loaded inside the iOS app's WebView as
// /support-chat?token=<sanctum token>. Streams answers from /api/support-chat.

type Msg = { role: "user" | "assistant"; content: string }

const WELCOME =
  "Hey! I'm Bizzy's support assistant. Ask me anything about deals, tickets, line skips, or your account. 👋"

const SUGGESTIONS = [
  "Why can't I claim this deal?",
  "Where's my ticket?",
  "How do refunds work?",
]

function ChatScreen() {
  const params = useSearchParams()
  const token = params.get("token") ?? ""

  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [fatal, setFatal] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, busy])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    setInput("")
    setFatal(null)
    const history: Msg[] = [...messages, { role: "user", content: trimmed }]
    setMessages(history)
    setBusy(true)
    try {
      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: history }),
      })
      if (!res.ok || !res.body) {
        const code = await res
          .json()
          .then((b) => b?.error as string)
          .catch(() => "")
        if (res.status === 401)
          setFatal(
            "We couldn't verify your session. Close and reopen this screen, or email support@bizzyu.com.",
          )
        else if (res.status === 429 && code === "daily_limit")
          setFatal(
            "You've hit today's chat limit. For anything urgent, email support@bizzyu.com and a human will pick it up.",
          )
        else if (res.status === 429)
          setFatal(
            "You're sending messages a little fast — give it a few minutes, or email support@bizzyu.com.",
          )
        else if (res.status === 409)
          setFatal(
            "This conversation is getting long — for anything unresolved, email support@bizzyu.com and a human will pick it up.",
          )
        else if (res.status === 503)
          setFatal(
            "Chat is temporarily unavailable — email support@bizzyu.com and we'll get back to you.",
          )
        else
          setFatal("Something went wrong on our end. Try again, or email support@bizzyu.com.")
        setMessages(history.slice(0, -1))
        setInput(trimmed)
        return
      }
      setMessages([...history, { role: "assistant", content: "" }])
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ""
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        const snapshot = acc
        setMessages([...history, { role: "assistant", content: snapshot }])
      }
      if (!acc.trim()) {
        setMessages(history)
        setFatal("No reply came through. Try again, or email support@bizzyu.com.")
      }
    } catch {
      setMessages(history)
      setInput(trimmed)
      setFatal("Connection hiccup — check your signal and try again.")
    } finally {
      setBusy(false)
    }
  }

  const showSuggestions = messages.length === 0 && !busy

  return (
    <div className="flex h-dvh flex-col bg-white">
      {/* Slim header — the app's native bar already says "Support" */}
      <header className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
        <span className="text-sm font-semibold text-gray-900">Bizzy Assistant</span>
        <span className="text-xs text-gray-400">· usually replies instantly</span>
      </header>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <Bubble role="assistant">{WELCOME}</Bubble>
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role}>
            {m.content || "…"}
          </Bubble>
        ))}
        {busy && messages[messages.length - 1]?.role === "user" && (
          <Bubble role="assistant">
            <span className="inline-flex gap-1">
              <Dot delay="0ms" /> <Dot delay="150ms" /> <Dot delay="300ms" />
            </span>
          </Bubble>
        )}
        {fatal && (
          <p className="mx-auto max-w-[85%] rounded-xl bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
            {fatal}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {showSuggestions && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-700 active:bg-gray-100"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <form
        className="flex items-end gap-2 border-t border-gray-100 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              send(input)
            }
          }}
          rows={1}
          maxLength={1500}
          placeholder="Ask about deals, tickets, your account…"
          className="max-h-28 flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2.5 text-[16px] outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-gray-900 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  )
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const isUser = role === "user"
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-snug ${
          isUser
            ? "rounded-br-md bg-primary text-gray-900"
            : "rounded-bl-md bg-gray-100 text-gray-900"
        }`}
      >
        {children}
      </div>
    </div>
  )
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
      style={{ animationDelay: delay }}
    />
  )
}

export default function SupportChatPage() {
  return (
    <Suspense fallback={<div className="flex h-dvh items-center justify-center bg-white" />}>
      <ChatScreen />
    </Suspense>
  )
}
