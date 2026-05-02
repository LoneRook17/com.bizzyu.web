/**
 * Cooper (May 2026): Defensively clear the biz_session cookie across all
 * realistic path/domain variants. Older deployments set biz_session host-only
 * (no Domain attr); the current backend sets it with Domain=.bizzyu.com. If
 * the server's single Set-Cookie clear can't match the user's stored variant,
 * the cookie persists and the middleware bounces the user in a redirect loop:
 * /business → 401 → /business/login → middleware sees biz_session → /business.
 * This helper covers every variant we've ever set so the cookie is always
 * cleared before navigating away from an unauthenticated state.
 */
export function clearBizSession(): void {
  if (typeof document === "undefined") return
  const variants = [
    "biz_session=; path=/business; max-age=0; SameSite=Lax",
    "biz_session=; path=/business; max-age=0; SameSite=Lax; domain=.bizzyu.com",
    "biz_session=; path=/business; max-age=0; SameSite=Lax; domain=bizzyu.com",
    "biz_session=; path=/; max-age=0; SameSite=Lax",
    "biz_session=; path=/; max-age=0; SameSite=Lax; domain=.bizzyu.com",
  ]
  variants.forEach((v) => {
    document.cookie = v
  })
}
