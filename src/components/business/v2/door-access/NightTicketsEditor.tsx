"use client"

import { useMemo, useRef, useState } from "react"
import type { TicketTier } from "@/lib/business/types"
import {
  applyRecurringNightTier,
  nightTierTicketType,
  parseRecurringNightTier,
  reorderNightTiers,
  toggleNightTierDisabled,
  toggleNightTierSoldOut,
  toTimeInput,
  updateDoorAccessProgram,
  NIGHT_TICKET_APPLY_LABEL,
  NIGHT_TICKET_DRAFT_HINT,
  type DoorAccessNight,
  type DoorAccessNightTier,
  type DoorAccessProgram,
  type NightDraft,
  type NightTierDraft,
} from "@/lib/business/door-access"
import { lowstockInputToStored, lowstockValueToInput } from "@/components/business/v2/events/EventForm"
import {
  StockAlertsCard,
  TicketSection,
  type StockAlertsAdapter,
  type StockAlertsState,
} from "@/components/business/v2/events/ManageSalesTickets"
import { RecurringTierEditor, type RecurringTierRow } from "@/components/business/v2/recurring/RecurringTierEditor"
import { Button } from "@/components/business/v2/ui/button"

/**
 * Night override drafts the same ticket fields as create-series Add ticket
 * tier (RecurringTierEditor): name, type, price, quantity per night,
 * description, scan window, max per person. Hide and sold out stay on the
 * ticket cards. Drag writes sort_order. Save night is the only persist.
 *
 * Do not PUT /business/events/:id/tickets.
 */
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
    name: draftTier?.name ?? tier.name,
    description: draftTier?.description ?? tier.description ?? "",
    price_usd: price ?? 0,
    quantity: quantity ?? 0,
    sold_count: 0,
    max_per_person: draftTier?.max_per_person ?? tier.max_per_person,
    ticket_type: draftTier?.ticket_type ?? nightTierTicketType(tier, program),
    is_hidden: draftTier?.is_disabled ?? tier.is_disabled,
    force_sold_out: draftTier?.sold_out ?? tier.sold_out,
  }
}

function ticketsFromDraft(
  night: DoorAccessNight,
  draft: NightDraft,
  program: DoorAccessProgram
): TicketTier[] {
  return draft.tiers.flatMap((draftTier) => {
    const index = night.tiers.findIndex((t) => t.tier_key === draftTier.tier_key)
    if (index < 0) return []
    return [nightTierToTicket(night.tiers[index], draft, program, index)]
  })
}

function draftTierToRow(draftTier: NightTierDraft): RecurringTierRow {
  return {
    tier_key: draftTier.tier_key,
    name: draftTier.name,
    description: draftTier.description ?? "",
    ticket_type: draftTier.ticket_type,
    priceInput: String(draftTier.price_usd ?? 0),
    quantityInput: String(draftTier.quantity ?? 0),
    maxPerPersonInput: String(draftTier.max_per_person ?? 0),
    valid_from_time: toTimeInput(draftTier.valid_from_time),
    valid_until_time: toTimeInput(draftTier.valid_until_time),
    valid_from_day_offset: draftTier.valid_from_day_offset,
    valid_until_day_offset: draftTier.valid_until_day_offset,
  }
}

function tierIndex(night: DoorAccessNight, ticketId: number | undefined): number {
  if (!ticketId) return -1
  return ticketId - 1
}

function tierKeysFromTickets(night: DoorAccessNight, tickets: TicketTier[]): string[] {
  return tickets.flatMap((ticket) => {
    const source = night.tiers[tierIndex(night, ticket.ticket_id)]
    return source ? [source.tier_key] : []
  })
}

export function NightTicketsEditor({
  program,
  night,
  draft,
  setDraft,
  setProgram,
  editable,
}: {
  program: DoorAccessProgram
  night: DoorAccessNight
  draft: NightDraft
  setDraft: (draft: NightDraft) => void
  setProgram: (program: DoorAccessProgram) => void
  editable: boolean
}) {
  const alertsAdapter = useMemo(
    () => programStockAlertsAdapter(program, setProgram),
    [program, setProgram]
  )

  return (
    <NightOverrideTickets
      program={program}
      night={night}
      draft={draft}
      setDraft={setDraft}
      editable={editable}
      alertsAdapter={alertsAdapter}
    />
  )
}

