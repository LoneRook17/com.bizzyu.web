"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ImagePlus, LayoutGrid, Loader2, Pencil, Plus, Trash2, Wine } from "lucide-react"
import { useAuth } from "@/lib/business/auth-context"
import { apiClient, ApiError } from "@/lib/business/api-client"
import {
  VIP_API,
  canManageVipTables,
  centsToDollarsInput,
  dollarsToCents,
  formatCents,
  type VipBottle,
  type VipFloorPlan,
  type VipFloorPlanTable,
  type VipPackage,
  type VipSettings,
} from "@/lib/business/vip-tables"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Card } from "@/components/business/v2/ui/card"
import { Badge } from "@/components/business/v2/ui/badge"
import { Button } from "@/components/business/v2/ui/button"
import { Input, Select, Textarea } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { Skeleton } from "@/components/business/v2/ui/skeleton"
import { EmptyState } from "@/components/business/v2/ui/empty-state"
import ConfirmDialog from "@/components/business/v2/ConfirmDialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/business/v2/ui/dialog"

/**
 * VIP Tables — the venue's catalog: packages (what a table is sold as) and
 * the bottle menu (what a buyer picks from). Tables themselves live on the
 * floor map (laid out in the map editor); which tables sell on which night is set per event
 * (Manage → VIP Tables).
 */

type PackageForm = { name: string; description: string; price: string; included_bottles: string }
type BottleForm = {
  category: string
  name: string
  size_label: string
  menu_price: string
  included_eligible: boolean
  upcharge: string
  in_stock: boolean
}

const EMPTY_PACKAGE: PackageForm = { name: "", description: "", price: "", included_bottles: "2" }
const EMPTY_BOTTLE: BottleForm = {
  category: "Vodka",
  name: "",
  size_label: "750ml",
  menu_price: "",
  included_eligible: true,
  upcharge: "0",
  in_stock: true,
}

const CATEGORIES = ["Vodka", "Tequila", "Whiskey", "Cognac", "Rum", "Gin", "Champagne", "Wine", "Other"]

/**
 * One table on the map with its photo: the picture buyers see when they tap
 * the table. Uploads through the shared business image upload (S3), then
 * saves the URL on the table.
 */
