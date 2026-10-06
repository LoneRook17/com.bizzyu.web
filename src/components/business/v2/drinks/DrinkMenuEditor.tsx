"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronDown, ChevronUp, Loader2, Pencil, Plus, Trash2, X } from "lucide-react"
import { apiClient } from "@/lib/business/api-client"
import {
  effectivePrice,
  moveRow,
  type DrinkMenuItem,
  type DrinkMenuPayload,
  type DrinkMenuSection,
} from "@/lib/business/drink-menu"
import { PageHeader } from "@/components/business/v2/PageHeader"
import { Button } from "@/components/business/v2/ui/button"
import { Card, CardContent, CardHeader } from "@/components/business/v2/ui/card"
import { Badge } from "@/components/business/v2/ui/badge"
import { Input, Select } from "@/components/business/v2/ui/input"
import { Label } from "@/components/business/v2/ui/label"
import { cn } from "@/lib/v2/utils"

/**
 * Knight-only drink menu editor. Talks to services `/business/drink-menu`.
 *
 * View-first: each section/item shows a clean summary. Tap Edit to expand
 * fields in place — no always-on duplicate preview + form.
 */
export default function DrinkMenuEditor() {
  const [sections, setSections] = useState<DrinkMenuSection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null)
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [addingItemForSection, setAddingItemForSection] = useState<number | null>(null)
  const [addingSection, setAddingSection] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await apiClient.get<DrinkMenuPayload>("/business/drink-menu")
      setSections(data.sections ?? [])
    } catch (e: any) {
      setError(e?.message || "Failed to load drink menu")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await load()
      setEditingSectionId(null)
      setEditingItemId(null)
      setAddingItemForSection(null)
      setAddingSection(false)
    } catch (e: any) {
      setError(e?.message || "Action failed")
    } finally {
      setBusy(false)
    }
  }

  async function reorderSections(from: number, to: number) {
    const ids = moveRow(
      sections.map((s) => s.id),
      from,
      to,
    )
    setSections((prev) => {
      const byId = new Map(prev.map((s) => [s.id, s]))
      return ids.map((id, i) => ({ ...byId.get(id)!, sort_order: i }))
    })
    await run(() => apiClient.post("/business/drink-menu/sections/reorder", { ids }))
  }

  async function reorderItems(section: DrinkMenuSection, from: number, to: number) {
    const ids = moveRow(
      section.items.map((it) => it.id),
      from,
      to,
    )
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== section.id) return s
        const byId = new Map(s.items.map((it) => [it.id, it]))
        return { ...s, items: ids.map((id, i) => ({ ...byId.get(id)!, sort_order: i })) }
      }),
    )
    await run(() =>
      apiClient.post(`/business/drink-menu/sections/${section.id}/items/reorder`, { ids }),
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Loader2 className="size-4 animate-spin" /> Loading drink menu…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drinks"
        description="Knight Library chalkboard — active rows show in the app; hidden stay off the sheet."
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {sections.length === 0 && !addingSection && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-neutral-500">
            No sections yet. Add a shot or bucket section below — or seed from Laravel admin on DEV.
          </CardContent>
        </Card>
      )}

      {sections.map((section, sIdx) => {
        const sectionEditing = editingSectionId === section.id
        return (
          <Card
            key={section.id}
            className={cn(!section.is_active && "opacity-70 border-dashed")}
          >
            <CardHeader className="flex-wrap border-b border-neutral-100 dark:border-neutral-800">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                    {section.title}
                  </h2>
                  <Badge variant="neutral" size="sm">
                    {section.price_label}
                  </Badge>
                  <Badge variant="outline" size="sm" className="capitalize">
                    {section.kind}
                  </Badge>
                  {!section.is_active && (
                    <Badge variant="warning" size="sm">
                      Hidden
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-neutral-500">
                  {section.items.length} drink{section.items.length === 1 ? "" : "s"}
                  {section.items.filter((i) => i.is_active).length !== section.items.length
                    ? ` · ${section.items.filter((i) => i.is_active).length} visible`
                    : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  disabled={busy || sIdx === 0}
                  onClick={() => void reorderSections(sIdx, sIdx - 1)}
                  aria-label="Move section up"
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  disabled={busy || sIdx === sections.length - 1}
                  onClick={() => void reorderSections(sIdx, sIdx + 1)}
                  aria-label="Move section down"
                >
                  <ChevronDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    setEditingSectionId(sectionEditing ? null : section.id)
                    setEditingItemId(null)
                  }}
                >
                  {sectionEditing ? (
                    <>
                      <X className="size-3.5" /> Cancel
                    </>
                  ) : (
                    <>
                      <Pencil className="size-3.5" /> Edit
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      apiClient.post(`/business/drink-menu/sections/${section.id}/toggle`, {}),
                    )
                  }
                >
                  {section.is_active ? "Hide" : "Show"}
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    if (!confirm("Remove this section and all its drinks?")) return
                    void run(() => apiClient.delete(`/business/drink-menu/sections/${section.id}`))
                  }}
                  aria-label="Delete section"
                >
                  <Trash2 className="size-4 text-red-500" />
                </Button>
              </div>
            </CardHeader>

            {sectionEditing && (
              <div className="border-b border-neutral-100 bg-neutral-50/80 px-5 py-4 dark:border-neutral-800 dark:bg-neutral-950/40">
                <SectionEditForm
                  section={section}
                  disabled={busy}
                  onCancel={() => setEditingSectionId(null)}
                  onSave={(body) =>
                    void run(() =>
                      apiClient.patch(`/business/drink-menu/sections/${section.id}`, body),
                    )
                  }
                />
              </div>
            )}

            <CardContent className="space-y-2 py-4">
              {section.items.length === 0 && (
                <p className="py-4 text-center text-sm text-neutral-500">No drinks in this section yet.</p>
              )}

              <ul className="space-y-2">
                {section.items.map((item, iIdx) => {
                  const itemEditing = editingItemId === item.id
                  return (
                    <li
                      key={item.id}
                      className={cn(
                        "rounded-xl border border-neutral-200 bg-white transition-colors dark:border-neutral-800 dark:bg-neutral-950/30",
                        !item.is_active && "opacity-60 border-dashed",
                        itemEditing && "border-[#05EB54]/50 ring-1 ring-[#05EB54]/20",
                      )}
                    >
                      <div className="flex flex-wrap items-start gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="font-semibold text-neutral-900 dark:text-neutral-50">
                              {item.name}
                            </span>
                            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                              {effectivePrice(item, section)}
                            </span>
                            {!item.is_active && (
                              <Badge variant="warning" size="sm">
                                Hidden
                              </Badge>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                            {item.ingredients?.trim() || "No ingredients listed"}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            disabled={busy || iIdx === 0}
                            onClick={() => void reorderItems(section, iIdx, iIdx - 1)}
                            aria-label="Move up"
                          >
                            <ChevronUp className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            disabled={busy || iIdx === section.items.length - 1}
                            onClick={() => void reorderItems(section, iIdx, iIdx + 1)}
                            aria-label="Move down"
                          >
                            <ChevronDown className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={busy}
                            onClick={() => {
                              setEditingItemId(itemEditing ? null : item.id)
                              setEditingSectionId(null)
                              setAddingItemForSection(null)
                            }}
                          >
                            {itemEditing ? (
                              <>
                                <X className="size-3.5" /> Cancel
                              </>
                            ) : (
                              <>
                                <Pencil className="size-3.5" /> Edit
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() =>
                              void run(() =>
                                apiClient.post(`/business/drink-menu/items/${item.id}/toggle`, {}),
                              )
                            }
                          >
                            {item.is_active ? "Hide" : "Show"}
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => {
                              if (!confirm("Remove this drink?")) return
                              void run(() =>
                                apiClient.delete(`/business/drink-menu/items/${item.id}`),
                              )
                            }}
                            aria-label="Delete drink"
                          >
                            <Trash2 className="size-4 text-red-500" />
                          </Button>
                        </div>
                      </div>

                      {itemEditing && (
                        <div className="border-t border-neutral-100 bg-neutral-50/80 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950/50">
                          <ItemEditForm
                            item={item}
                            section={section}
                            disabled={busy}
                            onCancel={() => setEditingItemId(null)}
                            onSave={(body) =>
                              void run(() =>
                                apiClient.patch(`/business/drink-menu/items/${item.id}`, body),
                              )
                            }
                          />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>

              {addingItemForSection === section.id ? (
                <div className="mt-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50/60 p-4 dark:border-neutral-700 dark:bg-neutral-950/40">
                  <h3 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    New drink
                  </h3>
                  <AddItemForm
                    disabled={busy}
                    placeholderPrice={section.price_label}
                    onCancel={() => setAddingItemForSection(null)}
                    onAdd={(body) =>
                      void run(() =>
                        apiClient.post(`/business/drink-menu/sections/${section.id}/items`, body),
                      )
                    }
                  />
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  disabled={busy}
                  onClick={() => {
                    setAddingItemForSection(section.id)
                    setEditingItemId(null)
                    setEditingSectionId(null)
                  }}
                >
                  <Plus className="size-4" /> Add drink
                </Button>
              )}
            </CardContent>
          </Card>
        )
      })}

      {addingSection ? (
        <Card>
          <CardContent className="py-5">
            <h3 className="mb-3 text-sm font-semibold">New section</h3>
            <AddSectionForm
              disabled={busy}
              onCancel={() => setAddingSection(false)}
              onAdd={(body) => void run(() => apiClient.post("/business/drink-menu/sections", body))}
            />
          </CardContent>
        </Card>
      ) : (
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => {
            setAddingSection(true)
            setEditingItemId(null)
            setEditingSectionId(null)
            setAddingItemForSection(null)
          }}
        >
          <Plus className="size-4" /> Add section
        </Button>
      )}
    </div>
  )
}

const fieldGrid = "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
const fieldStack = "space-y-1.5"

function SectionEditForm({
  section,
  disabled,
  onSave,
  onCancel,
}: {
  section: DrinkMenuSection
  disabled: boolean
  onSave: (body: { title: string; price_label: string; kind: string }) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(section.title)
  const [priceLabel, setPriceLabel] = useState(section.price_label)
  const [kind, setKind] = useState(section.kind)
  useEffect(() => {
    setTitle(section.title)
    setPriceLabel(section.price_label)
    setKind(section.kind)
  }, [section.title, section.price_label, section.kind])

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ title, price_label: priceLabel, kind })
      }}
    >
      <div className={fieldGrid}>
        <div className={cn(fieldStack, "sm:col-span-2")}>
          <Label htmlFor={`sec-title-${section.id}`}>Title</Label>
          <Input
            id={`sec-title-${section.id}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={disabled}
            required
            maxLength={120}
          />
        </div>
        <div className={fieldStack}>
          <Label htmlFor={`sec-price-${section.id}`}>Price label</Label>
          <Input
            id={`sec-price-${section.id}`}
            value={priceLabel}
            onChange={(e) => setPriceLabel(e.target.value)}
            disabled={disabled}
            required
            maxLength={32}
          />
        </div>
        <div className={fieldStack}>
          <Label htmlFor={`sec-kind-${section.id}`}>Kind</Label>
          <Select
            id={`sec-kind-${section.id}`}
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            disabled={disabled}
          >
            <option value="shot">shot</option>
            <option value="bucket">bucket</option>
            <option value="custom">custom</option>
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={disabled}>
          Save section
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function ItemEditForm({
  item,
  section,
  disabled,
  onSave,
  onCancel,
}: {
  item: DrinkMenuItem
  section: DrinkMenuSection
  disabled: boolean
  onSave: (body: { name: string; ingredients: string; price: string }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(item.name)
  const [ingredients, setIngredients] = useState(item.ingredients ?? "")
  const [price, setPrice] = useState(item.price ?? "")
  useEffect(() => {
    setName(item.name)
    setIngredients(item.ingredients ?? "")
    setPrice(item.price ?? "")
  }, [item.name, item.ingredients, item.price])

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ name, ingredients, price })
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1.2fr_2fr_0.8fr]">
        <div className={fieldStack}>
          <Label htmlFor={`item-name-${item.id}`}>Name</Label>
          <Input
            id={`item-name-${item.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled}
            required
            maxLength={120}
          />
        </div>
        <div className={fieldStack}>
          <Label htmlFor={`item-ing-${item.id}`}>Ingredients</Label>
          <Input
            id={`item-ing-${item.id}`}
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            disabled={disabled}
            maxLength={512}
          />
        </div>
        <div className={fieldStack}>
          <Label htmlFor={`item-price-${item.id}`}>Price</Label>
          <Input
            id={`item-price-${item.id}`}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={disabled}
            maxLength={32}
            placeholder={section.price_label}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={disabled}>
          Save drink
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function AddItemForm({
  disabled,
  placeholderPrice,
  onAdd,
  onCancel,
}: {
  disabled: boolean
  placeholderPrice: string
  onAdd: (body: { name: string; ingredients: string; price: string }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState("")
  const [ingredients, setIngredients] = useState("")
  const [price, setPrice] = useState("")
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        onAdd({ name, ingredients, price })
        setName("")
        setIngredients("")
        setPrice("")
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1.2fr_2fr_0.8fr]">
        <div className={fieldStack}>
          <Label htmlFor="add-item-name">Name</Label>
          <Input
            id="add-item-name"
            placeholder="Drink name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled}
            required
            maxLength={120}
          />
        </div>
        <div className={fieldStack}>
          <Label htmlFor="add-item-ing">Ingredients</Label>
          <Input
            id="add-item-ing"
            placeholder="Ingredients"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            disabled={disabled}
            maxLength={512}
          />
        </div>
        <div className={fieldStack}>
          <Label htmlFor="add-item-price">Price</Label>
          <Input
            id="add-item-price"
            placeholder={placeholderPrice}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={disabled}
            maxLength={32}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={disabled}>
          <Plus className="size-4" /> Add drink
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function AddSectionForm({
  disabled,
  onAdd,
  onCancel,
}: {
  disabled: boolean
  onAdd: (body: { title: string; price_label: string; kind: string }) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState("")
  const [priceLabel, setPriceLabel] = useState("$4")
  const [kind, setKind] = useState("shot")
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) return
        onAdd({ title, price_label: priceLabel, kind })
        setTitle("")
      }}
    >
      <div className={fieldGrid}>
        <div className={cn(fieldStack, "sm:col-span-2")}>
          <Label htmlFor="add-sec-title">Title</Label>
          <Input
            id="add-sec-title"
            placeholder="Section title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={disabled}
            required
            maxLength={120}
          />
        </div>
        <div className={fieldStack}>
          <Label htmlFor="add-sec-price">Price label</Label>
          <Input
            id="add-sec-price"
            value={priceLabel}
            onChange={(e) => setPriceLabel(e.target.value)}
            disabled={disabled}
            required
            maxLength={32}
          />
        </div>
        <div className={fieldStack}>
          <Label htmlFor="add-sec-kind">Kind</Label>
          <Select
            id="add-sec-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            disabled={disabled}
          >
            <option value="shot">shot</option>
            <option value="bucket">bucket</option>
            <option value="custom">custom</option>
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={disabled}>
          <Plus className="size-4" /> Add section
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
