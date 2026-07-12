import { NextRequest, NextResponse } from "next/server"

const AUTH_PAGES = [
  "/business/login",
  "/business/signup",
  "/business/verify-email",
  "/business/forgot-password",
  "/business/reset-password",
  "/business/accept-invite",
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  // The Node backend sets biz_token (httpOnly) on login; middleware runs server-side
  // and can read httpOnly cookies.
  const hasSession = request.cookies.get("biz_token") || request.cookies.get("biz_refresh")

  // Only handle /business/* routes
  if (!pathname.startsWith("/business")) {
    return NextResponse.next()
  }

  // Legacy: the redesigned dashboard used to live under /business/v2. It is now
  // the default at /business - permanently redirect old links/bookmarks/QRs.
  if (pathname === "/business/v2" || pathname.startsWith("/business/v2/")) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace("/business/v2", "/business") || "/business"
    return NextResponse.redirect(url) // clone keeps the query string (invite/reset tokens)
  }

  // The invite email path moved to the unclaimed root-level /accept-invite so the
  // iOS app (which universal-links /business/*) can't hijack invite links into an
  // app that has no invite handler. Invites already sitting in inboxes still point
  // at /business/accept-invite - redirect them, keeping ?token=. The AASA excludes
  // /business/accept-invite* so this old link reaches the browser to be redirected.
  if (
    pathname === "/business/accept-invite" ||
    pathname.startsWith("/business/accept-invite/")
  ) {
    const url = request.nextUrl.clone()
    url.pathname = "/accept-invite"
    return NextResponse.redirect(url) // clone keeps the query string (invite token)
  }

  const isAuthPage = AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(page + "/")
  )

  // Authenticated user visiting auth pages → redirect to dashboard
  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL("/business", request.url))
  }

  // Skip auth for deep link interstitial pages (numeric business IDs)
  if (/^\/business\/\d+$/.test(pathname)) {
    return NextResponse.next()
  }

  // Unauthenticated user visiting dashboard pages → redirect to login
  if (!isAuthPage && !hasSession) {
    return NextResponse.redirect(new URL("/business/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/business/:path*"],
}
