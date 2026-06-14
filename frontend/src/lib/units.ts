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
