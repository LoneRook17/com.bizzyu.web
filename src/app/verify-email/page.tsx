import type { Metadata } from "next"

// Unclaimed-path alias of the business verify-email page.
// Why: the iOS app universal-links /business/* (AASA), so email-verification links
// that land on /business/verify-email get hijacked into the app - which has no
// verify handler, so it silently opens and dead-ends, losing the token, and the
// new business can never finish signing up. This path is NOT in the AASA and opts
// out of the Smart App Banner, so signups always get a plain browser page - while
// the verification still saves under bizzyu.com, where they log in. Mirrors
// /accept-invite and /setup-password (the two prior AASA-hijack twins).
export const metadata: Metadata = {
  title: "Verify your email",
  robots: { index: false, follow: false },
  itunes: null,
}

export { default } from "../business/(auth)/verify-email/page"
