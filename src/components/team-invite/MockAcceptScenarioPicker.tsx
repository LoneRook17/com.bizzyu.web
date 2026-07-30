"use client"

// Dev-only control for driving every state of the accept page while the
// services half (N1) is unbuilt. Reached only through an inline
// `process.env.NEXT_PUBLIC_TEAM_INVITE_MOCK === "1"` compare, which folds to
// false in a prod build and takes this chunk with it.
//
// Each pick reloads with ?mock_scenario=, because the state is decided by
// validate() at load — there is nothing to re-render in place.

import { getAcceptScenario, type AcceptScenario } from "@/lib/team-invite/mock"

const SCENARIOS: { id: AcceptScenario; label: string }[] = [
  { id: "valid_otp_password", label: "Valid · OTP · has password" },
  { id: "valid_otp_set_password", label: "Valid · OTP · set password" },
  { id: "valid_new_user", label: "Valid · new user" },
  { id: "valid_email_no_otp", label: "Valid · email · no OTP" },
  { id: "valid_email_needs_phone", label: "Valid · email · needs phone" },
  { id: "session_match", label: "Signed in · just accept" },
  { id: "wrong_account", label: "Wrong account" },
  { id: "expired", label: "Expired" },
  { id: "revoked", label: "Revoked" },
  { id: "accepted", label: "Already accepted" },
]

export default function MockAcceptScenarioPicker() {
  const active = getAcceptScenario()

  const go = (id: AcceptScenario) => {
    const url = new URL(window.location.href)
    url.searchParams.set("mock_scenario", id)
    window.location.assign(url.toString())
  }

  return (
    <div className="mb-4 rounded-xl border border-dashed border-amber-500/60 bg-amber-50 p-3">
      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-amber-700">
        Mock mode · no real invite
      </p>
      <div className="flex flex-wrap gap-1.5">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => go(s.id)}
            className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors ${
              active === s.id
                ? "bg-amber-400 text-black"
                : "bg-white text-neutral-500 hover:bg-neutral-100"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-amber-800">
        OTP code in mock mode: <span className="font-mono font-bold">123456</span>
      </p>
    </div>
  )
}
