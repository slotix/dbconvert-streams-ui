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
