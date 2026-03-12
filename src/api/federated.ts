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
  /**
   * Optional file scope path for local files sources in federated mode.
   * For file mappings, UI stores selected folder in `database`; this field
   * carries it explicitly for backend path normalization.
   */
  scopePath?: string
}

/**
 * Request payload for executing a federated query
 */
interface FederatedQueryRequest {
  /** SQL query that may reference multiple connection aliases */
  query: string
  /** List of connections to attach with their aliases */
  connections: ConnectionMapping[]
}

/**
 * Response from a successful federated query execution
 */
interface FederatedQueryResponse {
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
    const normalizedRequest: FederatedQueryRequest = {
      ...request,
      connections: normalizeFederatedConnectionMappings(request.connections)
    }
    const response: AxiosResponse<FederatedQueryResponse> = await apiClient.post(
      '/query/federated',
      normalizedRequest,
      {
        timeout: API_TIMEOUTS.VERY_LONG // 2 minutes for complex cross-connection queries
      }
    )
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

function normalizeFederatedConnectionMappings(
  connections: ConnectionMapping[]
): ConnectionMapping[] {
  return connections.map((mapping) => {
    const explicitScopePath = mapping.scopePath?.trim()
    if (explicitScopePath) {
      return { ...mapping, scopePath: explicitScopePath }
    }

    const selectedDatabase = mapping.database?.trim()
    if (!selectedDatabase) {
      return mapping
    }

    // For file sources, selected folder scope is currently kept in `database`.
    // Send it explicitly as scopePath so backend can normalize relative read_* paths.
    return {
      ...mapping,
      scopePath: selectedDatabase
    }
  })
}
