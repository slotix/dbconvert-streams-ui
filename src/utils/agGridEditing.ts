export type ColumnEditorKind = 'integer' | 'number' | 'date' | 'datetime' | 'text'

export function normalizeSqlType(sqlType: string): string {
  return sqlType.trim().toLowerCase()
}

export function inferEditorKind(sqlType: string): ColumnEditorKind {
  const t = normalizeSqlType(sqlType)

  // Common numeric families across MySQL/Postgres/Snowflake.
  if (t.includes('int') || t.includes('serial')) return 'integer'
  if (
    t.includes('decimal') ||
    t.includes('numeric') ||
    t.includes('number') ||
    t.includes('float') ||
    t.includes('double') ||
    t.includes('real')
  ) {
    return 'number'
  }

  // Date/time.
  if (t === 'date' || t.startsWith('date(')) return 'date'
  if (t.includes('timestamp') || t.includes('datetime') || t.includes('timestamptz')) {
    return 'datetime'
  }

  return 'text'
}

export function emptyToNullIfNullable(value: unknown, isNullable: boolean): unknown {
  if (!isNullable) return value
  if (value === '' || value === null || value === undefined) return null
  return value
}

export function parseNumberInput(
  raw: unknown,
  kind: 'integer' | 'number',
  isNullable: boolean,
  oldValue: unknown,
  scale?: number
): unknown {
  const normalized = emptyToNullIfNullable(raw, isNullable)
  if (normalized === null) return null
  if (typeof normalized === 'number') {
    if (kind === 'integer') return normalized
    if (typeof scale === 'number' && scale >= 0) {
      const factor = Math.pow(10, scale)
      return Math.round(normalized * factor) / factor
    }
    return normalized
  }

  const s = String(normalized).trim().replace(',', '.')

  // If the editor gives us an empty/invalid string for a NOT NULL column, keep the old value
  // rather than turning the cell into an empty string.
  if (s === '') return isNullable ? null : oldValue

  // Avoid transient invalid states that can happen mid-edit.
  if (s === '-' || s === '+' || s === '.' || s === '-.' || s === '+.') return oldValue

  const n = kind === 'integer' ? Number.parseInt(s, 10) : Number.parseFloat(s)
  if (Number.isNaN(n)) return oldValue

  if (kind === 'number' && typeof scale === 'number' && scale >= 0) {
    const factor = Math.pow(10, scale)
    return Math.round(n * factor) / factor
  }

  return n
}

export function normalizeDateString(raw: unknown, isNullable: boolean): unknown {
  const normalized = emptyToNullIfNullable(raw, isNullable)
  if (normalized === null) return null
  const s = String(normalized).trim()
  if (s === '') return isNullable ? null : raw

  // Best-effort: accept YYYY-MM-DD or ISO timestamps and keep YYYY-MM-DD.
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : s
}

export function normalizeDateTimeString(raw: unknown, isNullable: boolean): unknown {
  const normalized = emptyToNullIfNullable(raw, isNullable)
  if (normalized === null) return null
  const s = String(normalized).trim()
  if (s === '') return isNullable ? null : raw

  // Accept common inputs and normalize to "YYYY-MM-DD HH:mm:ss".
  // - "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss" -> space + ensure seconds
  // - "YYYY-MM-DD HH:mm" or "YYYY-MM-DD HH:mm:ss" -> ensure seconds
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
    const [datePart, timePartRaw] = s.split('T')
    const timePart = timePartRaw?.slice(0, 8) || ''
    const withSeconds = timePart.length === 5 ? `${timePart}:00` : timePart
    return withSeconds ? `${datePart} ${withSeconds}` : s
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) {
    const [datePart, timePartRaw] = s.split(' ')
    const timePart = timePartRaw?.slice(0, 8) || ''
    const withSeconds = timePart.length === 5 ? `${timePart}:00` : timePart
    return withSeconds ? `${datePart} ${withSeconds}` : s
  }

  return s
}

export function valuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return String(a) === String(b)
  }
}

export function isNumericType(sqlType: string | undefined): boolean {
  if (!sqlType) return false
  const t = normalizeSqlType(sqlType)
  return (
    t.includes('decimal') ||
    t.includes('numeric') ||
    t.includes('number') ||
    t.includes('float') ||
    t.includes('double') ||
    t.includes('real')
  )
}

export function numbersEqual(a: unknown, b: unknown, scale?: number): boolean {
  if (a === null || a === undefined) return b === null || b === undefined
  if (b === null || b === undefined) return false

  const toNum = (v: unknown): number | null => {
    if (typeof v === 'number') return v
    const s = String(v).trim().replace(',', '.')
    if (s === '') return null
    const n = Number.parseFloat(s)
    return Number.isNaN(n) ? null : n
  }

  const na = toNum(a)
  const nb = toNum(b)
  if (na === null || nb === null) return false

  if (typeof scale === 'number' && scale >= 0) {
    const factor = Math.pow(10, scale)
    return Math.round(na * factor) === Math.round(nb * factor)
  }

  return Object.is(na, nb)
}

export function valuesEqualForSqlType(
  a: unknown,
  b: unknown,
  sqlType: string | undefined,
  scale?: number
): boolean {
  if (isNumericType(sqlType)) return numbersEqual(a, b, scale)
  return valuesEqual(a, b)
}
