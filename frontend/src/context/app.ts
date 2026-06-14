import { createContext, useContext } from 'react'
import type { UserSettings } from '../api/types'

export interface AccentOption {
  label: string
  color: string
  dim: string
  border: string
}

export const ACCENT_OPTIONS: AccentOption[] = [
  { label: 'Orange', color: '#f97316', dim: 'rgba(249,115,22,0.13)', border: 'rgba(249,115,22,0.32)' },
  { label: 'Cyan', color: '#22d3ee', dim: 'rgba(34,211,238,0.12)', border: 'rgba(34,211,238,0.3)' },
  { label: 'Lime', color: '#84cc16', dim: 'rgba(132,204,22,0.12)', border: 'rgba(132,204,22,0.3)' },
]

export interface AppContextValue {
  settings: UserSettings | null
  unit: 'lbs' | 'kg'
  formula: 'epley' | 'brzycki'
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>
  accent: string
  setAccent: (color: string) => void
  ready: boolean
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
