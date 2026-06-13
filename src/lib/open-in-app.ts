import { APP_STORE_URL } from "@/lib/constants"

/**
 * Try to open the Bizzy app via its custom scheme; fall back to the App
 * Store when the app isn't installed (page still visible after the grace
 * period). Desktop goes straight to the App Store page.
 */
export function openInApp(deepLink: string) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  if (!isMobile) {
    window.open(APP_STORE_URL, "_blank")
    return
  }
  const fallback = setTimeout(() => {
    if (!document.hidden) window.location.href = APP_STORE_URL
  }, 1600)
  window.addEventListener("pagehide", () => clearTimeout(fallback), { once: true })
  window.location.href = deepLink
}
