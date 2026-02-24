import { computed, type ComputedRef, type Ref } from 'vue'
import type { ConnectionMapping } from '@/api/federated'
import type { ConsoleMode } from '@/components/console/types'
import type { SqlQueryTab } from '@/stores/sqlConsole'
import type { Connection } from '@/types/connections'
import { getConnectionKindFromSpec, isFileBasedKind } from '@/types/specs'
import type { SqlLspConnectionContext } from '@/composables/useSqlLspProviders'
import type { SqlRunMode } from '@/composables/useConsoleSources'
import type { DirectSourceReadiness } from '@/composables/useConsoleQueryHelpers'

type RefLike<T> = Ref<T> | ComputedRef<T>

interface UseConsoleLspContextOptions {
  mode: RefLike<ConsoleMode>
  connectionId: RefLike<string>
  runMode: RefLike<SqlRunMode>
  selectedConnections: RefLike<ConnectionMapping[]>
  singleSourceMapping: RefLike<ConnectionMapping | null>
  activeQueryTab: RefLike<SqlQueryTab | null | undefined>
  getConnectionById: (connectionId: string) => Connection | null | undefined
  getDirectSourceReadiness: (mapping: {
    connectionId: string
    database?: string
  }) => DirectSourceReadiness
}

function collectDatabaseLspMappings(
  selectedConnections: ConnectionMapping[],
  getConnectionById: (connectionId: string) => Connection | null | undefined
): Array<{
  connectionId: string
  alias?: string
  database?: string
}> {
  const federatedConnections: Array<{
    connectionId: string
    alias?: string
    database?: string
  }> = []

  selectedConnections.forEach((mapping) => {
    const conn = getConnectionById(mapping.connectionId)
    const kind = getConnectionKindFromSpec(conn?.spec)
    if (isFileBasedKind(kind)) {
      return
    }
    federatedConnections.push({
      connectionId: mapping.connectionId,
      alias: mapping.alias,
      database: mapping.database
    })
  })

  return federatedConnections
}

export function useConsoleLspContext(options: UseConsoleLspContextOptions) {
  const sqlLspContext = computed<SqlLspConnectionContext | undefined>(() => {
    if (options.mode.value === 'file') {
      const filePath = options.activeQueryTab.value?.fileContext?.path?.trim() || ''
      const fileFormat = options.activeQueryTab.value?.fileContext?.format?.trim() || undefined
      const hasMultipleSelectedSources = options.selectedConnections.value.length > 1
      if (hasMultipleSelectedSources) {
        const federatedConnections = collectDatabaseLspMappings(
          options.selectedConnections.value,
          options.getConnectionById
        )
        return {
          provider: 'duckdb',
          filePath: filePath || undefined,
          fileFormat,
          federatedConnections: federatedConnections.length > 0 ? federatedConnections : undefined
        }
      }

      return {
        provider: 'duckdb',
        connectionId: options.connectionId.value,
        filePath: filePath || undefined,
        fileFormat
      }
    }

    const hasMultipleSelectedSources = options.selectedConnections.value.length > 1
    if (options.runMode.value !== 'single' || hasMultipleSelectedSources) {
      const federatedConnections = collectDatabaseLspMappings(
        options.selectedConnections.value,
        options.getConnectionById
      )
      if (federatedConnections.length === 0) {
        return undefined
      }

      return {
        provider: 'duckdb',
        federatedConnections
      }
    }

    if (options.mode.value !== 'database') {
      return undefined
    }

    const direct = options.singleSourceMapping.value
    if (!direct) {
      return undefined
    }

    const directConnection = options.getConnectionById(direct.connectionId)
    const directConnectionType = directConnection?.type?.trim().toLowerCase() || ''
    const useDuckDBLsp = directConnectionType.includes('duckdb')

    if (!useDuckDBLsp && !options.getDirectSourceReadiness(direct).ready) {
      return undefined
    }

    const database = direct.database?.trim() || ''
    if (!useDuckDBLsp && !database) {
      return undefined
    }

    return {
      provider: useDuckDBLsp ? 'duckdb' : 'sqls',
      connectionId: direct.connectionId,
      database: database || undefined
    }
  })

  return {
    sqlLspContext
  }
}
