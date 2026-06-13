"use client"

import * as React from "react"

export type ThemePreference = "light" | "dark" | "system"

const STORAGE_KEY = "bizzy-v2-theme"
const DARK_CLASS = "v2-dark"

interface ThemeContextValue {
  theme: ThemePreference
  resolvedTheme: "light" | "dark"
  setTheme: (theme: ThemePreference) => void
}

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
})

export function useTheme() {
  return React.useContext(ThemeContext)
}

function readStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "system"
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system"
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemePreference>("system")
  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">("light")

  // Hydrate from localStorage on mount
  React.useEffect(() => {
    setThemeState(readStoredTheme())
  }, [])

  // Apply class to <html> so Radix portals (rendered at body) are themed too.
  // Scoped to v2: only this provider adds the class, and it cleans up on unmount
  // so the marketing site and v1 dashboard are never affected.
  React.useEffect(() => {
    const root = document.documentElement

    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && systemPrefersDark())
      root.classList.toggle(DARK_CLASS, dark)
      root.style.colorScheme = dark ? "dark" : "light"
      setResolvedTheme(dark ? "dark" : "light")
    }

    apply()

    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => {
      if (theme === "system") apply()
    }
    mq.addEventListener("change", onChange)

    return () => {
      mq.removeEventListener("change", onChange)
      root.classList.remove(DARK_CLASS)
      root.style.colorScheme = ""
    }
  }, [theme])

  const setTheme = React.useCallback((next: ThemePreference) => {
    setThemeState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage unavailable (private mode etc.) — theme still applies for the session.
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
