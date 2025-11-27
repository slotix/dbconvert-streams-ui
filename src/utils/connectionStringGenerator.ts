import type { Connection } from '@/types/connections'
import {
  getConnectionHost,
  getConnectionPort,
  getConnectionUsername,
  getConnectionPassword,
  getConnectionDatabase
} from '@/utils/specBuilder'

export function generateConnectionString(
  connection: Partial<Connection>,
  showPassword: boolean = false
): string {
  if (!connection?.type) return ''

  const protocolMap: Record<string, string> = {
    PostgreSQL: 'postgresql',
    MySQL: 'mysql',
    Oracle: 'oracle',
    SQLServer: 'sqlserver',
    DB2: 'db2'
  }

  const protocol = protocolMap[connection.type] || connection.type.toLowerCase()

  const host = getConnectionHost(connection as Connection)
  const port = getConnectionPort(connection as Connection)
  const username = getConnectionUsername(connection as Connection)
  const password = getConnectionPassword(connection as Connection)
  const defaultDatabase = getConnectionDatabase(connection as Connection)

  if (!host || !port) {
    return ''
  }

  const displayPassword = showPassword ? password : '****'
  const auth = username ? `${username}:${encodeURIComponent(displayPassword || '')}@` : ''

  // Include default database in path if specified, otherwise omit it
  const databasePath = defaultDatabase ? `/${defaultDatabase}` : ''

  return `${protocol}://${auth}${host}:${port}${databasePath}`
}
