/**
 * Federated Mode Utilities
 *
 * Shared utilities for handling multi-source/federated stream configurations.
 * Centralizes alias normalization, table name parsing, and connection lookups.
 */

import type { StreamConnectionMapping } from '@/types/streamConfig'

/** Default alias prefix for source connections (fallback) */
export const DEFAULT_ALIAS = 'db'

/**
 * Alias prefix mapping based on connection/database type.
 * Used to generate meaningful aliases like `pg1`, `my1` instead of generic `src1`, `src2`.
 */
export const ALIAS_PREFIX_MAP: Record<string, string> = {
  postgresql: 'pg',
  postgres: 'pg',
  mysql: 'my',
  mariadb: 'my',
  s3: 's3',
  gcs: 'gcs',
  azure: 'azure',
  files: 'files',
  csv: 'csv',
  parquet: 'pq',
  jsonl: 'json'
}

/**
 * Get the alias prefix for a given connection type.
 *
 * @param connectionType - The type of connection (e.g., 'postgresql', 'mysql', 's3')
 * @returns The prefix to use for aliases (e.g., 'pg', 'my', 's3')
 */
export function getAliasPrefix(connectionType?: string): string {
  const normalized = connectionType?.toLowerCase() || ''
  return ALIAS_PREFIX_MAP[normalized] || DEFAULT_ALIAS
}

/**
 * Generate a unique alias for a connection based on its type.
 *
 * @param connectionType - The type of connection (e.g., 'postgresql', 'mysql')
 * @param existingAliases - Array of already-used aliases to avoid conflicts
 * @returns A unique alias like 'pg1', 'pg2', 'my1', etc.
 */
export function generateTypeBasedAlias(
  connectionType?: string,
  existingAliases: string[] = []
): string {
  const prefix = getAliasPrefix(connectionType)
  let counter = 1
  while (existingAliases.includes(`${prefix}${counter}`)) {
    counter++
  }
  return `${prefix}${counter}`
}

/**
 * Parsed table name components for federated mode
 */
export interface ParsedTableName {
  /** Connection alias (e.g., "src2") - only present in federated mode */
  alias?: string
  /** Schema name (e.g., "public") - for PostgreSQL */
  schema?: string
  /** Base table name (e.g., "users") */
  table: string
  /** Original full table name */
  fullName: string
}

/**
 * Normalize source connections to ensure unique, non-empty aliases.
 * Generates type-based aliases like "pg1", "my1" when connection type is provided,
 * or falls back to "db1", "db2" for generic aliases.
 *
 * @param connections - Array of connection mappings to normalize
 * @param getConnectionType - Optional function to get connection type for type-based alias generation
 * @returns Normalized connections with guaranteed unique aliases
 */
export function normalizeConnectionAliases<T extends { alias?: string; connectionId: string }>(
  connections: T[],
  getConnectionType?: (connectionId: string) => string | undefined
): T[] {
  const usedAliases = new Set<string>()

  return connections.map((conn) => {
    let alias = (conn.alias || '').trim()

    // Generate type-based alias if empty
    if (!alias) {
      const connectionType = getConnectionType?.(conn.connectionId)
      alias = generateTypeBasedAlias(connectionType, Array.from(usedAliases))
    }

    // Ensure uniqueness even for user-provided aliases
    if (usedAliases.has(alias)) {
      const connectionType = getConnectionType?.(conn.connectionId)
      alias = generateTypeBasedAlias(connectionType, Array.from(usedAliases))
    }

    usedAliases.add(alias)
    return { ...conn, alias }
  })
}

/**
 * Parse a table name to extract alias, schema, and table components.
 * Handles different formats:
 * - Federated with schema: "src2.public.users" -> { alias: "src2", schema: "public", table: "users" }
 * - Federated without schema: "src2.users" -> { alias: "src2", table: "users" }
 * - Non-federated with schema: "public.users" -> { schema: "public", table: "users" }
 * - Simple: "users" -> { table: "users" }
 *
 * @param tableName - Full table name to parse
 * @param isFederated - Whether multi-source/federated mode is active
 * @returns Parsed table name components
 */
export function parseTableName(tableName: string, isFederated: boolean): ParsedTableName {
  const parts = tableName.split('.')
  const result: ParsedTableName = { table: tableName, fullName: tableName }

  if (isFederated && parts.length >= 3) {
    // Federated with schema: alias.schema.table
    result.alias = parts[0]
    result.schema = parts[1]
    result.table = parts.slice(2).join('.')
  } else if (isFederated && parts.length === 2) {
    // Federated without schema: alias.table
    result.alias = parts[0]
    result.table = parts[1]
  } else if (parts.length === 2) {
    // Non-federated with schema: schema.table
    result.schema = parts[0]
    result.table = parts[1]
  } else if (parts.length === 1) {
    // Simple table name
    result.table = parts[0]
  }

  return result
}

