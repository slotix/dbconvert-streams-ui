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

/**
 * Legacy formatDate - kept for backward compatibility
 * @deprecated Use formatDateTime instead for consistent formatting
 */
export function formatDate(date: number): string {
  return new Date(date * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function formatDataSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
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

export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Parse a data size string (e.g., "11.7 KB", "1.5 MB") to bytes
 * @param sizeStr Size string with unit
 * @returns Size in bytes
 */
export function parseDataSize(sizeStr: string | undefined): number {
  if (!sizeStr) return 0
  const numStr = sizeStr.replace(/[^0-9.]/g, '')
  const num = parseFloat(numStr) || 0
  const upper = sizeStr.toUpperCase()
  if (upper.includes('TB')) return num * Math.pow(1024, 4)
  if (upper.includes('GB')) return num * Math.pow(1024, 3)
  if (upper.includes('MB')) return num * Math.pow(1024, 2)
  if (upper.includes('KB')) return num * 1024
  if (upper.includes('B')) return num
  return num
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
