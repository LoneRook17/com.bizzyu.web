// Customer-facing availability for a line-skip night (LS-UI-2).
//
// Luke ruling: NEVER disclose remaining counts to customers. A capacity-limited
// night that still has room is presented IDENTICALLY to an unlimited one
// ("Available") — no "N left" text, no capacity progress bar. Only a genuinely
// sold-out night gets a distinct state. The server may keep sending capacity /
// tickets_sold; the client simply stops rendering the count.

export interface NightCapacity {
  /** null = unlimited. */
  capacity: number | null
  tickets_sold: number
}

export type NightAvailability = "sold_out" | "available"

/** The only thing a customer is allowed to learn: sold out, or available. */
export function nightAvailability(inst: NightCapacity): NightAvailability {
  if (inst.capacity !== null && inst.tickets_sold >= inst.capacity) return "sold_out"
  return "available"
}

/**
 * Internal-only cap for the quantity stepper. NOT customer-facing — never render
 * this as a count. It exists solely to stop a buyer adding more tickets than a
 * limited night has left. null = unlimited (no cap).
 */
export function remainingCapacity(inst: NightCapacity): number | null {
  return inst.capacity !== null ? inst.capacity - inst.tickets_sold : null
}
