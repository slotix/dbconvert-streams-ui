/**
 * Parses a routine label that may include a signature (e.g., "myFunc(int, text)")
 * into the routine name and optional signature components.
 */
export function parseRoutineName(label: string): { routineName: string; signature?: string } {
  const trimmed = label.trim()
  const openParen = trimmed.indexOf('(')
  if (openParen < 0) {
    return { routineName: trimmed }
  }
  const closeParen = trimmed.lastIndexOf(')')
  if (closeParen < openParen) {
    return { routineName: trimmed }
  }
  return {
    routineName: trimmed.slice(0, openParen).trim(),
    signature: trimmed.slice(openParen + 1, closeParen).trim()
  }
}