function TablePhotoRow({
  table,
  canEdit,
  onChanged,
  onError,
}: {
  table: VipFloorPlanTable
  canEdit: boolean
  onChanged: () => Promise<void>
  onError: (message: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const savePhoto = async (url: string | null) => {
    setBusy(true)
    onError(null)
    try {
      await apiClient.put(`${VIP_API}/tables/${table.id}/photo`, { photo_url: url })
      await onChanged()
    } catch (err) {
      onError(errorMessage(err, "Could not save the table photo."))
    } finally {
      setBusy(false)
    }
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    onError(null)
    try {
      const formData = new FormData()
      formData.append("image", file)
      const data = await apiClient.upload<{ url: string }>("/business/upload/image", formData)
      await savePhoto(data.url)
    } catch (err) {
      onError(errorMessage(err, "Could not upload the photo."))
      setBusy(false)
    }
  }

  return (
    <li className="flex items-center gap-3 py-3">
      {table.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={table.photo_url} alt={`Photo of ${table.label}`} className="size-14 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
          <ImagePlus className="size-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-neutral-900 dark:text-neutral-100">{table.label}</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Up to {table.guest_limit}{table.zone ? ` · ${table.zone}` : ""}{!table.photo_url && " · No photo yet"}
        </p>
      </div>
      {canEdit && (
        <div className="flex shrink-0 items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void onFile(e.target.files?.[0])
              e.target.value = ""
            }}
          />
          <Button variant="subtle" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}
            {table.photo_url ? "Change photo" : "Add photo"}
          </Button>
          {table.photo_url && (
            <Button variant="ghost" size="icon" aria-label={`Remove photo of ${table.label}`} disabled={busy} onClick={() => savePhoto(null)}>
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      )}
    </li>
  )
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback
  if (err instanceof Error) return err.message || fallback
  return fallback
}

export default function VipTablesPage() {
  const { user } = useAuth()
  const canEdit = canManageVipTables(user?.business_role)

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [settings, setSettings] = useState<VipSettings | null>(null)
  const [plan, setPlan] = useState<VipFloorPlan | null>(null)
  const [packages, setPackages] = useState<VipPackage[]>([])
  const [bottles, setBottles] = useState<VipBottle[]>([])
  const [openingEditor, setOpeningEditor] = useState(false)

  // The editor is its own page (shared with Bizzy admins). Open the tab first,
  // inside the click, so a popup blocker lets it through; then point it at the
  // editor once the one-business pass comes back.
  const openMapEditor = useCallback(async () => {
    const tab = window.open("", "_blank")
    setOpeningEditor(true)
    try {
      const res = await apiClient.post<{ url: string }>(`${VIP_API}/map-editor-session`, {
        venue_id: plan?.venue_id ?? undefined,
      })
      if (tab) tab.location.href = res.url
      else window.location.href = res.url
    } catch (err) {
      tab?.close()
      setLoadError(errorMessage(err, "Could not open the map editor. Try again."))
    } finally {
      setOpeningEditor(false)
    }
  }, [plan?.venue_id])

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const [s, p, pk, b] = await Promise.all([
        apiClient.get<{ settings: VipSettings }>(`${VIP_API}/settings`),
        apiClient.get<{ floor_plan: VipFloorPlan | null }>(`${VIP_API}/floor-plan`),
        apiClient.get<{ packages: VipPackage[] }>(`${VIP_API}/packages`),
        apiClient.get<{ bottles: VipBottle[] }>(`${VIP_API}/bottles`),
      ])
      setSettings(s.settings)
      setPlan(p.floor_plan)
      setPackages(pk.packages)
      setBottles(b.bottles)
    } catch (err) {
      setLoadError(errorMessage(err, "Could not load VIP tables."))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // ── Package editor ──────────────────────────────────────────────────────
  const [pkgOpen, setPkgOpen] = useState(false)
  const [pkgEditing, setPkgEditing] = useState<VipPackage | null>(null)
  const [pkgForm, setPkgForm] = useState<PackageForm>(EMPTY_PACKAGE)
  const [pkgSaving, setPkgSaving] = useState(false)
  const [pkgError, setPkgError] = useState<string | null>(null)
  const [pkgDelete, setPkgDelete] = useState<VipPackage | null>(null)

  const openPackage = (pkg: VipPackage | null) => {
    setPkgEditing(pkg)
    setPkgForm(
      pkg
        ? {
            name: pkg.name,
            description: pkg.description ?? "",
            price: centsToDollarsInput(pkg.price_cents),
            included_bottles: String(pkg.included_bottles),
          }
        : EMPTY_PACKAGE,
    )
    setPkgError(null)
    setPkgOpen(true)
  }

  const savePackage = async () => {
    const price = dollarsToCents(pkgForm.price)
    if (!pkgForm.name.trim()) return setPkgError("Give the package a name.")
    if (price == null || price < 100) return setPkgError("Enter the package price in dollars.")
    setPkgSaving(true)
    setPkgError(null)
    const body = {
      name: pkgForm.name.trim(),
      description: pkgForm.description.trim() || null,
      price_cents: price,
      included_bottles: Number(pkgForm.included_bottles) || 0,
    }
    try {
      if (pkgEditing) await apiClient.put(`${VIP_API}/packages/${pkgEditing.id}`, body)
      else await apiClient.post(`${VIP_API}/packages`, body)
      setPkgOpen(false)
      await load()
    } catch (err) {
      setPkgError(errorMessage(err, "Could not save the package."))
    } finally {
      setPkgSaving(false)
    }
  }

  const deletePackage = async () => {
    if (!pkgDelete) return
    try {
      await apiClient.delete(`${VIP_API}/packages/${pkgDelete.id}`)
      setPkgDelete(null)
      await load()
    } catch (err) {
      setLoadError(errorMessage(err, "Could not remove the package."))
      setPkgDelete(null)
    }
  }

  // ── Bottle editor ───────────────────────────────────────────────────────
  const [btlOpen, setBtlOpen] = useState(false)
  const [btlEditing, setBtlEditing] = useState<VipBottle | null>(null)
  const [btlForm, setBtlForm] = useState<BottleForm>(EMPTY_BOTTLE)
  const [btlSaving, setBtlSaving] = useState(false)
  const [btlError, setBtlError] = useState<string | null>(null)
  const [btlDelete, setBtlDelete] = useState<VipBottle | null>(null)

  const openBottle = (b: VipBottle | null) => {
    setBtlEditing(b)
    setBtlForm(
      b
        ? {
            category: b.category,
            name: b.name,
            size_label: b.size_label ?? "",
            menu_price: centsToDollarsInput(b.menu_price_cents),
            included_eligible: b.included_eligible,
            upcharge: centsToDollarsInput(b.upcharge_cents) || "0",
            in_stock: b.in_stock,
          }
        : EMPTY_BOTTLE,
    )
    setBtlError(null)
    setBtlOpen(true)
  }

  const saveBottle = async () => {
    const menuPrice = dollarsToCents(btlForm.menu_price)
    const upcharge = dollarsToCents(btlForm.upcharge || "0")
    if (!btlForm.name.trim()) return setBtlError("Give the bottle a name.")
    if (menuPrice == null) return setBtlError("Enter the menu price in dollars.")
    if (upcharge == null) return setBtlError("Enter the upcharge in dollars, or 0.")
    setBtlSaving(true)
    setBtlError(null)
    const body = {
      category: btlForm.category,
      name: btlForm.name.trim(),
      size_label: btlForm.size_label.trim() || null,
      menu_price_cents: menuPrice,
      included_eligible: btlForm.included_eligible,
      upcharge_cents: upcharge,
      in_stock: btlForm.in_stock,
      sort_order: btlEditing?.sort_order ?? bottles.length,
    }
    try {
      if (btlEditing) await apiClient.put(`${VIP_API}/bottles/${btlEditing.id}`, body)
      else await apiClient.post(`${VIP_API}/bottles`, body)
      setBtlOpen(false)
      await load()
    } catch (err) {
      setBtlError(errorMessage(err, "Could not save the bottle."))
    } finally {
      setBtlSaving(false)
    }
  }

  const toggleStock = async (b: VipBottle) => {
    try {
      await apiClient.put(`${VIP_API}/bottles/${b.id}`, { ...b, in_stock: !b.in_stock })
      await load()
    } catch (err) {
      setLoadError(errorMessage(err, "Could not update the bottle."))
    }
  }

  const deleteBottle = async () => {
    if (!btlDelete) return
    try {
      await apiClient.delete(`${VIP_API}/bottles/${btlDelete.id}`)
      setBtlDelete(null)
      await load()
    } catch (err) {
      setLoadError(errorMessage(err, "Could not remove the bottle."))
      setBtlDelete(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!settings?.is_enabled) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="VIP Tables" description="Sell bottle service tables on your floor map." />
        <EmptyState
          icon={Wine}
          title="VIP tables are not switched on yet"
          description="Bizzy builds your floor map and switches tables on for your business. Reach out to your Bizzy contact to get set up."
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="VIP Tables"
        description="Packages and the bottle menu. Put tables on sale from an event's Manage page."
      />
      {loadError && <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>}

      {/* Floor map: laid out in the map editor; table photos are added here. */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Floor map</h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {plan
                ? `${plan.tables.length} table${plan.tables.length === 1 ? "" : "s"} on the map. Add a photo of each table: buyers see it when they tap the table.`
                : "No floor map yet. Open the editor to lay out your tables, the bar, the DJ and the door."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <Button size="sm" onClick={openMapEditor} disabled={openingEditor}>
                {openingEditor ? <Loader2 className="animate-spin" /> : <LayoutGrid />} {plan ? "Edit floor map" : "Build floor map"}
              </Button>
            )}
          <Badge variant={settings.fee_is_default ? "neutral" : "info"}>
            Table fee {settings.fee_percentage}%{settings.fee_flat_usd ? ` + $${settings.fee_flat_usd}` : ""}
          </Badge>
          </div>
        </div>
        {plan && plan.tables.length > 0 && (
          <ul className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-800">
            {plan.tables.map((t) => (
              <TablePhotoRow key={t.id} table={t} canEdit={canEdit} onChanged={load} onError={setLoadError} />
            ))}
          </ul>
        )}
      </Card>

      {/* Packages */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Packages</h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              What a table is sold as: price, included bottles, what comes with it. Prices can be changed per event.
            </p>
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => openPackage(null)}>
              <Plus /> New package
            </Button>
          )}
        </div>
        {packages.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">No packages yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-800">
            {packages.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">{p.name}</span>
                    <Badge variant="neutral" size="sm">
                      {p.included_bottles} bottle{p.included_bottles === 1 ? "" : "s"} included
                    </Badge>
                  </div>
                  {p.description && (
                    <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">{p.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">{formatCents(p.price_cents)}</span>
                  {canEdit && (
                    <>
                      <Button variant="ghost" size="icon" aria-label={`Edit ${p.name}`} onClick={() => openPackage(p)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`Remove ${p.name}`} onClick={() => setPkgDelete(p)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Bottle menu */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Bottle menu</h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Buyers pick their included bottles from this list. A premium bottle can carry an upcharge. Extra bottles are charged at menu price.
            </p>
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => openBottle(null)}>
              <Plus /> Add bottle
            </Button>
          )}
        </div>
        {bottles.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">No bottles yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-800">
            {bottles.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={b.in_stock ? "font-medium text-neutral-900 dark:text-neutral-100" : "font-medium text-neutral-400 line-through"}>
                      {b.name}
                    </span>
                    {!b.in_stock && <Badge variant="danger" size="sm">Sold out</Badge>}
                    {!b.included_eligible && <Badge variant="outline" size="sm">Extra only</Badge>}
                    {b.included_eligible && b.upcharge_cents > 0 && (
                      <Badge variant="warning" size="sm">+{formatCents(b.upcharge_cents)} as included pick</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
                    {[b.category, b.size_label].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">{formatCents(b.menu_price_cents)}</span>
                  {canEdit && (
                    <>
                      <Button variant="subtle" size="sm" onClick={() => toggleStock(b)}>
                        {b.in_stock ? "Mark sold out" : "Back in stock"}
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`Edit ${b.name}`} onClick={() => openBottle(b)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`Remove ${b.name}`} onClick={() => setBtlDelete(b)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-sm text-neutral-500">
        To put tables on sale, open an event and choose <Link className="font-medium text-[#05EB54]" href="/business/events">VIP Tables</Link> on its Manage page.
      </p>

      {/* Package dialog */}
      <Dialog open={pkgOpen} onOpenChange={(o) => !pkgSaving && setPkgOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pkgEditing ? "Edit package" : "New package"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label htmlFor="pkg-name">Name</Label>
              <Input id="pkg-name" value={pkgForm.name} onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })} placeholder="Standard Table" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pkg-price">Price ($)</Label>
                <Input id="pkg-price" inputMode="decimal" value={pkgForm.price} onChange={(e) => setPkgForm({ ...pkgForm, price: e.target.value })} placeholder="600" />
              </div>
              <div>
                <Label htmlFor="pkg-bottles">Included bottles</Label>
                <Select id="pkg-bottles" value={pkgForm.included_bottles} onChange={(e) => setPkgForm({ ...pkgForm, included_bottles: e.target.value })}>
                  {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="pkg-desc">What is included</Label>
              <Textarea id="pkg-desc" value={pkgForm.description} onChange={(e) => setPkgForm({ ...pkgForm, description: e.target.value })} placeholder="2 bottles of your choice, mixers, and a reserved table for the night." />
            </div>
            {pkgError && <p className="text-sm text-red-600 dark:text-red-400">{pkgError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPkgOpen(false)} disabled={pkgSaving}>Cancel</Button>
              <Button onClick={savePackage} disabled={pkgSaving}>
                {pkgSaving && <Loader2 className="animate-spin" />} Save package
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottle dialog */}
      <Dialog open={btlOpen} onOpenChange={(o) => !btlSaving && setBtlOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{btlEditing ? "Edit bottle" : "Add bottle"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="btl-name">Name</Label>
                <Input id="btl-name" value={btlForm.name} onChange={(e) => setBtlForm({ ...btlForm, name: e.target.value })} placeholder="Tito's" />
              </div>
              <div>
                <Label htmlFor="btl-cat">Category</Label>
                <Select id="btl-cat" value={btlForm.category} onChange={(e) => setBtlForm({ ...btlForm, category: e.target.value })}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="btl-size">Size</Label>
                <Input id="btl-size" value={btlForm.size_label} onChange={(e) => setBtlForm({ ...btlForm, size_label: e.target.value })} placeholder="750ml" />
              </div>
              <div>
                <Label htmlFor="btl-price">Menu price ($)</Label>
                <Input id="btl-price" inputMode="decimal" value={btlForm.menu_price} onChange={(e) => setBtlForm({ ...btlForm, menu_price: e.target.value })} placeholder="300" />
              </div>
              <div>
                <Label htmlFor="btl-up">Upcharge ($)</Label>
                <Input id="btl-up" inputMode="decimal" value={btlForm.upcharge} onChange={(e) => setBtlForm({ ...btlForm, upcharge: e.target.value })} placeholder="0" disabled={!btlForm.included_eligible} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <input type="checkbox" className="size-4 accent-[#05EB54]" checked={btlForm.included_eligible} onChange={(e) => setBtlForm({ ...btlForm, included_eligible: e.target.checked })} />
              Can be chosen as an included bottle (the upcharge applies then; 0 means standard)
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <input type="checkbox" className="size-4 accent-[#05EB54]" checked={btlForm.in_stock} onChange={(e) => setBtlForm({ ...btlForm, in_stock: e.target.checked })} />
              In stock
            </label>
            {btlError && <p className="text-sm text-red-600 dark:text-red-400">{btlError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setBtlOpen(false)} disabled={btlSaving}>Cancel</Button>
              <Button onClick={saveBottle} disabled={btlSaving}>
                {btlSaving && <Loader2 className="animate-spin" />} Save bottle
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!pkgDelete}
        onOpenChange={(o) => !o && setPkgDelete(null)}
        onConfirm={deletePackage}
        title={`Remove ${pkgDelete?.name ?? "package"}?`}
        description="Tables already sold with this package keep it. New listings can no longer use it."
        confirmLabel="Remove"
      />
      <ConfirmDialog
        open={!!btlDelete}
        onOpenChange={(o) => !o && setBtlDelete(null)}
        onConfirm={deleteBottle}
        title={`Remove ${btlDelete?.name ?? "bottle"}?`}
        description="It disappears from the picker. Bookings that already chose it are not changed."
        confirmLabel="Remove"
      />
    </div>
  )
}
