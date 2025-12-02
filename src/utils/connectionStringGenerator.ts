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

  const type = connection.type.toLowerCase()

  // Detect cloud storage type by checking spec (more reliable than type string)
  const spec = (connection as Connection).spec

  // Handle S3 connections - show s3://endpoint format
  if (spec?.s3 || type === 's3') {
    const host = getConnectionHost(connection as Connection)
    return host ? `s3://${host}` : ''
  }

  // Handle GCS connections - show gs://endpoint format
  if (spec?.gcs || type === 'gcs') {
    const host = getConnectionHost(connection as Connection)
    return host ? `gs://${host}` : ''
  }

  // Handle Azure connections - show azure://endpoint format
  if (spec?.azure || type === 'azure') {
    const host = getConnectionHost(connection as Connection)
    return host ? `azure://${host}` : ''
  }

  // Handle local file connections
  if (spec?.files || type === 'files') {
    const host = getConnectionHost(connection as Connection)
    return host ? `file://${host}` : ''
  }

  // Database connections - traditional connection string format
  const protocolMap: Record<string, string> = {
    PostgreSQL: 'postgresql',
    MySQL: 'mysql',
    Oracle: 'oracle',
    SQLServer: 'sqlserver',
    DB2: 'db2',
    Snowflake: 'snowflake'
  }

  const protocol = protocolMap[connection.type] || type

  const host = getConnectionHost(connection as Connection)
  const port = getConnectionPort(connection as Connection)
  const username = getConnectionUsername(connection as Connection)
  const password = getConnectionPassword(connection as Connection)
  const defaultDatabase = getConnectionDatabase(connection as Connection)

  if (!host) {
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
