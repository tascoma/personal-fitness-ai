import type { JSX } from 'react'

export const Icons: Record<string, () => JSX.Element> = {
  dashboard: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="6" height="6" rx="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" />
    </svg>
  ),
  log: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <circle cx="8" cy="8" r="7" />
      <line x1="8" y1="5" x2="8" y2="11" />
      <line x1="5" y1="8" x2="11" y2="8" />
    </svg>
  ),
  history: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="7" />
      <polyline points="8,4 8,8 11,10" />
    </svg>
  ),
  progress: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="2,13 5,8 9,10 14,3" />
      <polyline points="11,3 14,3 14,6" />
    </svg>
  ),
  exercises: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="6" width="3" height="4" rx="1" />
      <rect x="12" y="6" width="3" height="4" rx="1" />
      <rect x="4" y="4" width="2" height="8" rx="1" />
      <rect x="10" y="4" width="2" height="8" rx="1" />
      <rect x="6" y="7" width="4" height="2" rx="1" />
    </svg>
  ),
  settings: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" />
    </svg>
  ),
  tweaks: () => (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    >
      <line x1="2" y1="4" x2="13" y2="4" />
      <circle cx="5" cy="4" r="1.5" fill="currentColor" stroke="none" />
      <line x1="2" y1="10" x2="13" y2="10" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
}
