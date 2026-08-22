import { WeeklyCoverAccent } from "@/components/business/v2/door-access/WeeklyCoverAccent"

/**
 * Every Weekly Cover host surface lives under /business/door-access.
 * The accent provider remaps primary buttons and form controls to pink
 * without touching event create/edit (those stay under /business/events).
 */
export default function DoorAccessLayout({ children }: { children: React.ReactNode }) {
  return <WeeklyCoverAccent>{children}</WeeklyCoverAccent>
}
