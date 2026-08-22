"use client"

import { createContext, useContext, type ReactNode } from "react"

/**
 * Marks a subtree as Weekly Cover so shared dashboard controls (the v2 Button
 * primary variant, checkboxes, upload spinner) use the access pink token
 * instead of Bizzy green. Event create/edit must not wrap with this.
 */
const WeeklyCoverAccentContext = createContext(false)

export function WeeklyCoverAccent({ children }: { children: ReactNode }) {
  return (
    <WeeklyCoverAccentContext.Provider value={true}>
      {children}
    </WeeklyCoverAccentContext.Provider>
  )
}

export function useWeeklyCoverAccent() {
  return useContext(WeeklyCoverAccentContext)
}

export const WEEKLY_COVER_CHECKBOX_CLASS =
  "size-4 rounded border-neutral-300 text-access accent-access focus:ring-access dark:border-neutral-700"
export const WEEKLY_COVER_RADIO_CLASS = "text-access accent-access focus:ring-access"
export const EVENT_CHECKBOX_CLASS =
  "size-4 rounded border-neutral-300 text-[#05EB54] accent-[#05EB54] focus:ring-[#05EB54] dark:border-neutral-700"
export const EVENT_RADIO_CLASS = "text-[#05EB54] accent-[#05EB54] focus:ring-[#05EB54]"

export function useProductCheckboxClass() {
  return useWeeklyCoverAccent() ? WEEKLY_COVER_CHECKBOX_CLASS : EVENT_CHECKBOX_CLASS
}

export function useProductRadioClass() {
  return useWeeklyCoverAccent() ? WEEKLY_COVER_RADIO_CLASS : EVENT_RADIO_CLASS
}
