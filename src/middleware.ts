import { NextRequest, NextResponse } from "next/server"

const AUTH_PAGES = [
  "/business/login",
  "/business/signup",
  "/business/verify-email",
  "/business/forgot-password",
  "/business/reset-password",
  "/business/accept-invite",
  // v2 (isolated dashboard redesign) auth pages
  "/business/v2/login",
  "/business/v2/signup",
  "/business/v2/verify-email",
  "/business/v2/forgot-password",
  "/business/v2/reset-password",
  "/business/v2/accept-invite",
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  // The Node backend sets biz_token (httpOnly) on login; middleware runs server-side
  // and can read httpOnly cookies. Earlier code looked for a non-existent biz_session
  // cookie, which caused valid logins to bounce back to /business/login.
  const hasSession = request.cookies.get("biz_token") || request.cookies.get("biz_refresh")

  // Only handle /business/* routes
  if (!pathname.startsWith("/business")) {
    return NextResponse.next()
  }

  const isAuthPage = AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(page + "/")
  )

  // Keep v2 traffic inside v2 (auth ↔ dashboard redirects stay in the same world)
  const isV2 = pathname.startsWith("/business/v2")

  // Authenticated user visiting auth pages → redirect to dashboard
  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL(isV2 ? "/business/v2" : "/business", request.url))
  }

  // Skip auth for deep link interstitial pages (numeric business IDs)
  if (/^\/business\/\d+$/.test(pathname)) {
    return NextResponse.next()
  }

  // Unauthenticated user visiting dashboard pages → redirect to login
  if (!isAuthPage && !hasSession) {
    return NextResponse.redirect(new URL(isV2 ? "/business/v2/login" : "/business/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/business/:path*"],
}
