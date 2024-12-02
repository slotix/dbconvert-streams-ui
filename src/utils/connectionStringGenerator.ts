import type { Connection } from '@/types/connections'

export function generateConnectionString(connection: Partial<Connection>, showPassword: boolean = false): string {
  if (!connection?.type) return ''

  const protocolMap: Record<string, string> = {
    'PostgreSQL': 'postgresql',
    'MySQL': 'mysql',
    'Oracle': 'oracle',
    'SQLServer': 'sqlserver',
    'DB2': 'db2'
  }

  const protocol = protocolMap[connection.type] || connection.type.toLowerCase()
  
  if (!connection.host || !connection.port || !connection.database) {
    return ''
  }

  const password = showPassword ? connection.password : '********'
  const auth = connection.username ? 
    `${encodeURIComponent(connection.username)}:${encodeURIComponent(password || '')}@` : 
    ''
  
  return `${protocol}://${auth}${connection.host}:${connection.port}/${connection.database}`
} 