function NightOverrideTickets({
  program,
  night,
  draft,
  setDraft,
  editable,
  alertsAdapter,
}: {
  program: DoorAccessProgram
  night: DoorAccessNight
  draft: NightDraft
  setDraft: (draft: NightDraft) => void
  editable: boolean
  alertsAdapter: StockAlertsAdapter
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editingRows, setEditingRows] = useState<RecurringTierRow[] | null>(null)
  const [saveError, setSaveError] = useState("")
  const [liveTickets, setLiveTickets] = useState<TicketTier[] | null>(null)
  const liveTicketsRef = useRef<TicketTier[] | null>(null)

  const [alertState, setAlertState] = useState<StockAlertsState>({
    enabled: !!program.lowstock_alerts_enabled,
    thresholdType: program.lowstock_threshold_type ?? "percent",
    thresholdInput: lowstockValueToInput(program.lowstock_threshold_value),
    notifyTeam: !!program.lowstock_notify_business_team,
  })
  const [alertsSaving, setAlertsSaving] = useState(false)
  const [alertsError, setAlertsError] = useState("")
  const [alertsSaved, setAlertsSaved] = useState(false)

  const derivedTickets = useMemo(
    () => ticketsFromDraft(night, draft, program),
    [night, draft, program]
  )
  const tickets = liveTickets ?? derivedTickets
  const active = tickets.filter((t) => !t.is_hidden)
  const hidden = tickets.filter((t) => t.is_hidden)

  const applyTicketDraft = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRows?.[0] || !editingKey) return
    const parsed = parseRecurringNightTier(editingRows[0])
    if (parsed.error) {
      setSaveError(parsed.error)
      return
    }
    const source = night.tiers.find((t) => t.tier_key === editingKey)
    const template = program.template_tickets.find((t) => t.tier_key === editingKey)
    setDraft(
      applyRecurringNightTier(draft, editingKey, parsed.values, {
        name: template?.name ?? source?.name,
        description: template?.description ?? source?.description,
        ticket_type: template?.ticket_type ?? source?.ticket_type,
        price_usd: source?.template_price_usd ?? template?.price_usd,
        quantity: source?.template_quantity ?? template?.quantity,
        max_per_person: template?.max_per_person ?? source?.max_per_person,
        valid_from_time: template?.valid_from_time ?? source?.valid_from_time,
        valid_until_time: template?.valid_until_time ?? source?.valid_until_time,
        valid_from_day_offset: template?.valid_from_day_offset ?? source?.valid_from_day_offset,
        valid_until_day_offset: template?.valid_until_day_offset ?? source?.valid_until_day_offset,
      })
    )
    setSaveError("")
    setEditingRows(null)
    setEditingKey(null)
  }

  const handleToggleHidden = (ticket: TicketTier) => {
    const index = tierIndex(night, ticket.ticket_id)
    const source = night.tiers[index]
    if (!source) return
    setDraft(toggleNightTierDisabled(draft, source.tier_key))
  }

  const handleToggleSoldOut = (ticket: TicketTier) => {
    const index = tierIndex(night, ticket.ticket_id)
    const source = night.tiers[index]
    if (!source) return
    setDraft(toggleNightTierSoldOut(draft, source.tier_key))
  }

  const handleReorder = (section: "active" | "hidden", next: TicketTier[]) => {
    const others = tickets.filter((t) => (section === "active" ? t.is_hidden : !t.is_hidden))
    const ordered = section === "active" ? [...next, ...others] : [...others, ...next]
    liveTicketsRef.current = ordered
    setLiveTickets(ordered)
  }

  const handleDragStart = () => {
    liveTicketsRef.current = tickets
    setLiveTickets(tickets)
  }

  const handleDragEnd = () => {
    const ordered = liveTicketsRef.current
    liveTicketsRef.current = null
    setLiveTickets(null)
    if (!ordered) return
    const keys = tierKeysFromTickets(night, ordered)
    if (keys.join("\0") === draft.tiers.map((t) => t.tier_key).join("\0")) return
    setDraft(reorderNightTiers(draft, keys))
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
    ? { edit: true, soldOut: true, hide: true }
    : { edit: false, soldOut: false, hide: false }

  const startEdit = (t: TicketTier) => {
    const index = tierIndex(night, t.ticket_id)
    const source = night.tiers[index]
    if (!source) return
    const draftTier = draft.tiers.find((tier) => tier.tier_key === source.tier_key)
    if (!draftTier) return
    setSaveError("")
    setEditingKey(source.tier_key)
    setEditingRows([draftTierToRow(draftTier)])
  }

  return (
    <div className="flex flex-col gap-6">
      {editable && (
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400">{NIGHT_TICKET_DRAFT_HINT}</p>
      )}

      {editingRows && (
        <form onSubmit={applyTicketDraft} className="flex flex-col gap-3">
          <RecurringTierEditor
            tiers={editingRows}
            onChange={(rows) => {
              setEditingRows(rows)
              setSaveError("")
            }}
            allowAdd={false}
            allowRemove={false}
          />
          {saveError && <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>}
          <p className="text-[13px] text-neutral-500 dark:text-neutral-400">{NIGHT_TICKET_DRAFT_HINT}</p>
          <div className="flex items-center gap-2">
            <Button type="submit">{NIGHT_TICKET_APPLY_LABEL}</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditingRows(null)
                setEditingKey(null)
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      <TicketSection
        title="Active tickets"
        section="active"
        tickets={active}
        allowReorder={editable}
        onReorder={handleReorder}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onEdit={startEdit}
        onToggleHidden={handleToggleHidden}
        onToggleSoldOut={handleToggleSoldOut}
        toggling={null}
        emptyText="This program has no tiers."
        actions={actions}
      />

      {hidden.length > 0 && (
        <TicketSection
          title="Hidden tickets"
          section="hidden"
          tickets={hidden}
          allowReorder={editable}
          onReorder={handleReorder}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onEdit={startEdit}
          onToggleHidden={handleToggleHidden}
          onToggleSoldOut={handleToggleSoldOut}
          toggling={null}
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
