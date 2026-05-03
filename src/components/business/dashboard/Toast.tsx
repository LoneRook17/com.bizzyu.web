"use client"

import { useEffect, useState } from "react"

type ToastType = "success" | "error" | "info"

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

let listeners: ((item: ToastItem) => void)[] = []
let nextId = 1

export function showToast(message: string, type: ToastType = "success") {
  const item: ToastItem = { id: nextId++, message, type }
  listeners.forEach((fn) => fn(item))
}

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const listener = (item: ToastItem) => {
      setToasts((prev) => [...prev, item])
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id))
      }, 3000)
    }
    listeners.push(listener)
    return () => {
      listeners = listeners.filter((fn) => fn !== listener)
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => {
        const styles =
          toast.type === "success"
            ? "bg-green-600 text-white"
            : toast.type === "error"
              ? "bg-red-600 text-white"
              : "bg-gray-900 text-white"
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${styles}`}
            role="status"
          >
            {toast.type === "success" && (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
            {toast.message}
          </div>
        )
      })}
    </div>
  )
}
