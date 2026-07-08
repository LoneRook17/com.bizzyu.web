"use client"

import { useState } from "react"
import { useAuth } from "@/lib/business/auth-context"
import SupportChat from "./SupportChat"

// Floating help bubble mounted across the business dashboard (see the dashboard
// layout). Opens the shared support chat in a panel, business audience. Auth is
// the existing business session cookie — no token is passed; the /api/support-chat
// route verifies the session server-side (see lib/support/auth.ts).

const WELCOME =
  "Hi! I'm Bizzy's assistant for your dashboard. Ask me about events, tickets, promo codes, promoters, payouts, or your team. 👋"

const SUGGESTIONS = [
  "How do I get paid?",
  "How do promo codes work?",
  "How do I add a team member?",
]

export default function SupportBubble() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  // Only for signed-in business users (need a stable id for local history).
  if (!user) return null

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-0 right-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:bottom-24 sm:right-6 sm:h-[560px] sm:max-h-[calc(100dvh-8rem)] sm:w-[380px] sm:rounded-2xl sm:border sm:border-gray-200">
          <SupportChat
            audience="business"
            historySeed={String(user.id)}
            welcome={WELCOME}
            suggestions={SUGGESTIONS}
            placeholder="Ask about events, tickets, payouts, your team…"
            headerNote="· dashboard help"
            variant="panel"
            onClose={() => setOpen(false)}
          />
        </div>
      )}

      {/* Floating button (hidden while the full-screen mobile panel is open) */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close support chat" : "Open support chat"}
        className={`fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-[#05EB54] text-neutral-900 shadow-lg transition-transform hover:scale-105 active:scale-95 ${
          open ? "hidden sm:flex" : "flex"
        }`}
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 3C6.48 3 2 6.94 2 11.8c0 2.5 1.2 4.75 3.13 6.34-.13 1.2-.6 2.3-1.35 3.19-.2.23-.03.6.27.57 1.7-.2 3.2-.78 4.4-1.7.79.2 1.62.3 2.47.3 5.52 0 10-3.94 10-8.8S17.52 3 12 3z" />
          </svg>
        )}
      </button>
    </>
  )
}
