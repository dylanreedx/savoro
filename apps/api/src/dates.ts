const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Strict YYYY-MM-DD check that rejects impossible days (e.g. 2026-02-30). */
export function isCalendarDate(value: string): boolean {
  const match = DATE_RE.exec(value)
  if (!match) return false

  const [, yearPart, monthPart, dayPart] = match
  const year = Number(yearPart)
  const month = Number(monthPart)
  const day = Number(dayPart)
  const date = new Date(Date.UTC(year, month - 1, day))

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

/** The calendar day before a valid YYYY-MM-DD date. */
export function previousCalendarDay(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day) - 86_400_000).toISOString().slice(0, 10)
}
