"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import ConfirmDialog from "@/components/business/v2/ConfirmDialog"
import {
  NIGHT_UNSAVED_BODY,
  NIGHT_UNSAVED_LEAVE,
  NIGHT_UNSAVED_TITLE,
} from "@/lib/business/door-access"

/**
 * Leave prompts for the night editor. Save night is the only persist, so a
 * dirty draft must not vanish via Back, the sidebar, or a browser close.
 * Cancel on the dialog stays. beforeunload covers refresh / tab close.
 */
export function NightLeaveGuard({ dirty }: { dirty: boolean }) {
  const router = useRouter()
  const allowLeaveRef = useRef(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty || allowLeaveRef.current) return
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [dirty])

  useEffect(() => {
    if (!dirty) return
    const onClick = (e: MouseEvent) => {
      if (allowLeaveRef.current) return
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return
      }
      const target = e.target
      if (!(target instanceof Element)) return
      const a = target.closest("a")
      if (!a) return
      const href = a.getAttribute("href")
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return
      if (a.getAttribute("target") === "_blank" || a.hasAttribute("download")) return
      let url: URL
      try {
        url = new URL(href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      e.preventDefault()
      e.stopPropagation()
      setPendingHref(`${url.pathname}${url.search}${url.hash}`)
    }
    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [dirty])

  return (
    <ConfirmDialog
      open={pendingHref != null}
      onOpenChange={(open) => {
        if (!open) setPendingHref(null)
      }}
      onConfirm={() => {
        const href = pendingHref
        allowLeaveRef.current = true
        setPendingHref(null)
        if (href) router.push(href)
      }}
      title={NIGHT_UNSAVED_TITLE}
      description={NIGHT_UNSAVED_BODY}
      confirmLabel={NIGHT_UNSAVED_LEAVE}
    />
  )
}
