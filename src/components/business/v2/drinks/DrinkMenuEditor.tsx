"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react"
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
import { Card, CardContent } from "@/components/business/v2/ui/card"
import { Badge } from "@/components/business/v2/ui/badge"

/**
 * Knight-only drink menu editor. Talks to services `/business/drink-menu`.
 */
export default function DrinkMenuEditor() {
  const [sections, setSections] = useState<DrinkMenuSection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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
    } catch (e: any) {
      setError(e?.message || "Action failed")
    } finally {
      setBusy(false)
    }
  }

  async function reorderSections(from: number, to: number) {
    const ids = moveRow(sections.map((s) => s.id), from, to)
    setSections((prev) => {
      const byId = new Map(prev.map((s) => [s.id, s]))
      return ids.map((id, i) => ({ ...byId.get(id)!, sort_order: i }))
    })
    await run(() => apiClient.post("/business/drink-menu/sections/reorder", { ids }))
  }

  async function reorderItems(section: DrinkMenuSection, from: number, to: number) {
    const ids = moveRow(section.items.map((it) => it.id), from, to)
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
        description="Knight Library chalkboard menu — shots and buckets. Active rows appear in the app; inactive stay hidden."
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {sections.length === 0 && (
        <Card>
          <CardContent className="py-8 text-sm text-neutral-500">
            No sections yet. Add one below — or seed from Laravel admin on DEV.
          </CardContent>
        </Card>
      )}

      {sections.map((section, sIdx) => (
        <Card key={section.id}>
          <CardContent className="space-y-4 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold flex-1">{section.title}</h2>
              <Badge variant="neutral">{section.price_label}</Badge>
              <Badge variant="neutral">{section.kind}</Badge>
              {!section.is_active && <Badge variant="neutral">hidden</Badge>}
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={busy || sIdx === 0}
                  onClick={() => void reorderSections(sIdx, sIdx - 1)}
                  aria-label="Move section up"
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
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
                  variant="neutral"
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
                  size="icon"
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
            </div>

            <SectionEditForm
              section={section}
              disabled={busy}
              onSave={(body) =>
                void run(() => apiClient.patch(`/business/drink-menu/sections/${section.id}`, body))
              }
            />

            <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {section.items.map((item, iIdx) => (
                <li key={item.id} className="flex flex-wrap items-start gap-2 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-neutral-500">{item.ingredients || "—"}</div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      {effectivePrice(item, section)}
                      {!item.is_active && " · hidden"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={busy || iIdx === 0}
                      onClick={() => void reorderItems(section, iIdx, iIdx - 1)}
                      aria-label="Move up"
                    >
                      <ChevronUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
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
                      variant="neutral"
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
                      size="icon"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        if (!confirm("Remove this drink?")) return
                        void run(() => apiClient.delete(`/business/drink-menu/items/${item.id}`))
                      }}
                      aria-label="Delete drink"
                    >
                      <Trash2 className="size-4 text-red-500" />
                    </Button>
                  </div>
                  <ItemEditForm
                    item={item}
                    section={section}
                    disabled={busy}
                    onSave={(body) =>
                      void run(() => apiClient.patch(`/business/drink-menu/items/${item.id}`, body))
                    }
                  />
                </li>
              ))}
            </ul>

            <AddItemForm
              disabled={busy}
              placeholderPrice={section.price_label}
              onAdd={(body) =>
                void run(() =>
                  apiClient.post(`/business/drink-menu/sections/${section.id}/items`, body),
                )
              }
            />
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="py-5">
          <h3 className="mb-3 text-sm font-semibold">Add section</h3>
          <AddSectionForm
            disabled={busy}
            onAdd={(body) => void run(() => apiClient.post("/business/drink-menu/sections", body))}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function SectionEditForm({
  section,
  disabled,
  onSave,
}: {
  section: DrinkMenuSection
  disabled: boolean
  onSave: (body: { title: string; price_label: string; kind: string }) => void
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
      className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]"
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ title, price_label: priceLabel, kind })
      }}
    >
      <input className="rounded-md border px-3 py-2 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} disabled={disabled} required maxLength={120} />
      <input className="rounded-md border px-3 py-2 text-sm" value={priceLabel} onChange={(e) => setPriceLabel(e.target.value)} disabled={disabled} required maxLength={32} />
      <select className="rounded-md border px-3 py-2 text-sm" value={kind} onChange={(e) => setKind(e.target.value)} disabled={disabled}>
        <option value="shot">shot</option>
        <option value="bucket">bucket</option>
        <option value="custom">custom</option>
      </select>
      <Button type="submit" size="sm" disabled={disabled}>Save</Button>
    </form>
  )
}

