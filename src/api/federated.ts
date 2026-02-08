/**
 * Federated Query API Client
 *
 * Handles cross-connection SQL queries executed through DuckDB federation.
 * Allows querying across multiple database connections (PostgreSQL, MySQL)
 * and file sources in a single SQL query.
 */

import { type AxiosResponse } from 'axios'
import { apiClient } from './apiClient'
import { handleApiError } from '@/utils/errorHandler'
import { API_TIMEOUTS } from '@/constants'

/**
 * Maps a database connection to an alias for use in federated queries.
 * The alias becomes the database name prefix in SQL (e.g., pg1.public.customers).
 */
export interface ConnectionMapping {
  /** Alias to use in SQL queries (e.g., "pg1", "mysql1") */
  alias: string
  /** UUID of the stored connection */
  connectionId: string
  /** Optional specific database to connect to */
  database?: string
}

/**
 * Request payload for executing a federated query
 */
export interface FederatedQueryRequest {
  /** SQL query that may reference multiple connection aliases */
  query: string
  /** List of connections to attach with their aliases */
  connections: ConnectionMapping[]
}

/**
 * Response from a successful federated query execution
 */
export interface FederatedQueryResponse {
  /** Column names in result set order */
  columns: string[]
  /** Result rows as arrays of values (matching column order) */
  rows: unknown[][]
  /** Total number of rows returned */
  count: number
  /** Execution status ("success" or error message) */
  status: string
  /** Query execution duration in milliseconds */
  duration?: number
}

/**
 * Schema information for an attached database
 */
export interface AttachedDatabaseSchema {
  /** Alias of the attached database */
  alias: string
  /** List of schemas/databases available */
  schemas: string[]
  /** Tables per schema */
  tables: Record<string, string[]>
}

/**
 * Execute a federated query across multiple database connections.
 *
 * @param request - The query and connection mappings
 * @returns Query results with columns, rows, and metadata
 * @throws Error if query execution fails or connections are invalid
 *
 * @example
 * ```typescript
 * const result = await executeFederatedQuery({
 *   query: 'SELECT c.name, o.total FROM pg1.public.customers c JOIN mysql1.sakila.orders o ON c.id = o.customer_id',
 *   connections: [
 *     { alias: 'pg1', connectionId: 'uuid-1', database: 'mydb' },
 *     { alias: 'mysql1', connectionId: 'uuid-2', database: 'sakila' }
 *   ]
 * })
 * ```
 */
export async function executeFederatedQuery(
  request: FederatedQueryRequest
): Promise<FederatedQueryResponse> {
  try {
    const response: AxiosResponse<FederatedQueryResponse> = await apiClient.post(
      '/query/federated',
      request,
      {
        timeout: API_TIMEOUTS.VERY_LONG // 2 minutes for complex cross-connection queries
      }
    )
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

/**
 * Validate a federated query without executing it.
 * Checks SQL syntax and verifies all referenced aliases are valid.
 *
 * @param request - The query and connection mappings to validate
 * @returns Validation result with any errors found
 */
export async function validateFederatedQuery(
  request: FederatedQueryRequest
): Promise<{ valid: boolean; errors?: string[] }> {
  try {
    const response: AxiosResponse<{ valid: boolean; errors?: string[] }> = await apiClient.post(
      '/query/federated/validate',
      request,
      {
        timeout: API_TIMEOUTS.SHORT
      }
    )
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

/**
 * Get schema information for attached databases.
 * Useful for autocomplete and schema browsing in the federated console.
 *
 * @param connections - Connection mappings to get schema for
 * @returns Schema information for each attached database
 */
export async function getFederatedSchemas(
  connections: ConnectionMapping[]
): Promise<AttachedDatabaseSchema[]> {
  try {
    const response: AxiosResponse<AttachedDatabaseSchema[]> = await apiClient.post(
      '/query/federated/schemas',
      { connections },
      {
        timeout: API_TIMEOUTS.MEDIUM
      }
    )
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

export default {
  executeFederatedQuery,
  validateFederatedQuery,
  getFederatedSchemas
}
