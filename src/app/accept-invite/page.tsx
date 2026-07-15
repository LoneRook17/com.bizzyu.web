import type { Metadata } from "next"

// Unclaimed-path alias of the business accept-invite page.
// Why: the iOS app universal-links /business/* (AASA), so invite emails that
// land on /business/accept-invite get hijacked into the app - which has no
// invite handler, so it silently opens and dead-ends. A manager/co-host invite
// creates a web dashboard account (email + password); there is nothing for the
// app to do with it. This path is NOT in the AASA and opts out of the Smart App
// Banner, so invitees always get a plain browser page - while the account still
// saves under bizzyu.com, where they log in. Mirrors /setup-password.
export const metadata: Metadata = {
  title: "Accept your invite",
  robots: { index: false, follow: false },
  itunes: null,
}

export { default } from "../business/(auth)/accept-invite/page"
