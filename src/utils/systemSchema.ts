/**
 * Schema-level system object detection.
 *
 * Uses `schemaSystemInfo` from the API (DatabaseInfo.schemas[].isSystem).
 * No frontend heuristics: system detection is owned by the backend.
 */
export function isSystemSchema(
  schemaName: string | undefined | null,
  schemaSystemInfo?: Map<string, boolean>
): boolean {
  const normalized = (schemaName || '').trim()
  if (!normalized) return false

  const key = normalized.toLowerCase()

  const explicit = schemaSystemInfo?.get(key)
  return explicit === true
}
