import type { Connection } from '@/types/connections'
import { getConnectionHost, getConnectionPort } from '@/utils/specBuilder'

export function normalizeConnectionType(type: string): string {
  return type.toLowerCase()
}

export function isSameConnectionType(type1: string, type2: string): boolean {
  return normalizeConnectionType(type1) === normalizeConnectionType(type2)
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
  if (connection.type) {
    parts.push(`Type: ${connection.type}`)
  }
  if (connection.cloud_provider) {
    parts.push(`Cloud: ${connection.cloud_provider}`)
  }
  return parts.join('\n')
}
