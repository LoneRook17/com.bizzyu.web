"use client"

import { useState } from "react"
import { Check, Copy, MessageSquare } from "lucide-react"

import { buildSmsHref } from "@/lib/team-invite/client"
import { Button } from "@/components/business/v2/ui/button"

interface InviteLinkActionsProps {
  link: string
  businessName: string
  /** E.164 when the invite was by phone; the composer opens empty without it. */
  phone?: string | null
  /**
   * Whether to offer "Text it yourself". Defaults to true — the pre-auto-send
   * behavior — so every existing caller and every legacy response keeps the
   * button without opting in. Only TI-1's `sms_sent` and `duplicate_invite`
   * turn it off, and only because Bizzy has already done the texting.
   */
  showManualText?: boolean
}

/**
 * Copy-link, plus "Text it yourself" when the send is still the owner's job.
 *
 * Copy-link is unconditional: it is the fallback that works when nothing else
 * did, and it is never wrong to offer. The manual composer is gated, because
 * offering it after Bizzy already texted the invite invites a duplicate text to
 * the same person from a second number.
 */
export default function InviteLinkActions({
  link, businessName, phone, showManualText = true,
}: InviteLinkActionsProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      // Clipboard is permission-gated and absent over plain http on some
      // browsers. The link is on screen and selectable either way, so this
      // failing must not look like the invite failed.
      return
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="break-all font-mono text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          {link}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={copy}>
          {copied ? <Check className="text-green-600" /> : <Copy />}
          {copied ? "Copied" : "Copy invite link"}
        </Button>

        {/* A plain <a href> — never an auto-firing navigation. Same rule the
            web open-in-app buttons follow: sms: on a desktop browser with no
            handler does nothing, and a timer-driven version would strand the
            owner on a blank page. */}
        {showManualText && (
          <Button asChild type="button" variant="secondary" size="sm">
            <a href={buildSmsHref(phone ?? "", businessName, link)}>
              <MessageSquare />
              Text it yourself
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}
