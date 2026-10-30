"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/business/auth-context"
import SupportChat from "./SupportChat"

/** Window event the dashboard top bar fires to toggle this panel (BETA visual
 *  polish: chat lives in the top bar on desktop, the bubble stays on mobile). */
export const SUPPORT_TOGGLE_EVENT = "bizzy:support-toggle"

export function toggleSupportChat() {
  window.dispatchEvent(new Event(SUPPORT_TOGGLE_EVENT))
}

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

  useEffect(() => {
    const onToggle = () => setOpen((o) => !o)
    window.addEventListener(SUPPORT_TOGGLE_EVENT, onToggle)
    return () => window.removeEventListener(SUPPORT_TOGGLE_EVENT, onToggle)
  }, [])

  // Only for signed-in business users (need a stable id for local history).
  if (!user) return null

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-0 right-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-neutral-900 sm:bottom-24 sm:right-6 sm:h-[560px] sm:max-h-[calc(100dvh-8rem)] sm:w-[380px] sm:rounded-[14px] sm:border sm:border-gray-200 lg:bottom-auto lg:top-16 dark:sm:border-neutral-800">
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

      {/* Floating button (hidden while the full-screen mobile panel is open).
          Below lg only: the desktop top bar carries the chat icon. Neutral,
          not green, so the page's one green CTA stays the only one. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close support chat" : "Open support chat"}
        className={`fixed bottom-5 right-5 z-50 size-12 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-800 shadow-lg transition-colors hover:bg-neutral-50 lg:hidden dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 ${
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
