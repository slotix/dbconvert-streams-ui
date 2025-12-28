import type { Connection } from '@/types/connections'
import { getConnectionKindFromSpec } from '@/types/specs'
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
  const spec = (connection as Connection).spec
  const kind = getConnectionKindFromSpec(spec)
  if (!kind) return ''

  // Handle S3 connections - show s3://endpoint format
  if (kind === 's3') {
    const host = getConnectionHost(connection as Connection)
    return host ? `s3://${host}` : ''
  }

  // Handle GCS connections - show gs://endpoint format
  if (kind === 'gcs') {
    const host = getConnectionHost(connection as Connection)
    return host ? `gs://${host}` : ''
  }

  // Handle Azure connections - show azure://endpoint format
  if (kind === 'azure') {
    const host = getConnectionHost(connection as Connection)
    return host ? `azure://${host}` : ''
  }

  // Handle local file connections
  if (kind === 'files') {
    const host = getConnectionHost(connection as Connection)
    return host ? `file://${host}` : ''
  }

  // Database connections - traditional connection string format
  if (kind !== 'database' && kind !== 'snowflake') {
    return ''
  }

  const protocolMap: Record<string, string> = {
    postgresql: 'postgresql',
    postgres: 'postgresql',
    mysql: 'mysql',
    mariadb: 'mysql',
    oracle: 'oracle',
    sqlserver: 'sqlserver',
    mssql: 'sqlserver',
    db2: 'db2',
    snowflake: 'snowflake'
  }

  const type = (connection.type || '').toLowerCase()
  const protocol = protocolMap[type] || type

  const host = getConnectionHost(connection as Connection)
  const port = getConnectionPort(connection as Connection)
  const username = getConnectionUsername(connection as Connection)
  const password = getConnectionPassword(connection as Connection)
  const defaultDatabase = getConnectionDatabase(connection as Connection)

  if (!protocol || !host) {
    return ''
  }

  const displayPassword = showPassword ? password : '****'
  const auth = username ? `${username}:${encodeURIComponent(displayPassword || '')}@` : ''

  // Include port only if it exists
  const portPart = port ? `:${port}` : ''

  // Include default database in path if specified, otherwise omit it
  const databasePath = defaultDatabase ? `/${defaultDatabase}` : ''

  return `${protocol}://${auth}${host}${portPart}${databasePath}`
}
