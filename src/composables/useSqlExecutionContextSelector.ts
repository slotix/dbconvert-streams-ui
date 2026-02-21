import { computed, type ComputedRef, type Ref } from 'vue'
import type { ConnectionMapping } from '@/api/federated'

export interface UseSqlExecutionContextSelectorOptions {
  mode: Ref<'database' | 'file'> | ComputedRef<'database' | 'file'>
  runMode: Ref<'single' | 'federated'>
  selectedConnections: Ref<ConnectionMapping[]>
  databaseSourceMappings: ComputedRef<ConnectionMapping[]>
  isDatabaseMapping: (mapping: { connectionId: string }) => boolean
  getDatabaseTypeDisplay: (connectionId: string) => string | null
  getConnectionName: (connectionId: string) => string | null
}

export interface UseSqlExecutionContextSelectorReturn {
  singleExecutionLabel: ComputedRef<string>
}

export function useSqlExecutionContextSelector(
  options: UseSqlExecutionContextSelectorOptions
): UseSqlExecutionContextSelectorReturn {
  const {
    mode,
    runMode,
    selectedConnections,
    databaseSourceMappings,
    isDatabaseMapping,
    getDatabaseTypeDisplay,
    getConnectionName
  } = options

  const singleExecutionLabel = computed(() => {
    if (runMode.value === 'federated') {
      return 'Executing: Multi-source'
    }

    if (mode.value === 'file') {
      const fileMapping =
        selectedConnections.value.find((selectedMapping) => !isDatabaseMapping(selectedMapping)) ||
        selectedConnections.value[0]
      const connectionName = fileMapping ? getConnectionName(fileMapping.connectionId) : null
      const label = connectionName || fileMapping?.alias || 'files'
      return `Executing: Files: ${label}`
    }

    const mapping = databaseSourceMappings.value[0]
    if (!mapping) return 'Executing: Single source'

    const connectionName = getConnectionName(mapping.connectionId)
    const label = connectionName || mapping.alias || 'db'
    const databaseType = getDatabaseTypeDisplay(mapping.connectionId)
    const typePart = databaseType ? ` (${databaseType})` : ''
    return `Executing: Database: ${label}${typePart}`
  })

  return {
    singleExecutionLabel
  }
}
