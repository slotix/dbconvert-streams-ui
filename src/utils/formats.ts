/**
 * Format Unix timestamp (seconds) to date with time in standard format
 * Format: "26 Oct 2025 - 01:17"
 * @param timestamp Unix timestamp in seconds
 * @returns Formatted date string
 */
export function formatDateTime(timestamp: number): string {
  if (!timestamp || typeof timestamp !== 'number') return ''
  const date = new Date(timestamp * 1000)
  return date
    .toLocaleString('en-GB', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    .replace(',', ' -')
}

export function formatDataSize(bytes: number, zeroAsNA = false): string {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return zeroAsNA ? 'N/A' : '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}

/**
 * Format data transfer rate (bytes per second) to human-readable format with /s suffix
 * Example: 1048576 bytes/s → "1.00 MB/s"
 * @param bytesPerSecond Transfer rate in bytes per second
 * @returns Formatted rate string with /s suffix
 */
export function formatDataRate(bytesPerSecond: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  if (bytesPerSecond === 0) return '0 B/s'
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(1024))
  return `${(bytesPerSecond / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}/s`
}

/**
 * Format data size to numeric value only (without unit)
 * Example: 1048576 bytes → "1.00"
 * Returns object with value and unit for flexible display
 * @param bytes Size in bytes
 * @returns Object with numeric value and unit
 */
export function formatDataSizeWithUnit(bytes: number): { value: string; unit: string } {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return { value: '0', unit: 'B' }
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return {
    value: (bytes / Math.pow(1024, i)).toFixed(2),
    unit: sizes[i]
  }
}

/**
 * Format data transfer rate with separate value and unit
 * Example: 1048576 bytes/s → { value: "1.00", unit: "MB/s" }
 * @param bytesPerSecond Transfer rate in bytes per second
 * @returns Object with numeric value and unit with /s
 */
export function formatDataRateWithUnit(bytesPerSecond: number): { value: string; unit: string } {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  if (bytesPerSecond === 0) return { value: '0', unit: 'B/s' }
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(1024))
  return {
    value: (bytesPerSecond / Math.pow(1024, i)).toFixed(2),
    unit: `${sizes[i]}/s`
  }
}

export function formatDateShort(date: string): string {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return new Date(date).toLocaleDateString(undefined, options)
}

export function formatMonth(month: string): string {
  const options: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' }
  return new Date(month).toLocaleDateString(undefined, options)
}

export function formatDuration(nanoseconds: number): string {
  // Convert nanoseconds to different units
  const totalSeconds = Math.floor(nanoseconds / 1e9)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  const ms = Math.floor((nanoseconds % 1e9) / 1e7) // Convert to 2 digit milliseconds

  let result = ''

  if (nanoseconds === 0) return '0s'

  if (h > 0) {
    result += `${h}h`
  }
  if (m > 0) {
    result += `${m}m`
  }

  // Format with 2 digit milliseconds
  result += `${s}.${ms.toString().padStart(2, '0')}s`

  return result
}

/**
 * Format elapsed time (nanoseconds) with separated value and unit
 * Returns compact or detailed format based on duration
 * Examples: { value: "0.11", unit: "s" } or { value: "1.5", unit: "m" }
 * @param nanoseconds Elapsed time in nanoseconds
 * @returns Object with numeric value and unit
 */
export function formatElapsedTimeWithUnit(nanoseconds: number): { value: string; unit: string } {
  const totalSeconds = nanoseconds / 1e9

  if (totalSeconds === 0) return { value: '0', unit: 's' }

  // For times > 1 hour, show hours and minutes
  if (totalSeconds >= 3600) {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    if (m > 0) {
      return { value: `${h}.${m.toString().padStart(2, '0')}`, unit: 'h' }
    }
    return { value: h.toFixed(2), unit: 'h' }
  }

  // For times > 1 minute, show minutes and seconds
  if (totalSeconds >= 60) {
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return { value: `${m}.${Math.floor(s).toString().padStart(2, '0')}`, unit: 'm' }
  }

  // For times < 1 minute, show seconds with 2 decimal places
  return { value: totalSeconds.toFixed(2), unit: 's' }
}

export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Format number with K/M suffix for large numbers
 * Example: 1500 → "1.5K", 2500000 → "2.5M"
 * @param num Number to format
 * @returns Formatted string with K/M suffix
 */
export function formatNumberCompact(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M'
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K'
  }
  return num.toString()
}

/**
 * Parse a data size to bytes
 * Accepts either:
 * - Raw number (already in bytes) from backend payload
 * - Formatted string (e.g., "11.7 KB", "1.5 MB") for backwards compatibility
 * @param size Size as number (bytes) or string with unit
 * @returns Size in bytes
 */
export function parseDataSize(size: string | number | undefined): number {
  if (size === undefined || size === null) return 0

  // If already a number, it's raw bytes from the backend
  if (typeof size === 'number') {
    return Math.floor(size)
  }

  // Handle string format (backwards compatibility)
  if (typeof size === 'string') {
    const numStr = size.replace(/[^0-9.]/g, '')
    const num = parseFloat(numStr) || 0
    const upper = size.toUpperCase()
    if (upper.includes('TB')) return num * Math.pow(1024, 4)
    if (upper.includes('GB')) return num * Math.pow(1024, 3)
    if (upper.includes('MB')) return num * Math.pow(1024, 2)
    if (upper.includes('KB')) return num * 1024
    if (upper.includes('B')) return num
    return num
  }

  return 0
}

/**
 * Parse a duration string (e.g., "8ms", "2s", "1m", "1.5h") to milliseconds
 * @param durationStr Duration string with unit
 * @returns Duration in milliseconds
 */
export function parseDuration(durationStr: string | undefined): number {
  if (!durationStr) return 0
  const match = durationStr.match(/^([\d.]+)(\w+)$/)
  if (!match) return 0
  const num = parseFloat(match[1])
  const unit = match[2].toLowerCase()
  if (unit === 'ms') return num
  if (unit === 's') return num * 1000
  if (unit === 'm') return num * 60000
  if (unit === 'h') return num * 3600000
  return num
}

/**
 * Parse a numeric string (plain number or with K/M/B suffix) to number
 * @param numStr Numeric string (e.g., "200", "1.5K", "2M")
 * @returns Parsed number
 */
export function parseNumber(numStr: string | undefined): number {
  if (!numStr) return 0
  const cleaned = numStr.replace(/[^0-9.KMB]/gi, '')
  const num = parseFloat(cleaned.replace(/[KMB]/gi, '')) || 0
  const upper = cleaned.toUpperCase()
  if (upper.includes('B')) return num * 1000000000
  if (upper.includes('M')) return num * 1000000
  if (upper.includes('K')) return num * 1000
  return num
}
