"use client"

import { useState, useEffect, useCallback } from "react"
import { apiClient, ApiError } from "@/lib/business/api-client"
import { TAG_COLOR_PALETTE, type TagWithCount } from "./types"

interface Props {
  open: boolean
  onClose: () => void
  // When set, the modal renders an "Apply to selection" CTA that calls onAssignTo with a chosen tag.
  selectedUserIds?: number[]
  onTagsChanged?: () => void
  canMutate: boolean
}

export default function TagManagerModal({
  open,
  onClose,
  selectedUserIds,
  onTagsChanged,
  canMutate,
}: Props) {
  const [tags, setTags] = useState<TagWithCount[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState(TAG_COLOR_PALETTE[0].hex)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.get<{ tags: TagWithCount[] }>("/business/marketing/tags")
      setTags(res.tags)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load tags")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setError(null)
      refresh()
    }
  }, [open, refresh])

  if (!open) return null

  const handleCreate = async () => {
    if (!newName.trim()) return
    setError(null)
    try {
      await apiClient.post("/business/marketing/tags", { name: newName.trim(), color_hex: newColor })
      setNewName("")
      setNewColor(TAG_COLOR_PALETTE[0].hex)
      await refresh()
      onTagsChanged?.()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create tag")
    }
  }

  const handleStartEdit = (t: TagWithCount) => {
    setEditingId(t.id)
    setEditName(t.name)
    setEditColor(t.color_hex)
  }

  const handleSaveEdit = async () => {
    if (editingId == null) return
    setError(null)
    try {
      await apiClient.patch(`/business/marketing/tags/${editingId}`, {
        name: editName.trim(),
        color_hex: editColor,
      })
      setEditingId(null)
      await refresh()
      onTagsChanged?.()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update tag")
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this tag? It will be removed from all attendees.")) return
    setError(null)
    try {
      await apiClient.delete(`/business/marketing/tags/${id}`)
      await refresh()
      onTagsChanged?.()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete tag")
    }
  }

  const handleAssign = async (tagId: number) => {
    if (!selectedUserIds || selectedUserIds.length === 0) return
    setError(null)
    try {
      await apiClient.post(`/business/marketing/tags/${tagId}/assignments`, {
        user_ids: selectedUserIds,
      })
      onTagsChanged?.()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to assign tag")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-base font-semibold text-ink">
            {selectedUserIds && selectedUserIds.length > 0
              ? `Add tag to ${selectedUserIds.length} attendee${selectedUserIds.length === 1 ? "" : "s"}`
              : "Manage tags"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-ink">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {error && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {canMutate && (
            <div className="mb-4 rounded-md border border-gray-200 p-3">
              <p className="mb-2 text-xs font-medium text-gray-700">Create new tag</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={50}
                  placeholder="e.g. VIP"
                  className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:bg-gray-300"
                >
                  Create
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TAG_COLOR_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setNewColor(c.hex)}
                    className={`h-6 w-6 rounded-full border-2 ${newColor === c.hex ? "border-ink" : "border-transparent"}`}
                    style={{ backgroundColor: c.hex }}
                    aria-label={c.name}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <p className="text-sm text-gray-500">Loading tags…</p>
          ) : tags.length === 0 ? (
            <p className="text-sm text-gray-500">No tags yet. Create one above.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {tags.map((t) => {
                const isEditing = editingId === t.id
                return (
                  <li key={t.id} className="flex items-center gap-3 py-2">
                    {isEditing ? (
                      <>
                        <div className="flex flex-1 items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            maxLength={50}
                            className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                          />
                          <div className="flex gap-1">
                            {TAG_COLOR_PALETTE.map((c) => (
                              <button
                                key={c.hex}
                                type="button"
                                onClick={() => setEditColor(c.hex)}
                                className={`h-5 w-5 rounded-full border-2 ${editColor === c.hex ? "border-ink" : "border-transparent"}`}
                                style={{ backgroundColor: c.hex }}
                              />
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={handleSaveEdit}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-gray-500 hover:text-ink"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span
                          className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium"
                          style={{
                            backgroundColor: `${t.color_hex}1F`,
                            color: t.color_hex,
                            border: `1px solid ${t.color_hex}40`,
                          }}
                        >
                          {t.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {t.attendee_count} attendee{t.attendee_count === 1 ? "" : "s"}
                        </span>
                        <div className="ml-auto flex gap-2">
                          {selectedUserIds && selectedUserIds.length > 0 && (
                            <button
                              onClick={() => handleAssign(t.id)}
                              className="text-xs font-medium text-primary hover:underline"
                            >
                              Apply
                            </button>
                          )}
                          {canMutate && (
                            <>
                              <button
                                onClick={() => handleStartEdit(t)}
                                className="text-xs text-gray-500 hover:text-ink"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(t.id)}
                                className="text-xs text-red-600 hover:text-red-700"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