function ItemEditForm({
  item,
  section,
  disabled,
  onSave,
}: {
  item: DrinkMenuItem
  section: DrinkMenuSection
  disabled: boolean
  onSave: (body: { name: string; ingredients: string; price: string }) => void
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
      className="basis-full grid gap-2 sm:grid-cols-[1.2fr_2fr_0.7fr_auto]"
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ name, ingredients, price })
      }}
    >
      <input className="rounded-md border px-3 py-1.5 text-sm" value={name} onChange={(e) => setName(e.target.value)} disabled={disabled} required maxLength={120} />
      <input className="rounded-md border px-3 py-1.5 text-sm" value={ingredients} onChange={(e) => setIngredients(e.target.value)} disabled={disabled} maxLength={512} />
      <input className="rounded-md border px-3 py-1.5 text-sm" value={price} onChange={(e) => setPrice(e.target.value)} disabled={disabled} maxLength={32} placeholder={section.price_label} />
      <Button type="submit" size="sm" variant="neutral" disabled={disabled}>Save</Button>
    </form>
  )
}

function AddItemForm({
  disabled,
  placeholderPrice,
  onAdd,
}: {
  disabled: boolean
  placeholderPrice: string
  onAdd: (body: { name: string; ingredients: string; price: string }) => void
}) {
  const [name, setName] = useState("")
  const [ingredients, setIngredients] = useState("")
  const [price, setPrice] = useState("")
  return (
    <form
      className="grid gap-2 sm:grid-cols-[1.2fr_2fr_0.7fr_auto]"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        onAdd({ name, ingredients, price })
        setName("")
        setIngredients("")
        setPrice("")
      }}
    >
      <input className="rounded-md border px-3 py-2 text-sm" placeholder="Drink name" value={name} onChange={(e) => setName(e.target.value)} disabled={disabled} required maxLength={120} />
      <input className="rounded-md border px-3 py-2 text-sm" placeholder="Ingredients" value={ingredients} onChange={(e) => setIngredients(e.target.value)} disabled={disabled} maxLength={512} />
      <input className="rounded-md border px-3 py-2 text-sm" placeholder={placeholderPrice} value={price} onChange={(e) => setPrice(e.target.value)} disabled={disabled} maxLength={32} />
      <Button type="submit" size="sm" disabled={disabled}><Plus className="size-4 mr-1" /> Add</Button>
    </form>
  )
}

function AddSectionForm({
  disabled,
  onAdd,
}: {
  disabled: boolean
  onAdd: (body: { title: string; price_label: string; kind: string }) => void
}) {
  const [title, setTitle] = useState("")
  const [priceLabel, setPriceLabel] = useState("$4")
  const [kind, setKind] = useState("shot")
  return (
    <form
      className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) return
        onAdd({ title, price_label: priceLabel, kind })
        setTitle("")
      }}
    >
      <input className="rounded-md border px-3 py-2 text-sm" placeholder="Section title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={disabled} required maxLength={120} />
      <input className="rounded-md border px-3 py-2 text-sm" value={priceLabel} onChange={(e) => setPriceLabel(e.target.value)} disabled={disabled} required maxLength={32} />
      <select className="rounded-md border px-3 py-2 text-sm" value={kind} onChange={(e) => setKind(e.target.value)} disabled={disabled}>
        <option value="shot">shot</option>
        <option value="bucket">bucket</option>
        <option value="custom">custom</option>
      </select>
      <Button type="submit" size="sm" disabled={disabled}><Plus className="size-4 mr-1" /> Add</Button>
    </form>
  )
}
