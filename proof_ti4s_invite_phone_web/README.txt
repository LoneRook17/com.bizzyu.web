TI-4s WEB — accept-page phone capture + name pre-fill — l2gp live proof 2026-07-29
Deploy: com-bizzyu-web-l2gp-jvb5q9ku9 (Production, READY), dev @ 476c9da
Against: dev services :202 (TI-4s contract), business 267, all screenshots on the
public https://com-bizzyu-web-l2gp.vercel.app domain via Playwright 1280x900.

Flow A — email invite, NEW user, needs_phone:true (member 999359, ti4sweb-proof@bizzytest.com)
  01_prefill_and_phone_field.png  name pre-filled "Webley Proofname" from validate's
                                  provisional_name; Mobile number field + "Text me a code"
  02_details_taken_number.png     details filled; phone = (555) 555-0199 (user 5561's number)
  03_409_phone_in_use.png         send-code 409 PHONE_IN_USE -> "That number is already on a
                                  Bizzy account. Log in with that account instead, or use a
                                  different number." (login link, not a dead end)
                                  (alert verified to clear when the number is edited)
  04_code_screen.png              phone corrected to (561) 555-0142 -> "Code sent to (561)
                                  555-0142", resend link, "Use a different number"
  05_code_filled.png              OTP 343050 (read from dev RDS user_verifications sentinel
                                  team-invite+5615550142@bizzy.local)
  06_accepted_dashboard.png       accept {token,name,email,password,phone,code} -> landed
                                  signed-in on /business

  DB proof after accept: users row 999245 "Webley Proofname" ti4sweb-proof@bizzytest.com
  phone_number=+15615550142 password=$2y$..., member 999359 accepted + user_id stamped,
  OTP sentinel consumed.

Flow B — regression, email invite -> account WITH phone, needs_phone:false (member 999360)
  07_regression_no_phone_step.png validate: needs_phone:false, credential_step:none ->
                                  EXACT old flow: no phone field, no name field, single
                                  "Accept and join" button
  08_regression_accepted.png      accepted via old flow -> /business

Cleanup: memberships 999359/999360, users 999244/999245 deleted; 0 remnants.
(1 unrelated expired team-invite OTP row from the earlier services session left as-is.)
