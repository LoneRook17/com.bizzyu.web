import type { Metadata } from "next"

// Unclaimed-path alias of the business reset-password page.
// Why: the iOS app universal-links /business/* (AASA), so password-setup emails
// that land there get hijacked into the app or show "Open in Bizzy" banners.
// This path is NOT in the AASA and opts out of the Smart App Banner, so business
// owners get a plain browser page - while the password still saves under
// bizzyu.com, where they log in.
export const metadata: Metadata = {
  title: "Set your password",
  robots: { index: false, follow: false },
  itunes: null,
}

export { default } from "../business/(auth)/reset-password/page"
