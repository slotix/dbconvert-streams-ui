export type HighlightPart = { text: string; match: boolean }

/**
 * Split text into parts where parts with match=true represent case-insensitive
 * matches of `query`. Use to render highlighted substrings consistently.
 */
export function highlightParts(text: string, query: string): HighlightPart[] {
  const q = (query || '').trim()
  if (!q) return [{ text, match: false }]
  const lower = text.toLowerCase()
  const ql = q.toLowerCase()
  const parts: HighlightPart[] = []
  let i = 0
  let idx = lower.indexOf(ql, i)
  while (idx !== -1) {
    if (idx > i) parts.push({ text: text.slice(i, idx), match: false })
    parts.push({ text: text.slice(idx, idx + q.length), match: true })
    i = idx + q.length
    idx = lower.indexOf(ql, i)
  }
  if (i < text.length) parts.push({ text: text.slice(i), match: false })
  return parts
}
