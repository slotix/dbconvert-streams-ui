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
