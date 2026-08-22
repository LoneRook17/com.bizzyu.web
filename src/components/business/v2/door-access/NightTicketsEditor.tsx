"use client"

import { useMemo, useState } from "react"
import type { TicketTier } from "@/lib/business/types"
import {
  applyOverrideTicketForm,
  nightHasEventTickets,
  nightTierTicketType,
  parseOverrideTicketNumbers,
  saveNightOverride,
  toggleNightTierDisabled,
  updateDoorAccessProgram,
  buildNightOverridePayload,
  type DoorAccessNight,
  type DoorAccessNightTier,
  type DoorAccessProgram,
  type NightDraft,
  type NightOverrideResult,
} from "@/lib/business/door-access"
import { lowstockInputToStored, lowstockValueToInput } from "@/components/business/v2/events/EventForm"
import {
  ManageSalesTickets,
  StockAlertsCard,
  TicketEditForm,
  TicketSection,
  ticketToForm,
  type StockAlertsAdapter,
  type StockAlertsState,
  type TicketFormState,
  type TicketFormVisibility,
} from "@/components/business/v2/events/ManageSalesTickets"

/**
 * Night override can persist price, quantity, and is_disabled only. Name and
 * type stay visible so the card matches Manage sales; fields the API cannot
 * store are omitted instead of rendered as dead controls.
 */
export const OVERRIDE_TICKET_FORM_FIELDS: TicketFormVisibility = {
  name: "readonly",
  description: false,
  ticket_type: "readonly",
  price: true,
  quantity: true,
  max_per_person: false,
  scan_window: false,
}

function programStockAlertsAdapter(
  program: DoorAccessProgram,
  onSaved?: (next: DoorAccessProgram) => void
): StockAlertsAdapter {
  return {
    async load() {
      return {
        enabled: !!program.lowstock_alerts_enabled,
        thresholdType: program.lowstock_threshold_type ?? "percent",
        thresholdInput: lowstockValueToInput(program.lowstock_threshold_value),
        notifyTeam: !!program.lowstock_notify_business_team,
      }
    },
    async save(alerts, { value }) {
      const payload: Record<string, unknown> = {
        lowstock_alerts_enabled: alerts.enabled,
        lowstock_notify_business_team: alerts.notifyTeam,
      }
      if (alerts.enabled) {
        if (value != null) {
          payload.lowstock_threshold_type = alerts.thresholdType
          payload.lowstock_threshold_value = value
        } else {
          payload.lowstock_threshold_value = null
        }
      }
      const result = await updateDoorAccessProgram(program.id, payload)
      onSaved?.(result.program)
    },
  }
}

function nightTierToTicket(
  tier: DoorAccessNightTier,
  draft: NightDraft,
  program: DoorAccessProgram,
  index: number
): TicketTier {
  const draftTier = draft.tiers.find((t) => t.tier_key === tier.tier_key)
  const price = draftTier?.price_usd ?? tier.price_usd
  const quantity = draftTier?.quantity ?? tier.quantity
  return {
    ticket_id: index + 1,
    name: tier.name,
    description: tier.description ?? "",
    price_usd: price ?? 0,
    quantity: quantity ?? 0,
    sold_count: 0,
    max_per_person: tier.max_per_person,
    ticket_type: nightTierTicketType(tier, program),
    is_hidden: draftTier?.is_disabled ?? tier.is_disabled,
    force_sold_out: false,
  }
}

function formFromNightTier(
  tier: DoorAccessNightTier,
  draft: NightDraft,
  program: DoorAccessProgram,
  index: number
): TicketFormState {
  return ticketToForm(nightTierToTicket(tier, draft, program, index))
}

function tierIndex(night: DoorAccessNight, ticketId: number | undefined): number {
  if (!ticketId) return -1
  return ticketId - 1
}

export function NightTicketsEditor({
  programId,
  date,
  program,
  night,
  draft,
  setProgram,
  editable,
  onOverrideSaved,
}: {
  programId: number
  date: string
  program: DoorAccessProgram
  night: DoorAccessNight
  draft: NightDraft
  setProgram: (program: DoorAccessProgram) => void
  editable: boolean
  onOverrideSaved: (result: NightOverrideResult) => void
}) {
  const useEventTickets = nightHasEventTickets(night)
  const alertsAdapter = useMemo(
    () => programStockAlertsAdapter(program, setProgram),
    [program, setProgram]
  )

  if (useEventTickets && editable) {
    return (
      <ManageSalesTickets
        eventId={String(night.event_id)}
        allowAdd={false}
        allowReorder
        alertsAdapter={alertsAdapter}
      />
    )
  }

  return (
    <NightOverrideTickets
      programId={programId}
      date={date}
      program={program}
      night={night}
      draft={draft}
      editable={editable}
      onOverrideSaved={onOverrideSaved}
      alertsAdapter={alertsAdapter}
    />
  )
}

