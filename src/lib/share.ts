// Web equivalent of Flutter's `share_plus.SharePlus.share(...)`: prefers the
// native iOS/Android share sheet via the Web Share API, falls back to
// clipboard on desktop. Callers receive the outcome so they can flash a
// "Link Copied!" affordance on the fallback path.

export type ShareOutcome = "shared" | "copied" | "failed"

// Either `url` (link shares) or `text` (message shares, e.g. pasting a door
// code into a staff group chat) must be provided. When only `text` is given
// the clipboard fallback copies the message body verbatim.
export async function nativeShare(opts: { title: string; url?: string; text?: string }): Promise<ShareOutcome> {
  if (typeof navigator === "undefined") return "failed"

  type ShareNav = Navigator & {
    share?: (data: { title?: string; url?: string; text?: string }) => Promise<void>
    clipboard?: { writeText?: (s: string) => Promise<void> }
  }
  const nav = navigator as ShareNav

  if (typeof nav.share === "function") {
    try {
      await nav.share({ title: opts.title, url: opts.url, text: opts.text })
      return "shared"
    } catch {
      // User cancelled the sheet - treat as a non-failure no-op.
      return "shared"
    }
  }

  // Desktop fallback: copy the message body (or the link) to the clipboard.
  const fallback = opts.text ?? opts.url
  if (fallback && nav.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(fallback)
      return "copied"
    } catch {
      return "failed"
    }
  }

  return "failed"
}
