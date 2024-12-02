import type { Connection } from '@/types/connections'

export function generateConnectionString(connection: Partial<Connection>): string {
  if (!connection?.type) return ''

  // Map our database types to protocol names
  const protocolMap: Record<string, string> = {
    'PostgreSQL': 'postgresql',
    'MySQL': 'mysql',
    'Oracle': 'oracle',
    'SQLServer': 'sqlserver',
    'DB2': 'db2'
  }

  const protocol = protocolMap[connection.type] || connection.type.toLowerCase()
  
  // Return early if required fields are missing
  if (!connection.host || !connection.port || !connection.database) {
    return ''
  }

  const auth = connection.username ? 
    `${encodeURIComponent(connection.username)}:${encodeURIComponent(connection.password || '')}@` : 
    ''
  
  return `${protocol}://${auth}${connection.host}:${connection.port}/${connection.database}`
} 