function NightOverrideTickets({
  programId,
  date,
  program,
  night,
  draft,
  editable,
  onOverrideSaved,
  alertsAdapter,
}: {
  programId: number
  date: string
  program: DoorAccessProgram
  night: DoorAccessNight
  draft: NightDraft
  editable: boolean
  onOverrideSaved: (result: NightOverrideResult) => void
  alertsAdapter: StockAlertsAdapter
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editing, setEditing] = useState<TicketFormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [togglingKey, setTogglingKey] = useState<string | null>(null)
  const [error, setError] = useState("")

  const [alertState, setAlertState] = useState<StockAlertsState>({
    enabled: !!program.lowstock_alerts_enabled,
    thresholdType: program.lowstock_threshold_type ?? "percent",
    thresholdInput: lowstockValueToInput(program.lowstock_threshold_value),
    notifyTeam: !!program.lowstock_notify_business_team,
  })
  const [alertsSaving, setAlertsSaving] = useState(false)
  const [alertsError, setAlertsError] = useState("")
  const [alertsSaved, setAlertsSaved] = useState(false)

  const tickets = night.tiers.map((tier, index) => nightTierToTicket(tier, draft, program, index))
  const active = tickets.filter((t) => !t.is_hidden)
  const hidden = tickets.filter((t) => t.is_hidden)

  const persistDraft = async (next: NightDraft) => {
    const result = await saveNightOverride(programId, date, buildNightOverridePayload(next))
    onOverrideSaved(result)
    return result
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing || !editingKey) return
    const parsed = parseOverrideTicketNumbers(editing.price_usd, editing.quantity)
    if (parsed.error) {
      setSaveError(parsed.error)
      return
    }
    const source = night.tiers.find((t) => t.tier_key === editingKey)
    const next = applyOverrideTicketForm(
      draft,
      editingKey,
      parsed.price_usd,
      parsed.quantity,
      source?.template_price_usd,
      source?.template_quantity
    )
    setSaving(true)
    setSaveError("")
    try {
      await persistDraft(next)
      setEditing(null)
      setEditingKey(null)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save ticket")
    } finally {
      setSaving(false)
    }
  }

  const handleToggleHidden = async (ticket: TicketTier) => {
    const index = tierIndex(night, ticket.ticket_id)
    const source = night.tiers[index]
    if (!source) return
    const next = toggleNightTierDisabled(draft, source.tier_key)
    setTogglingKey(source.tier_key)
    setError("")
    try {
      await persistDraft(next)
      if (editingKey === source.tier_key) {
        setEditing(formFromNightTier(source, next, program, index))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update visibility")
    } finally {
      setTogglingKey(null)
    }
  }

  const saveAlerts = async () => {
    const { value, error } = lowstockInputToStored(alertState.thresholdType, alertState.thresholdInput)
    if (error) {
      setAlertsError(error)
      return
    }
    setAlertsSaving(true)
    setAlertsError("")
    setAlertsSaved(false)
    try {
      await alertsAdapter.save(alertState, { value })
      setAlertsSaved(true)
      setTimeout(() => setAlertsSaved(false), 2500)
    } catch (err) {
      setAlertsError(err instanceof Error ? err.message : "Failed to save stock alerts")
    } finally {
      setAlertsSaving(false)
    }
  }

  const actions = editable
    ? { edit: true, soldOut: false, hide: true }
    : { edit: false, soldOut: false, hide: false }

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {editing && (
        <TicketEditForm
          editing={editing}
          onChange={setEditing}
          onSave={handleSave}
          onCancel={() => {
            setEditing(null)
            setEditingKey(null)
          }}
          saving={saving}
          saveError={saveError}
          fields={OVERRIDE_TICKET_FORM_FIELDS}
        />
      )}

      <TicketSection
        title="Active tickets"
        section="active"
        tickets={active}
        allowReorder={false}
        onReorder={() => {}}
        onDragStart={() => {}}
        onDragEnd={() => {}}
        onEdit={(t) => {
          const index = tierIndex(night, t.ticket_id)
          const source = night.tiers[index]
          if (!source) return
          setSaveError("")
          setEditingKey(source.tier_key)
          setEditing(formFromNightTier(source, draft, program, index))
        }}
        onToggleHidden={handleToggleHidden}
        onToggleSoldOut={() => {}}
        toggling={
          togglingKey
            ? { id: night.tiers.findIndex((t) => t.tier_key === togglingKey) + 1, field: "hidden" }
            : null
        }
        emptyText="This program has no tiers."
        actions={actions}
      />

      {hidden.length > 0 && (
        <TicketSection
          title="Hidden tickets"
          section="hidden"
          tickets={hidden}
          allowReorder={false}
          onReorder={() => {}}
          onDragStart={() => {}}
          onDragEnd={() => {}}
          onEdit={(t) => {
            const index = tierIndex(night, t.ticket_id)
            const source = night.tiers[index]
            if (!source) return
            setSaveError("")
            setEditingKey(source.tier_key)
            setEditing(formFromNightTier(source, draft, program, index))
          }}
          onToggleHidden={handleToggleHidden}
          onToggleSoldOut={() => {}}
          toggling={
            togglingKey
              ? { id: night.tiers.findIndex((t) => t.tier_key === togglingKey) + 1, field: "hidden" }
              : null
          }
          note="Hidden tickets cannot be purchased. Existing ticket holders can still scan in."
          dimmed
          actions={actions}
        />
      )}

      {editable && (
        <StockAlertsCard
          idPrefix="night_"
          alerts={alertState}
          onChange={(next) => {
            setAlertState(next)
            setAlertsError("")
          }}
          onSave={saveAlerts}
          saving={alertsSaving}
          saved={alertsSaved}
          error={alertsError}
        />
      )}
    </div>
  )
}
