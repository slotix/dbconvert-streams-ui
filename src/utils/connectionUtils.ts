import type { Connection } from '@/types/connections'
import { getConnectionTypeLabel } from '@/types/specs'
import { getConnectionHost, getConnectionPort } from '@/utils/specBuilder'

export function normalizeConnectionType(type: string): string {
  return type.toLowerCase()
}

/**
 * Generates a tooltip string with full connection details
 * @param connection - The connection object
 * @returns Multi-line tooltip string with connection name, host:port, type, and cloud provider
 */
export function getConnectionTooltip(connection: Connection): string {
  const parts = [connection.name || 'Connection']
  const host = getConnectionHost(connection)
  const port = getConnectionPort(connection)
  if (host && port) {
    parts.push(`${host}:${port}`)
  }
  const typeLabel = getConnectionTypeLabel(connection.spec, connection.type)
  if (typeLabel) {
    parts.push(`Type: ${typeLabel}`)
  }
  if (connection.cloud_provider) {
    parts.push(`Cloud: ${connection.cloud_provider}`)
  }
  return parts.join('\n')
}
