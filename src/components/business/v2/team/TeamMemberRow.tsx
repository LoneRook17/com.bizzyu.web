"use client"

import { useState } from "react"
import { AlertCircle, ChevronRight, Globe, Link2, MapPin, MoreHorizontal, Trash2 } from "lucide-react"
import { cn } from "@/lib/v2/utils"
import { ROLE_LABELS } from "@/lib/business/constants"
import { memberDisplay } from "@/lib/team-invite/display"
import type { TeamMember, Venue } from "@/lib/business/types"
import {
  memberVenueIds, venueScopeLabel, venueEditorModel,
  type EditorScope,
} from "@/lib/business/team-venues"
import { payoutsToggleState } from "@/lib/business/team-payouts-access"
import { Badge } from "@/components/business/v2/ui/badge"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/business/v2/ui/dropdown-menu"
import { Sheet, SheetContent } from "@/components/business/v2/ui/sheet"
import { FramedAvatar } from "@/components/business/v2/Sidebar"
import { Button } from "@/components/business/v2/ui/button"
import { Select } from "@/components/business/v2/ui/input"
import VenueMultiSelect from "./VenueMultiSelect"
import PayoutsAccessControl from "./PayoutsAccessControl"

interface TeamMemberRowProps {
  member: TeamMember
  currentUserRole: string
  /** TM-B3 (#15b): the viewing user's own scope, so a scoped manager only
   *  edits their own venues (out-of-scope venues lock, global hides). */
  editorScope: EditorScope
  venues: Venue[]
  onRemove: (member: TeamMember) => void
  onRoleChange: (memberId: number, newRole: string) => void
  /** TM-B2 (#15): set-aware venue assignment. `[]` = clear to global. */
  onVenuesChange: (memberId: number, venueIds: number[]) => void
  onResend?: (member: TeamMember) => void
  /** TM-B3 (#15b): inline error for this row (e.g. 403 VENUE_SCOPE_FORBIDDEN). */
  venueError?: string
  /** PAYOUTS-PER-PERSON-ACCESS: owner flips a member's Payouts-page access. */
  onPayoutsAccessChange?: (memberId: number, enabled: boolean) => void
  /** This row's Payouts-access grant is saving (disable the toggle). */
  payoutsAccessSaving?: boolean
  /** Inline error for a failed Payouts-access flip (post-revert). */
  payoutsAccessError?: string
}

const ASSIGNABLE_ROLES = ["manager", "staff"]

type BadgeVariant = "warning" | "danger"

/**
 * What the row says about an invite that has not been accepted yet — never a
 * silent-success row, and never a guess.
 *
 * Terminal states outrank delivery: a revoked or expired invite is not "sent",
 * whatever happened to the email a fortnight ago.
 *
 * The `default` arm is the grandfather guarantee: a legacy row carries no
 * `invite_delivery`, so it falls through to the exact "Pending invite" badge it
 * rendered before this change. Nothing new is inferred about rows the new flow
 * did not create.
 */
function inviteBadge(member: TeamMember, isExpired: boolean): { label: string; variant: BadgeVariant } {
  if (member.invite_revoked_at) return { label: "Invite revoked", variant: "danger" }
  if (isExpired) return { label: "Invite expired", variant: "danger" }

  switch (member.invite_delivery) {
    case "email_sent":
      return { label: "Invite sent", variant: "warning" }
    case "email_failed":
      // The invite is live and the link works — only the email failed. Says so,
      // rather than reporting a send that did not happen.
      return { label: "Email failed. Send the link", variant: "danger" }
    case "link_only":
      // Bizzy sends no invite SMS: until the owner texts the link, nothing has
      // reached this person at all.
      return { label: "Not sent yet. Send the link", variant: "warning" }
    default:
      return { label: "Pending invite", variant: "warning" }
  }
}

/**
 * BETA visual polish (mock 03): the roster is ONE table. md and up, a member is
 * a 50px row: Member · Role · Venue access · Payouts · Status · Joined · ⋯
 * (Joined from xl). Below md the row is name + scope + role, and tapping it
 * opens the member sheet with the same controls, so nothing a phone owner
 * could do before is gone. The decisions (who may edit what, invite badge
 * wording, payouts state) are unchanged; only where they render moved.
 */
