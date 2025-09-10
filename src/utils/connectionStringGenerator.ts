import type { Connection } from '@/types/connections'

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

  if (!connection.host || !connection.port) {
    return ''
  }

  const password = showPassword ? connection.password : '****'
  const auth = connection.username
    ? `${connection.username}:${encodeURIComponent(password || '')}@`
    : ''

  // Include database in path if specified, otherwise omit it
  const databasePath = connection.database ? `/${connection.database}` : ''

  return `${protocol}://${auth}${connection.host}:${connection.port}${databasePath}`
}