/**
 * Strip the alias prefix from a table name in federated mode.
 * "src2.public.users" -> "public.users"
 * "src2.users" -> "users"
 *
 * @param tableName - Full table name possibly with alias prefix
 * @param isFederated - Whether multi-source/federated mode is active
 * @returns Table name without alias prefix
 */
export function stripAliasPrefix(tableName: string, isFederated: boolean): string {
  if (!isFederated) return tableName

  const parts = tableName.split('.')
  if (parts.length >= 2) {
    return parts.slice(1).join('.')
  }
  return tableName
}

/**
 * Extract schema from a table name, handling federated mode correctly.
 * In federated mode: "src2.public.users" -> "public"
 * Non-federated: "public.users" -> "public"
 *
 * @param tableName - Full table name
 * @param isFederated - Whether multi-source/federated mode is active
 * @returns Schema name or empty string if no schema
 */
export function extractSchema(tableName: string, isFederated: boolean): string {
  const parsed = parseTableName(tableName, isFederated)
  return parsed.schema || ''
}

/**
 * Get display name for a table (without alias prefix for federated mode).
 *
 * @param tableName - Full table name
 * @param isFederated - Whether multi-source/federated mode is active
 * @returns Display name for the table
 */
export function getTableDisplayName(tableName: string, isFederated: boolean): string {
  return stripAliasPrefix(tableName, isFederated)
}

/**
 * Format a table name with alias prefix for federated mode.
 *
 * @param alias - Connection alias
 * @param schema - Schema name (optional)
 * @param table - Base table name
 * @returns Formatted table name
 */
export function formatTableName(alias: string, schema: string | undefined, table: string): string {
  if (schema) {
    return `${alias}.${schema}.${table}`
  }
  return `${alias}.${table}`
}

/**
 * Find a connection by its alias in a connections array.
 *
 * @param alias - Alias to search for
 * @param connections - Array of connections to search
 * @returns Matching connection or undefined
 */
export function getConnectionByAlias<T extends { alias?: string }>(
  alias: string,
  connections: T[]
): T | undefined {
  return connections.find((c) => c.alias === alias)
}

/**
 * Find the connection that owns a table based on its alias prefix.
 * Falls back to first connection if alias not found or not in federated mode.
 *
 * @param tableName - Table name (possibly with alias prefix)
 * @param connections - Array of source connections
 * @returns The owning connection or first connection as fallback
 */
export function getConnectionForTable<T extends { alias?: string }>(
  tableName: string,
  connections: T[]
): T | null {
  if (connections.length === 0) return null
  if (connections.length === 1) return connections[0]

  // In federated mode, extract alias from table name
  const parts = tableName.split('.')
  if (parts.length >= 2) {
    const alias = parts[0]
    const found = getConnectionByAlias(alias, connections)
    if (found) return found
  }

  return connections[0]
}

/**
 * Check if the stream is in federated/multi-source mode.
 *
 * @param connections - Array of source connections
 * @returns True if more than one connection (federated mode)
 */
export function isFederatedMode(connections: unknown[] | undefined): boolean {
  return (connections?.length || 0) > 1
}

/**
 * Extract alias from a federated table name.
 *
 * @param tableName - Table name to parse
 * @param connections - Connections to validate alias against
 * @returns Alias if found and valid, null otherwise
 */
export function extractAlias<T extends { alias?: string }>(
  tableName: string,
  connections: T[]
): string | null {
  const parts = tableName.split('.')
  if (parts.length >= 2) {
    const potentialAlias = parts[0]
    if (getConnectionByAlias(potentialAlias, connections)) {
      return potentialAlias
    }
  }
  return null
}

/**
 * Normalize a StreamConnectionMapping array, preserving all per-connection fields.
 * This is the full version used by the stream config store.
 *
 * @param connections - Connections to normalize
 * @returns Normalized connections with unique aliases
 */
export function normalizeStreamConnections(
  connections: StreamConnectionMapping[]
): StreamConnectionMapping[] {
  const usedAliases = new Set<string>()

  return connections.map((conn, idx) => {
    let alias = (conn.alias || '').trim()

    if (!alias) {
      alias = idx === 0 ? DEFAULT_ALIAS : `${DEFAULT_ALIAS}${idx + 1}`
    }

    let aliasIndex = idx + 1
    while (usedAliases.has(alias)) {
      aliasIndex += 1
      alias = `${DEFAULT_ALIAS}${aliasIndex}`
    }
    usedAliases.add(alias)

    return {
      alias,
      connectionId: conn.connectionId,
      database: conn.database,
      schema: conn.schema,
      tables: conn.tables,
      queries: conn.queries,
      s3: conn.s3
    }
  })
}
