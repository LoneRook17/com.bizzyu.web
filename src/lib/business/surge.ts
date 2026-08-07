import { apiClient, ApiError } from './api-client'
import type { SurgeEntityType, StepInput } from './surge-validation'

/**
 * Surge-pricing dashboard client (S3). Talks to the deployed Node services
 * `/business/surge` endpoints (owner/manager only, D18). Pure validation lives
 * in ./surge-validation (re-exported here) so the editor catches a bad ladder
 * before the round-trip — the server stays authoritative.
 */
export {
  validateLadderSteps,
  stepMultiplier,
  fmtCents,
  isPositiveInt,
  canConfigureSurge,
} from './surge-validation'
export type { SurgeEntityType, StepInput } from './surge-validation'

export interface SurgeStep {
  id: number
  ladder_id: number
  step_index: number
  threshold_sold: number
  price_cents: number
  fired_at: string | null
  fired_sold_count: number | null
  fired_source: string | null
}

export interface SurgeLadder {
  id: number
  entity_type: SurgeEntityType
  entity_id: number
  base_price_cents: number
  manual_override_cents: number | null
  is_active: boolean
  created_by: number | null
  created_at: string
  updated_at: string
}

export interface SurgeLadderView {
  entity_default_base_cents?: number
  ladder: SurgeLadder | null
  steps: SurgeStep[]
  current_price_cents?: number | null
  current_sold_count?: number
  multipliers?: number[]
}

export interface PreviewResult {
  requires_confirmation: boolean
  already_passed_steps: StepInput[]
  current_sold_count: number
  multipliers: number[]
}

export interface FireHistory {
  ladder: SurgeLadder
  base_price_cents: number
  current_price_cents: number | null
  fired_steps: Array<{
    step_index: number
    threshold_sold: number
    price_cents: number
    fired_at: string | null
    fired_sold_count: number | null
    fired_source: string | null
    surge_over_base_cents: number
  }>
}

// ── API ─────────────────────────────────────────────────────────────────────

export const surgeApi = {
  get(entityType: SurgeEntityType, entityId: number) {
    return apiClient.get<SurgeLadderView>(`/business/surge/${entityType}/${entityId}`)
  },
  createLadder(entityType: SurgeEntityType, entityId: number, body: { base_price_cents?: number; steps: StepInput[] }) {
    return apiClient.post<SurgeLadderView & { ladder_id: number }>(`/business/surge/${entityType}/${entityId}`, body)
  },
  preview(ladderId: number, steps: StepInput[]) {
    return apiClient.post<PreviewResult>(`/business/surge/ladders/${ladderId}/preview`, { steps })
  },
  /**
   * Save an edited ladder. A 409 means already-passed steps would fire on save —
   * surfaced as `{ requiresConfirmation, preview }` so the card can show the
   * fire-on-save dialog; re-call with confirm=true to apply.
   */
  async saveSteps(
    ladderId: number,
    steps: StepInput[],
    confirm = false,
  ): Promise<{ requiresConfirmation: true; preview: PreviewResult } | { requiresConfirmation: false; view: SurgeLadderView }> {
    try {
      const view = await apiClient.put<SurgeLadderView>(`/business/surge/ladders/${ladderId}/steps`, { steps, confirm })
      return { requiresConfirmation: false, view }
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && (e.body as { requires_confirmation?: boolean }).requires_confirmation) {
        return { requiresConfirmation: true, preview: e.body as unknown as PreviewResult }
      }
      throw e
    }
  },
  setOverride(ladderId: number, overrideCents: number | null) {
    return apiClient.post<SurgeLadderView>(`/business/surge/ladders/${ladderId}/override`, { override_cents: overrideCents })
  },
  setActive(ladderId: number, isActive: boolean) {
    return apiClient.post<SurgeLadderView>(`/business/surge/ladders/${ladderId}/active`, { is_active: isActive })
  },
  history(ladderId: number) {
    return apiClient.get<FireHistory>(`/business/surge/ladders/${ladderId}/history`)
  },
}
