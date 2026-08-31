TI-4s-WEB follow-up — accept-page email pre-fill from validate's invited_email
Deployed l2gp proof 2026-07-29
Deploy: com-bizzyu-web-l2gp-1z4hv5jc7 (Production, READY, 46s), dev @ 665e49e
(merge of feat/invite-email-prefill-web dc5fdeb onto 476c9da).
All screenshots on the public https://com-bizzyu-web-l2gp.vercel.app domain,
Playwright 1280x900, real invite token (business 267, member 999363,
ti4s-email-prefill-proof@bizzytest.com, provisional_name "Prefill Proofley").

AT PROOF TIME dev services (:202) did NOT yet return invited_email — the
services half is landing from a parallel session. So:

01_live_no_invited_email_empty_field.png   LIVE-LIVE regression arm: deployed
    l2gp against real dev services :202 (validate WITHOUT invited_email).
    Email field renders EMPTY (placeholder you@example.com), name still
    pre-filled from provisional_name — byte-old behavior, asserted
    inputValue === "".

02_prefilled_from_invited_email.png        Pre-fill arm, deployed production
    JS: the REAL live :202 validate body with ONLY invited_email added
    (Playwright route.fulfill on /api/proxy/.../validate). Email field
    pre-filled "ti4s-email-prefill-proof@bizzytest.com"; readOnly/disabled
    both false.

03_edited_still_editable.png               Field cleared and retyped to
    my-real-address@bizzytest.com — edit sticks (asserted). Editable per the
    task default; local services code at 75d9c42 shows no accept-side email
    match enforcement. RE-CHECK once services lands invited_email: if that
    session shipped enforcement, flip the field to read-only + why-hint.

Follow-up owed (1 minute): once dev services returns invited_email for real,
re-run arm B without the stub (create invite -> open link -> field pre-filled).

Gates: tsc exit 0; lint delta 0 (113 pre-existing findings before AND after,
none in team-invite files); prod build clean; 254/254 tests; mock chunk
confirmed folded out (mockValidateInvite + mock email absent from
.next/static/chunks).

Cleanup: member row 999363 deleted from dev RDS (was user_id NULL, never
accepted; no user created); 0 remnants for the proof email; token dead.
