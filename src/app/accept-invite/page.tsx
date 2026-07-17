import type { Metadata } from "next"
import { redirect } from "next/navigation"

// Interim alias: /accept-invite now forwards to the canonical /team-invite
// accept page, preserving ?token=.
//
// History: invite emails first moved off /business/accept-invite onto this
// unclaimed root path to dodge the iOS AASA hijack (the app universal-links
// /business/* but has no invite handler). This cycle the accept UI itself moved
// to /team-invite, so this path becomes a pure forwarder. It stays a real page
// (not a delete) so any invite already sitting in an inbox that points here
// still lands on a working accept page.
//
// This page-level redirect is the belt-and-suspenders fallback for the
// config-level twins in next.config.ts (redirects()) and vercel.json — if those
// are ever stripped, the invitee still reaches /team-invite. Same unclaimed-path
// reasoning as /team-invite itself, so no AASA/Smart-Banner concerns here.
export const metadata: Metadata = {
  title: "Accept your invite",
  robots: { index: false, follow: false },
  itunes: null,
}

export default async function AcceptInviteRedirect({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const { token } = await searchParams
  const raw = Array.isArray(token) ? token[0] : token
  redirect(raw ? `/team-invite?token=${encodeURIComponent(raw)}` : "/team-invite")
}
