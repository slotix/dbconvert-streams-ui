import { computed, type ComputedRef, type Ref } from 'vue'
import type { ConnectionMapping } from '@/api/federated'
import type { Connection } from '@/types/connections'
import type { ConsoleMode } from '@/components/console/types'
import type { SqlQueryTab } from '@/stores/sqlConsole'
import {
  getConnectionKindFromSpec,
  getSqlDialectFromConnection,
  isFileBasedKind
} from '@/types/specs'

export type DirectSourceReadiness = {
  ready: boolean
  reason?: 'missing-database' | 'database-not-found'
}

type ScopedSourceReadiness = {
  ready: boolean
  reason?: 'missing-folder-scope'
}

interface UseConsoleQueryHelpersOptions {
  mode: Ref<ConsoleMode> | ComputedRef<ConsoleMode>
  connectionId: Ref<string> | ComputedRef<string>
  database: Ref<string | undefined> | ComputedRef<string | undefined>
  selectedConnections: Ref<ConnectionMapping[]> | ComputedRef<ConnectionMapping[]>
  useFederatedEngine: Ref<boolean> | ComputedRef<boolean>
  activeQueryTab: Ref<SqlQueryTab | null | undefined> | ComputedRef<SqlQueryTab | null | undefined>
  queryError: Ref<string | null> | ComputedRef<string | null>
  connection: Ref<Connection | null | undefined> | ComputedRef<Connection | null | undefined>
  getConnectionById: (connectionId: string) => Connection | null | undefined
  isDatabaseMapping: (mapping: { connectionId: string }) => boolean
}

function stripIdentifierQuotes(identifier: string): string {
  const trimmed = identifier.trim()
  if (trimmed.length >= 2) {
    const first = trimmed[0]
    const last = trimmed[trimmed.length - 1]
    if ((first === '"' && last === '"') || (first === '`' && last === '`')) {
      return trimmed.slice(1, -1)
    }
  }
  return trimmed
}

function parseRelationSegments(relation: string): string[] {
  return relation
    .split('.')
    .map((segment) => stripIdentifierQuotes(segment))
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function isSafeIdentifier(identifier: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)
}

function quoteFederatedIdentifier(identifier: string): string {
  if (isSafeIdentifier(identifier)) return identifier
  return `"${identifier.replace(/"/g, '""')}"`
}

function buildFederatedRelationName(parts: string[]): string {
  return parts.map((part) => quoteFederatedIdentifier(part)).join('.')
}

const starterQueryPattern = /^select\s+\*\s+from\s+(.+?)\s+limit\s+100\s*;?\s*$/i
const federatedNamingErrorPattern = /^federated mode requires alias-qualified tables/i

export function useConsoleQueryHelpers(options: UseConsoleQueryHelpersOptions) {
  const getDirectSourceReadiness = (mapping: {
    connectionId: string
    database?: string
  }): DirectSourceReadiness => {
    const selectedDatabase = mapping.database?.trim() || ''
    if (!selectedDatabase) {
      return { ready: false, reason: 'missing-database' }
    }

    const conn = options.getConnectionById(mapping.connectionId)
    const availableDatabases =
      conn?.databasesInfo
        ?.filter((db) => !db.isSystem)
        .map((db) => db.name)
        .filter((name): name is string => Boolean(name?.trim())) || []

    // If DB list is unavailable, avoid false negatives and treat current selection as usable.
    if (availableDatabases.length === 0) {
      return { ready: true }
    }

    const exists = availableDatabases.some((dbName) => dbName === selectedDatabase)
    if (!exists) {
      return { ready: false, reason: 'database-not-found' }
    }

    return { ready: true }
  }

  const getScopedSourceReadiness = (mapping: {
    connectionId: string
    database?: string
  }): ScopedSourceReadiness => {
    const conn = options.getConnectionById(mapping.connectionId)
    const kind = getConnectionKindFromSpec(conn?.spec)
    if (!isFileBasedKind(kind)) {
      return { ready: true }
    }

    const folderScope = mapping.database?.trim() || ''
    if (!folderScope) {
      return { ready: false, reason: 'missing-folder-scope' }
    }

    return { ready: true }
  }

  const hasUnscopedFileSources = computed(() => {
    if (options.mode.value !== 'file') return false
    return options.selectedConnections.value.some((mapping) => {
      const readiness = getScopedSourceReadiness(mapping)
      return readiness.reason === 'missing-folder-scope'
    })
  })

  const fileScopeWarning = computed(() => {
    if (!hasUnscopedFileSources.value) return ''
    return 'Folder scope is optional, but selecting one improves autocomplete for file sources.'
  })

  const originDatabaseMapping = computed(() => {
    const expectedDatabase = options.database.value?.trim() || ''
    return (
      options.selectedConnections.value.find(
        (mapping) =>
          mapping.connectionId === options.connectionId.value &&
          (mapping.database?.trim() || '') === expectedDatabase &&
          options.isDatabaseMapping(mapping)
      ) ||
      options.selectedConnections.value.find(
        (mapping) =>
          mapping.connectionId === options.connectionId.value && options.isDatabaseMapping(mapping)
      ) ||
      null
    )
  })

  const rewrittenFederatedStarterQuery = computed(() => {
    if (options.mode.value !== 'database') return null
    if (!options.useFederatedEngine.value) return null

    const tab = options.activeQueryTab.value
    const tableName = tab?.tableContext?.tableName?.trim()
    if (!tab || !tableName) return null

    const queryMatch = tab.query.match(starterQueryPattern)
    if (!queryMatch) return null
    const relationSegments = parseRelationSegments(queryMatch[1])
    if (relationSegments.length === 0) return null
    const relationTable = relationSegments[relationSegments.length - 1]?.toLowerCase()
    if (relationTable !== tableName.toLowerCase()) return null

    const mapping = originDatabaseMapping.value
    const alias = mapping?.alias?.trim() || ''
    if (!alias) return null

    const originDialect = getSqlDialectFromConnection(
      options.connection.value?.spec,
      options.connection.value?.type
    )

    if (originDialect === 'mysql') {
      const databaseName = (
        mapping?.database?.trim() ||
        options.database.value?.trim() ||
        ''
      ).trim()
      if (!databaseName) return null
      return `SELECT * FROM ${buildFederatedRelationName([alias, databaseName, tableName])} LIMIT 100;`
    }

    if (originDialect === 'pgsql') {
      const schemaName = tab.tableContext?.schema?.trim() || ''
      if (!schemaName) return null
      return `SELECT * FROM ${buildFederatedRelationName([alias, schemaName, tableName])} LIMIT 100;`
    }

    return null
  })

  const showFederatedRewriteAction = computed(() => Boolean(rewrittenFederatedStarterQuery.value))

  const errorActionLabel = computed(() => {
    if (!showFederatedRewriteAction.value) return null
    if (!options.queryError.value) return null
    if (!federatedNamingErrorPattern.test(options.queryError.value.trim())) return null
    return 'Rewrite starter SQL to federated naming'
  })

  return {
    getDirectSourceReadiness,
    fileScopeWarning,
    rewrittenFederatedStarterQuery,
    errorActionLabel
  }
}