export const TEAM_ROW_GRID =
  "md:grid md:grid-cols-[minmax(0,1.5fr)_7rem_minmax(0,1.3fr)_4.5rem_8rem_2.25rem] md:items-center md:gap-x-3 xl:grid-cols-[minmax(0,1.5fr)_7.5rem_minmax(0,1.3fr)_5rem_8.5rem_5rem_2.25rem]"

export function TeamTableHeader({ payoutsInfo }: { payoutsInfo?: React.ReactNode }) {
  return (
    // Visual column labels only (rows are controls, not an ARIA grid). The
    // payouts info button stays reachable: it is the one focusable child.
    <div className={cn("hidden h-11 px-4 text-[12px] font-medium text-neutral-500 md:grid dark:text-neutral-400", TEAM_ROW_GRID)}>
      <span>Member</span>
      <span>Role</span>
      <span>Venue access</span>
      <span className="flex items-center gap-1">Payouts {payoutsInfo}</span>
      <span>Status</span>
      <span className="hidden xl:block">Joined</span>
      <span aria-hidden />
    </div>
  )
}

export default function TeamMemberRow({
  member, currentUserRole, editorScope, venues, onRemove, onRoleChange, onVenuesChange, onResend, venueError,
  onPayoutsAccessChange, payoutsAccessSaving, payoutsAccessError,
}: TeamMemberRowProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const isOwnerViewing = currentUserRole === "owner"
  const isOwnerMember = member.role === "owner"
  const scopeIds = memberVenueIds(member)
  // PAYOUTS-PER-PERSON-ACCESS: "hidden" for every non-owner viewer and every
  // legacy/absent grant, so the row renders exactly as today for them. "owner"
  // (inherent, disabled chip) / "on" / "off" (mutable) for an owner viewer.
  const payoutsState = payoutsToggleState(currentUserRole, member)
  const showsPayouts = payoutsState !== "hidden"
  // UNCHANGED by the #5 work, deliberately. It mirrors the server's own access
  // rule (resolveActiveBusinessId.ts:34 — is_active=1 AND (invite_accepted_at
  // IS NOT NULL OR role='owner')), so the badge agrees with who can actually
  // get in, and the owner exemption is what keeps the 181 grandfathered owner
  // rows (of 196) badge-free. Widening this to "no invite_delivery = broken"
  // would light up every legacy row.
  const isPending = !member.invite_accepted_at && !isOwnerMember
  const isExpired = isPending && !!member.invite_expires_at && new Date(member.invite_expires_at) < new Date()
  const badge = isPending ? inviteBadge(member, isExpired) : null

  // TM-B3 (#15b): what the viewer may assign to THIS member. Owners/global
  // managers are unrestricted; a scoped manager toggles only their own venues.
  // Per the 2026-07-27 ruling the member's out-of-scope venues never surface to
  // a scoped manager (no options, no locked chips); the server preserves them.
  const editor = venueEditorModel(editorScope, scopeIds, venues)
  // Role/remove stay owner-only; managers get the venue editor only.
  const canEditRole = isOwnerViewing && !isOwnerMember
  const canEditVenues = !isOwnerMember && editor.canEdit
  const canResend = isPending && !!onResend
  const canRemove = isOwnerViewing && !isOwnerMember
  const hasMenu = canResend || canRemove

  const joinedSource = member.invite_accepted_at ?? member.created_at
  const joinedShort = joinedSource
    ? new Date(joinedSource).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "-"
  const joinedLong = joinedSource
    ? new Date(joinedSource).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "-"

  // Never-blank (TI-3w / fixes TI-F1): a provisional or phone-only row used to
  // render with no name and a "?" avatar because the row keyed off `email`. The
  // display helper always returns something — provisional name, then masked
  // phone, then a floor — so a row is never blank. Legacy email-keyed rows
  // resolve to their email exactly as before.
  const display = memberDisplay(member)
  const scopeLabel = venueScopeLabel(member, venues)
  const roleLabel = ROLE_LABELS[member.role] ?? (member.role || "-")

  const roleSelect = (className?: string) => (
    <Select
      value={member.role}
      onChange={(e) => onRoleChange(member.id, e.target.value)}
      title="Role"
      aria-label={`Role for ${display.name}`}
      className={className}
    >
      {ASSIGNABLE_ROLES.map((r) => (
        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
      ))}
    </Select>
  )

  const statusCell = badge ? (
    <Badge size="sm" variant={badge.variant} className="max-w-full truncate" title={badge.label}>{badge.label}</Badge>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-neutral-600 dark:text-neutral-300">
      <span aria-hidden className="size-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500" /> Active
    </span>
  )

  const errors = (
    <>
      {/* TM-B3 (#15b): inline scope error (no alert, no state corruption). */}
      {venueError && (
        <p className="flex items-center gap-1 text-xs text-red-600 dark:text-[#FF6B72]">
          <AlertCircle className="size-3 shrink-0" />
          <span>{venueError}</span>
        </p>
      )}
      {/* PAYOUTS-PER-PERSON-ACCESS: inline error after a failed flip (reverted). */}
      {payoutsAccessError && (
        <p className="flex items-center gap-1 text-xs text-red-600 dark:text-[#FF6B72]">
          <AlertCircle className="size-3 shrink-0" />
          <span>{payoutsAccessError}</span>
        </p>
      )}
    </>
  )

  const nameCell = (
    <span className="flex min-w-0 items-center gap-3">
      <FramedAvatar label={display.name} className="size-8 text-[11px]" />
      <span className="min-w-0">
        <span className={cn(
          "block truncate text-sm font-medium",
          display.isProvisional ? "text-neutral-500 dark:text-neutral-400" : "text-neutral-900 dark:text-neutral-100"
        )}>{display.name}</span>
      </span>
    </span>
  )

  return (
    <div className="flex flex-col">
      {/* md and up: the table row */}
      <div className={cn("hidden min-h-[50px] px-4 py-1.5 md:grid", TEAM_ROW_GRID)}>
        {nameCell}
        <span className="min-w-0">
          {canEditRole
            ? roleSelect("h-8 border-transparent bg-transparent px-1.5 text-[13px] hover:border-neutral-200 dark:border-transparent dark:bg-transparent dark:hover:border-neutral-800")
            : <span className="px-1.5 text-[13px] text-neutral-700 dark:text-neutral-200">{roleLabel}</span>}
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          {canEditVenues ? (
            <VenueMultiSelect
              editor={editor}
              value={scopeIds}
              triggerLabel={scopeLabel}
              onCommit={(venueIds) => onVenuesChange(member.id, venueIds)}
              className="h-8 w-full border-transparent bg-transparent px-1.5 text-[13px] hover:border-neutral-200 sm:w-full dark:border-transparent dark:bg-transparent dark:hover:border-neutral-800"
            />
          ) : (
            <span className="flex min-w-0 items-center gap-1.5 px-1.5 text-[13px] text-neutral-600 dark:text-neutral-300">
              {scopeIds.length === 0 ? <Globe className="size-3.5 shrink-0 text-neutral-400" /> : <MapPin className="size-3.5 shrink-0 text-neutral-400" />}
              <span className="truncate">{scopeLabel}</span>
            </span>
          )}
        </span>
        <span>
          {showsPayouts ? (
            <PayoutsAccessControl
              compact
              state={payoutsState}
              saving={payoutsAccessSaving}
              onChange={(enabled) => onPayoutsAccessChange?.(member.id, enabled)}
            />
          ) : (
            <span className="text-[13px] text-neutral-400 dark:text-neutral-600">-</span>
          )}
        </span>
        <span className="min-w-0">{statusCell}</span>
        <span className="hidden text-[13px] tabular-nums text-neutral-500 xl:block dark:text-neutral-400" title={joinedLong}>{joinedShort}</span>
        <span className="justify-self-end">
          {hasMenu ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`Actions for ${display.name}`}
                className="flex size-9 items-center justify-center rounded-lg text-neutral-400 outline-none transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:ring-2 focus-visible:ring-[#05EB54]/40 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* Was expired-only. Now on every unaccepted row, because under
                    the #5 contract the link is the deliverable and this is the
                    only way to get one. Mints a fresh invite; it never alters
                    the membership. */}
                {canResend && (
                  <DropdownMenuItem onSelect={() => onResend?.(member)}><Link2 /> Send link</DropdownMenuItem>
                )}
                {canResend && canRemove && <DropdownMenuSeparator />}
                {canRemove && (
                  <DropdownMenuItem
                    onSelect={() => onRemove(member)}
                    className="text-red-600 focus:text-red-700 [&_svg]:text-red-600 dark:text-[#FF6B72] dark:[&_svg]:text-[#FF6B72]"
                  >
                    <Trash2 /> Remove
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </span>
      </div>
      {(venueError || payoutsAccessError) && <div className="hidden px-4 pb-2 pl-[3.75rem] md:block">{errors}</div>}

      {/* Phone: name + scope (or invite state) + role; the row opens the sheet */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="flex min-h-[52px] items-center gap-3 px-4 py-2 text-left outline-none transition-colors hover:bg-neutral-50 focus-visible:bg-neutral-50 md:hidden dark:hover:bg-neutral-800/40 dark:focus-visible:bg-neutral-800/40"
      >
        <FramedAvatar label={display.name} className="size-8 text-[11px]" />
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-sm font-medium", display.isProvisional ? "text-neutral-500 dark:text-neutral-400" : "text-neutral-900 dark:text-neutral-100")}>{display.name}</span>
          <span className={cn("block truncate text-[12px]", badge?.variant === "danger" ? "text-red-600 dark:text-[#FF6B72]" : "text-neutral-500 dark:text-neutral-400")}>
            {badge ? badge.label : scopeLabel}
          </span>
        </span>
        <span className="shrink-0 text-[13px] text-neutral-600 dark:text-neutral-300">{roleLabel}</span>
        <ChevronRight className="size-4 shrink-0 text-neutral-400 dark:text-neutral-600" />
      </button>
      {(venueError || payoutsAccessError) && <div className="px-4 pb-2 md:hidden">{errors}</div>}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          title={display.name}
          description={member.email && member.email !== display.name ? member.email : roleLabel}
          footer={
            canResend || canRemove ? (
              <>
                {canRemove && (
                  <Button variant="ghost" onClick={() => { setSheetOpen(false); onRemove(member) }} className="mr-auto text-red-600 hover:bg-red-50 dark:text-[#FF6B72] dark:hover:bg-[#FF6B72]/10">
                    Remove
                  </Button>
                )}
                {canResend && (
                  <Button variant="secondary" onClick={() => { setSheetOpen(false); onResend?.(member) }}>
                    Send link
                  </Button>
                )}
              </>
            ) : undefined
          }
        >
          <dl className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
            <div className="flex min-h-12 items-center justify-between gap-3 py-2">
              <dt className="text-sm text-neutral-500 dark:text-neutral-400">Role</dt>
              <dd className="min-w-0">{canEditRole ? roleSelect("h-10 w-36") : <span className="text-sm text-neutral-900 dark:text-neutral-100">{roleLabel}</span>}</dd>
            </div>
            <div className="flex min-h-12 items-center justify-between gap-3 py-2">
              <dt className="shrink-0 text-sm text-neutral-500 dark:text-neutral-400">Venue access</dt>
              <dd className="flex min-w-0 justify-end">
                {canEditVenues ? (
                  <VenueMultiSelect
                    editor={editor}
                    value={scopeIds}
                    triggerLabel={scopeLabel}
                    align="end"
                    onCommit={(venueIds) => onVenuesChange(member.id, venueIds)}
                    className="h-10 w-48 flex-none text-sm sm:w-48"
                  />
                ) : (
                  <span className="truncate text-sm text-neutral-900 dark:text-neutral-100">{scopeLabel}</span>
                )}
              </dd>
            </div>
            {showsPayouts && (
              <div className="flex min-h-12 items-center justify-between gap-3 py-2">
                <dt className="sr-only">Payouts</dt>
                <dd className="flex w-full justify-between">
                  <PayoutsAccessControl
                    state={payoutsState}
                    saving={payoutsAccessSaving}
                    onChange={(enabled) => onPayoutsAccessChange?.(member.id, enabled)}
                  />
                </dd>
              </div>
            )}
            <div className="flex min-h-12 items-center justify-between gap-3 py-2">
              <dt className="text-sm text-neutral-500 dark:text-neutral-400">Status</dt>
              <dd>{statusCell}</dd>
            </div>
            <div className="flex min-h-12 items-center justify-between gap-3 py-2">
              <dt className="text-sm text-neutral-500 dark:text-neutral-400">Joined</dt>
              <dd className="text-sm tabular-nums text-neutral-900 dark:text-neutral-100">{joinedLong}</dd>
            </div>
          </dl>
          <div className="mt-3 flex flex-col gap-1">{errors}</div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
