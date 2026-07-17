"use client"

// Dev-only control for driving each arm of the line-skip PI contract while the
// services half is still unbuilt. Reached only through a `MOCK_ENABLED &&`
// branch, which folds to false in a prod build and takes this chunk with it.

import { useState } from "react"

import { getMockScenario, setMockScenario, type MockScenario } from "@/lib/lineskip-pi/mock"

const SCENARIOS: { id: MockScenario; label: string }[] = [
  { id: "success", label: "Success → fulfilled" },
  { id: "decline", label: "Card declined" },
  { id: "requires_action", label: "3DS required" },
  { id: "sold_out", label: "409 sold out (no charge)" },
  { id: "refunded_sold_out", label: "Sold out → refunded" },
  { id: "pending", label: "Pending → check texts" },
]

export default function MockScenarioPicker() {
  const [active, setActive] = useState<MockScenario>(getMockScenario())

  return (
    <div className="mb-4 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-3">
      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-amber-400/80">
        Mock mode · no real payment
      </p>
      <div className="flex flex-wrap gap-1.5">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setMockScenario(s.id)
              setActive(s.id)
            }}
            className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors ${
              active === s.id
                ? "bg-amber-400 text-black"
                : "bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
