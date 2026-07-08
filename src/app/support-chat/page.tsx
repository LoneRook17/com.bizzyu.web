"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import SupportChat from "@/components/support/SupportChat"

// Support chat UI, loaded inside the iOS app's WebView as
// /support-chat?token=<sanctum token>. The chat UI itself lives in the shared
// <SupportChat> component (also used by the business dashboard bubble); this
// page just wires in the student audience + token from the query string.

const WELCOME =
  "Hey! I'm Bizzy's support assistant. Ask me anything about deals, tickets, line skips, or your account. 👋"

const SUGGESTIONS = [
  "Why can't I claim this deal?",
  "Where's my ticket?",
  "How do refunds work?",
]

function StudentChat() {
  const params = useSearchParams()
  const token = params.get("token") ?? ""
  return (
    <SupportChat
      audience="student"
      historySeed={token}
      token={token}
      welcome={WELCOME}
      suggestions={SUGGESTIONS}
      placeholder="Ask about deals, tickets, your account…"
      variant="fullscreen"
    />
  )
}

export default function SupportChatPage() {
  return (
    <Suspense fallback={<div className="flex h-dvh items-center justify-center bg-white" />}>
      <StudentChat />
    </Suspense>
  )
}
