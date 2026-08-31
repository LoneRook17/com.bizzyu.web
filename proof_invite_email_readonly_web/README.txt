Accept-page email READ-ONLY when invited_email present — LIVE proof
====================================================================
Date: 2026-07-29
Web:  dev 1c211e4 (feat/invite-email-readonly-web @ 6f182cb, off 665e49e)
Deploy: com-bizzyu-web-l2gp-jdsgm3y77 (Production, READY) — public
        https://com-bizzyu-web-l2gp.vercel.app
Services: dev bizzy-dev-apiv2:203 (validate returns invited_email)

NO stubs / NO route.fulfill — every request crossed the wire from the
deployed l2gp page through /api/proxy to real dev services :203.
This also closes the live-live re-proof owed from the 665e49e pre-fill
change (proven vs stubbed validate at the time; :203 wasn't live yet).

Arm A — EMAIL invite (01_email_invite_readonly_prefilled_hint.png)
  Fixture: business_team_members 999367, invite to
  readonly.proof@bizzytest.com (business 267, staff).
  Live validate → invited_email:"readonly.proof@bizzytest.com".
  Field pre-filled, input.readOnly === true, hint rendered:
  "Your account will use the email this invite was sent to."
  Typing "HACKED" into the focused field left the value unchanged.

Arm B — PHONE invite (02_phone_invite_editable_unchanged.png)
  Fixture: business_team_members 999368, invite to +15555550991.
  Live validate → invited_email:null. Real send-code 200 to pass the
  OTP gate. Field empty, readOnly === false, hint absent; typing
  "typed.by.invitee@example.com" landed in the field. Old behavior
  byte-identical (phone invites legitimately choose their email —
  server honors it on the needs_email fill-in path).

Checks: tsc clean · eslint clean on touched files (repo-wide 112
problems identical at 665e49e = pre-existing) · 254 tests pass ·
prod build clean · mock chunk still folds out (grep of .next/static).

Cleanup: rows 999367 + 999368 deleted (user_id NULL — no accounts
created), user_verifications 7048 (team-invite+5555550991@bizzy.local)
deleted. 0 remnants (invites, OTP rows, users all verified 0).
