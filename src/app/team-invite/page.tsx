import type { Metadata } from "next"
import { Suspense } from "react"

import TeamInviteClient from "./TeamInviteClient"

// The team-invite accept page, on a deliberately UNCLAIMED path.
//
// Why not /business/accept-invite: the whole /business space is AASA-excluded
// today precisely because iOS was hijacking those links into an app that has no
// invite handler, dead-ending the invitee. This path is not claimed by any AASA
// component either (see public/.well-known/apple-app-site-association — no
// component matches /team-invite), so it always opens in the browser, which is
// the point: the accept page serves app and non-app invitees alike this cycle.
// Same reasoning as /setup-password and /accept-invite. itunes:null drops the
// Smart App Banner.
//
// Do NOT add /team-invite to the AASA. The link is texted person-to-person and
// must open a real page on whatever device receives it.
export const metadata: Metadata = {
  title: "Join the team",
  robots: { index: false, follow: false },
  itunes: null,
}

export default function TeamInvitePage() {
  // The client reads ?token= via useSearchParams, which needs a Suspense
  // boundary to keep the route statically renderable.
  return (
    <Suspense>
      <TeamInviteClient />
    </Suspense>
  )
}
