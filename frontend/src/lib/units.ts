const LBS_PER_KG = 2.20462

/** Numeric weight in the chosen display unit (weights are stored in lbs). */
export function convertWeight(lbs: number, unit: 'lbs' | 'kg'): number {
  if (unit === 'kg') return Math.round((lbs / LBS_PER_KG) * 10) / 10
  return Math.round(lbs * 10) / 10
}

/** All weights are stored in lbs; convert only at display time. */
export function displayWeight(lbs: number, unit: 'lbs' | 'kg'): string {
  return `${convertWeight(lbs, unit)}`
}

/** Inverse of convertWeight: turn a value entered in the display unit into lbs. */
export function toLbs(value: number, unit: 'lbs' | 'kg'): number {
  if (unit === 'kg') return Math.round(value * LBS_PER_KG * 10) / 10
  return Math.round(value * 10) / 10
}

const CM_PER_INCH = 2.54

export function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalInches = Math.round(cm / CM_PER_INCH)
  return { ft: Math.floor(totalInches / 12), inches: totalInches % 12 }
}

export function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * 12 + inches) * CM_PER_INCH * 10) / 10
}

/** Human height string for the active unit: 5'11" for lbs, 180 cm for kg. */
export function formatHeight(cm: number | null, unit: 'lbs' | 'kg'): string {
  if (cm == null) return '—'
  if (unit === 'kg') return `${Math.round(cm)} cm`
  const { ft, inches } = cmToFtIn(cm)
  return `${ft}'${inches}"`
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function todayISO(): string {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
