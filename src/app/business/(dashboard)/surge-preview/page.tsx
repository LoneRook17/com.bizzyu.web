"use client"

import { useState } from "react"
import { SurgeCard } from "@/components/business/SurgeCard"
import type { SurgeEntityType } from "@/lib/business/surge-validation"

/**
 * S3 PREVIEW ONLY — a scratch page to exercise the Surge card against the
 * deployed dev Node services (`/business/surge`). It is NOT the production
 * placement: D10/D11 put the card on the event manage page (per ticket tier) and
 * the line-skip-night panel. The <SurgeCard/> component is production-ready to
 * drop into those pages when the feature un-darks with the coordinated launch;
 * this page just lets you drive it end-to-end now (create ladder → watch a step
 * fire from a driven sale → history renders), and flip the role to prove the D18
 * owner/manager gate (staff renders nothing).
 */
export default function SurgePreviewPage() {
  const [entityType, setEntityType] = useState<SurgeEntityType>("event_ticket")
  const [entityId, setEntityId] = useState("")
  const [role, setRole] = useState("owner")
  const [show, setShow] = useState<{ type: SurgeEntityType; id: number } | null>(null)

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold">Surge card — preview</h1>
        <p className="text-sm text-gray-500">Dev/preview harness for the surge configurator. Not shipped.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
        <label className="text-sm">
          <div className="mb-1 text-gray-600">Entity</div>
          <select value={entityType} onChange={(e) => setEntityType(e.target.value as SurgeEntityType)} className="rounded border px-2 py-1">
            <option value="event_ticket">event_ticket (tier)</option>
            <option value="line_skip_night">line_skip_night</option>
          </select>
        </label>
        <label className="text-sm">
          <div className="mb-1 text-gray-600">Entity id</div>
          <input value={entityId} onChange={(e) => setEntityId(e.target.value)} className="w-28 rounded border px-2 py-1" placeholder="e.g. 493" />
        </label>
        <label className="text-sm">
          <div className="mb-1 text-gray-600">Role (D18)</div>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded border px-2 py-1">
            <option value="owner">owner</option>
            <option value="manager">manager</option>
            <option value="staff">staff</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            const id = Number(entityId)
            if (Number.isInteger(id) && id > 0) setShow({ type: entityType, id })
          }}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          Load card
        </button>
      </div>

      {role === "staff" && show && (
        <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-500">
          Staff sees nothing here — the card returns null for non owner/manager (D18). Switch the role to owner/manager.
        </div>
      )}

      {show && (
        <SurgeCard key={`${show.type}-${show.id}-${role}`} entityType={show.type} entityId={show.id} role={role} />
      )}
    </div>
  )
}
