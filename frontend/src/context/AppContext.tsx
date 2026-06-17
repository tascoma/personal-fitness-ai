import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import type { UserSettings } from '../api/types'
import { ACCENT_OPTIONS, AppContext, type AppContextValue } from './app'

function loadStoredAccent(): string {
  try {
    const stored = JSON.parse(localStorage.getItem('pfa_tweaks') || '{}')
    if (typeof stored.accent === 'string') return stored.accent
  } catch {
    // ignore malformed storage
  }
  return '#f97316'
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [accent, setAccent] = useState(loadStoredAccent)
  const [ready, setReady] = useState(false)

  // Apply accent CSS variables + persist whenever the accent changes.
  useEffect(() => {
    const option = ACCENT_OPTIONS.find((o) => o.color === accent) ?? ACCENT_OPTIONS[0]
    const root = document.documentElement
    root.style.setProperty('--accent', option.color)
    root.style.setProperty('--accent-dim', option.dim)
    root.style.setProperty('--accent-border', option.border)
    localStorage.setItem('pfa_tweaks', JSON.stringify({ accent }))
  }, [accent])

  // Server-side settings are the source of truth for unit + e1RM formula.
  useEffect(() => {
    let cancelled = false
    api
      .get<UserSettings>('/settings')
      .then((s) => {
        if (!cancelled) setSettings(s)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function updateSettings(patch: Partial<UserSettings>) {
    const next = await api.patch<UserSettings>('/settings', patch)
    setSettings(next)
  }

  const value: AppContextValue = {
    settings,
    unit: settings?.unit ?? 'lbs',
    formula: settings?.e1rm_formula ?? 'epley',
    updateSettings,
    accent,
    setAccent,
    ready,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
