"use client"

// Dev-only control for driving each arm of the invite half of the #5 contract
// while the services half (N1) is unbuilt. Reached only through an inline
// `process.env.NEXT_PUBLIC_TEAM_INVITE_MOCK === "1"` compare, which folds to
// false in a prod build and takes this chunk with it.

import { useState } from "react"

import {
  getInviteScenario,
  setInviteScenario,
  type InviteScenario,
} from "@/lib/team-invite/mock"

const SCENARIOS: { id: InviteScenario; label: string }[] = [
  { id: "phone_link_only", label: "Phone → link only" },
  { id: "email_sent", label: "Email → sent" },
  { id: "multiple_matches", label: "409 multiple matches" },
  { id: "email_failed", label: "EMAIL_FAILED → link" },
  { id: "already_member", label: "Already a member" },
]

export default function MockInviteScenarioPicker() {
  const [active, setActive] = useState<InviteScenario>(getInviteScenario())

  return (
    <div className="mb-1 rounded-xl border border-dashed border-amber-500/50 bg-amber-500/5 p-3">
      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400/80">
        Mock mode · no invite is really created
      </p>
      <div className="flex flex-wrap gap-1.5">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setInviteScenario(s.id)
              setActive(s.id)
            }}
            className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors ${
              active === s.id
                ? "bg-amber-400 text-black"
                : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-white/5 dark:text-white/50 dark:hover:bg-white/10"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
