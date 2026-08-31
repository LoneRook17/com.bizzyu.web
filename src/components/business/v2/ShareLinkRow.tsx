"use client"

// DASH2-D — THE share-link affordance. Lifted verbatim out of the event manage
// page's local `EventLinkRow` so nights get the identical thing rather than a
// lookalike: same copy-to-clipboard, same window.prompt fallback, same 2s
// "Copied" flash, same Web Share API button when the browser has one.
//
// Two sizes, one behaviour:
//   card    a standalone row (event manage page, the program link) — the
//           original markup, unchanged
//   inline  compact, sits INSIDE a list row (a night on the series page)
//
// The link text is always visible, never hidden behind the button: an operator
// reading a night out over the phone needs to see it, and a copy button with
// nothing to read is unverifiable.

import { useEffect, useState } from "react"
import { Check, Copy, Link2, Share2 } from "lucide-react"
import { nativeShare } from "@/lib/share"
import { cn } from "@/lib/v2/utils"

export type ShareLinkVariant = "card" | "inline"

function useShareLink(url: string, title: string) {
  const [copied, setCopied] = useState(false)
  const [canShare, setCanShare] = useState(false)

  // Feature-detect after mount — navigator is absent during SSR, and reading
  // it during render would desync the first client paint.
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function")
  }, [])

  const flashCopied = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      flashCopied()
    } catch {
      // Clipboard is permission-gated and absent on insecure origins; a prompt
      // still lets the operator get the link out.
      window.prompt("Copy this link:", url)
    }
  }

  const share = async () => {
    const outcome = await nativeShare({ title, url })
    if (outcome === "copied") flashCopied()
  }

  return { copied, canShare, copy, share }
}

export default function ShareLinkRow({
  url,
  title,
  label = "Event link",
  description,
  variant = "card",
  className,
}: {
  /** The public URL. Build it with lib/business/public-links — never inline. */
  url: string
  /** Share-sheet title (the event/night name). */
  title: string
  label?: string
  /** Optional second line under the label (e.g. "Every upcoming night"). */
  description?: string
  variant?: ShareLinkVariant
  className?: string
}) {
  const { copied, canShare, copy, share } = useShareLink(url, title)

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span
          className="hidden max-w-[13rem] truncate font-mono text-[11px] text-neutral-400 dark:text-neutral-500 lg:inline"
          title={url}
        >
          {url}
        </span>
        <button
          onClick={copy}
          aria-label={`Copy link for ${title}`}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-600 transition-colors hover:border-[#05EB54]/50 hover:text-[#05EB54] dark:border-neutral-700 dark:text-neutral-300 dark:hover:text-[#05EB54]"
        >
          {copied ? <><Check className="size-3.5" /> Copied</> : <><Copy className="size-3.5" /> Copy link</>}
        </button>
        {canShare && (
          <button
            onClick={share}
            aria-label={`Share link for ${title}`}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-600 transition-colors hover:border-[#05EB54]/50 hover:text-[#05EB54] dark:border-neutral-700 dark:text-neutral-300 dark:hover:text-[#05EB54]"
          >
            <Share2 className="size-3.5" /> Share
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 shadow-sm", className)}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
        <Link2 className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{label}</p>
        {description && (
          <p className="text-[13px] text-neutral-500 dark:text-neutral-400">{description}</p>
        )}
        <p className="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400" title={url}>{url}</p>
      </div>
      <button
        onClick={copy}
        className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-xs font-semibold text-[#05EB54] hover:underline"
      >
        {copied ? <><Check className="size-3.5" /> Copied</> : <><Copy className="size-3.5" /> Copy</>}
      </button>
      {canShare && (
        <button
          onClick={share}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-xs font-semibold text-[#05EB54] hover:underline"
        >
          <Share2 className="size-3.5" /> Share
        </button>
      )}
    </div>
  )
}
