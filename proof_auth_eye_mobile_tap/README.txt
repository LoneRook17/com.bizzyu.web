Auth password eye — 44px tap target so the toggle works on mobile — LIVE proof
==============================================================================
Date: 2026-07-30
Web:  dev 767c9ec (fix/auth-password-eye-mobile-tap @ 3134040, off 1c211e4)
Deploy: com-bizzyu-web-l2gp-77scf5911 (Production, READY) — public
        https://com-bizzyu-web-l2gp.vercel.app
File: src/components/business/v2/auth/auth-shell.tsx (AuthPasswordField —
      shared by login, signup, reset-password, accept-invite, team-invite)

BUG (observed iPhone Safari, team-invite accept page): the eye toggled on
desktop but "did nothing" on mobile. Recon (iPhone 14 emulation, touch):
the button was a bare 16x16px icon (no padding) 12px from the field edge —
in the 44x44 thumb zone at the field's right edge only 13% of points hit
it; 77% hit the input. A realistic thumb tap (icon center +8px) focused
the input (keyboard pops) and did NOT toggle. onClick + type="button" were
already correct — precise 1px mouse hits worked, fat touches missed. iOS's
AutoFill affordance (the yellow-tint state) occupies the same right-edge
strip, compounding the miss rate on real iPhones.

FIX: button now covers a full-height 44px-wide zone at the field's right
edge (inset-y-0 right-0 w-11 = 44x40), icon flex-centered (visual position
moved 2px), explicit z-10, touch-manipulation; input pr-10 -> pr-12 to
clear it. Same onClick/type/aria-labels. Local before/after: thumb-zone
hit rate 13% -> 91% (0% now lands on the input); the exact tap that
previously focused the input now toggles.

LIVE proof (deployed l2gp page, real invite fixture vs real dev services —
NO stubs). Fixture: business_team_members 999380, email invite
eye.toggle.proof@bizzytest.com (business 267, staff) -> validate returned
credential_step create_account, requires_otp false.

Mobile (iPhone 14 profile, chromium touch emulation; taps at the exact
pre-fix failure point — icon center +8px):
  01_mobile_masked.png                     type=password, "Proof1234" masked
  02_mobile_visible_after_tap.png          tap -> type=text, value readable
  03_mobile_masked_after_second_tap.png    tap -> type=password again
  Live geometry on deployed page: button 44x40, z-index 10 (fix confirmed
  in the served build).

Form still submits (04_mobile_form_submitted_code_screen.png): filled
password + phone 5555550993, tapped submit -> real send-code 200 ->
"Code sent to (555) 555-0993" confirm screen. Eye taps never submitted.

Desktop re-check (05_desktop_visible_after_click.png): 1440x900, mouse
clicks toggle password -> text -> password; icon in the same visual spot
(center 22px from field right vs 20px before), vertically centered.

Checks: tsc clean · eslint clean on touched file · 254 tests pass ·
prod build clean.

Cleanup: business_team_members 999380 deleted, user_verifications 7056
(team-invite+5555550993@bizzy.local) deleted. 0 remnants (invites, OTP
rows, users all verified 0). Rows 999369/999370 found pre-existing at
insert time — other sessions' fixtures, NOT touched.

STOP: rides the prod web wave. PROD web owed.
