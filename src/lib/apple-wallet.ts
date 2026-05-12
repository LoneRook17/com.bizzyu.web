// Apple Wallet only installs .pkpass (and .pkpasses) files via Safari/iOS,
// Chrome/iOS, or the iOS Mail/Messages share sheet. Hide the wallet button on
// platforms where the install will silently fail (desktop Chrome, Android).
export function isAppleWalletCapable(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent || ""
  if (/iPhone|iPad|iPod/.test(ua)) return true
  // iPad on iPadOS 13+ reports as Mac; distinguish by touch points.
  const nav = navigator as { maxTouchPoints?: number }
  if (/Macintosh/.test(ua) && typeof nav.maxTouchPoints === "number" && nav.maxTouchPoints > 1) {
    return true
  }
  return false
}
