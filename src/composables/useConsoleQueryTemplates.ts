import { computed, type ComputedRef, type Ref } from 'vue'
import type { ConnectionMapping } from '@/api/federated'
import type { ConsoleMode, FileConnectionType } from '@/components/console/types'
import type { SqlQueryTab } from '@/stores/sqlConsole'
import type { Connection } from '@/types/connections'
import { getConnectionKindFromSpec } from '@/types/specs'
import {
  getFederatedTemplates,
  getFileTemplates,
  getDatabaseTemplates,
  computeFileTemplatePrefix
} from '@/components/console/queryTemplates'

type RefLike<T> = Ref<T> | ComputedRef<T>

interface UseConsoleQueryTemplatesOptions {
  mode: RefLike<ConsoleMode>
  database: RefLike<string | undefined>
  basePath: RefLike<string | undefined>
  connectionType: RefLike<FileConnectionType | undefined>
  currentDialect: RefLike<string>
  useFederatedEngine: RefLike<boolean>
  selectedConnections: RefLike<ConnectionMapping[]>
  activeQueryTab: RefLike<SqlQueryTab | null | undefined>
  getConnectionById: (connectionId: string) => Connection | null | undefined
}

export function useConsoleQueryTemplates(options: UseConsoleQueryTemplatesOptions) {
  const queryTemplates = computed(() => {
    if (options.useFederatedEngine.value) {
      const sources = options.selectedConnections.value
        .map((mapping) => {
          const conn = options.getConnectionById(mapping.connectionId)
          const kind = getConnectionKindFromSpec(conn?.spec)
          if (!kind || !mapping.alias) return null
          return {
            alias: mapping.alias,
            kind
          }
        })
        .filter(
          (
            source
          ): source is {
            alias: string
            kind: NonNullable<ReturnType<typeof getConnectionKindFromSpec>>
          } => Boolean(source)
        )

      return getFederatedTemplates(sources)
    }

    if (options.mode.value === 'file') {
      const prefix = computeFileTemplatePrefix({
        fileContext: options.activeQueryTab.value?.fileContext,
        basePath: options.basePath.value,
        connectionType: options.connectionType.value
      })
      return getFileTemplates({ prefix })
    }

    return getDatabaseTemplates({
      dialect: options.currentDialect.value,
      database: options.database.value,
      tableContext: options.activeQueryTab.value?.tableContext
    })
  })

  return {
    queryTemplates
  }
}
