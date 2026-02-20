import { computed, type ComputedRef, type Ref } from 'vue'
import type { ConnectionMapping } from '@/api/federated'

export interface UseSqlConsoleTabNameOptions {
  mode: Ref<'database' | 'file'> | ComputedRef<'database' | 'file'>
  runMode: Ref<'single' | 'federated'>
  selectedConnections: Ref<ConnectionMapping[]>
  effectiveSelectedConnections: ComputedRef<ConnectionMapping[]>
  singleSourceMapping: ComputedRef<ConnectionMapping | null>
  databaseSourceMappings: ComputedRef<ConnectionMapping[]>
  primaryConnectionId: Ref<string> | ComputedRef<string>
  federatedScopeConnectionId: Ref<string>
  isDatabaseMapping: (mapping: { connectionId: string }) => boolean
  getConnectionName: (connectionId: string) => string | null
  currentConnectionName: Ref<string | null> | ComputedRef<string | null>
}

export interface UseSqlConsoleTabNameReturn {
  paneTabName: ComputedRef<string>
}

export function useSqlConsoleTabName(
  options: UseSqlConsoleTabNameOptions
): UseSqlConsoleTabNameReturn {
  const {
    mode,
    runMode,
    selectedConnections,
    effectiveSelectedConnections,
    singleSourceMapping,
    databaseSourceMappings,
    primaryConnectionId,
    federatedScopeConnectionId,
    isDatabaseMapping,
    getConnectionName,
    currentConnectionName
  } = options

  const singleExecutionMapping = computed(() => {
    if (mode.value === 'file') {
      if (runMode.value === 'single' && singleSourceMapping.value) {
        return singleSourceMapping.value
      }

      const fileMappings = selectedConnections.value.filter(
        (selectedMapping) => !isDatabaseMapping(selectedMapping)
      )

      if (fileMappings.length === 0) {
        return null
      }

      const originConnectionId = primaryConnectionId.value?.trim()
      if (originConnectionId) {
        const originMapping = fileMappings.find(
          (selectedMapping) => selectedMapping.connectionId === originConnectionId
        )
        if (originMapping) return originMapping
      }

      if (fileMappings.length === 1) {
        return fileMappings[0]
      }

      return null
    }
    return singleSourceMapping.value || databaseSourceMappings.value[0] || null
  })

  const paneTabDefaultName = computed(() => {
    if (mode.value === 'file') {
      const mapping = singleExecutionMapping.value
      const mappedConnectionName = mapping ? getConnectionName(mapping.connectionId) : null
      const connName = mappedConnectionName || currentConnectionName.value || 'Files'
      const targetDatabase = mapping?.database?.trim()
      if (targetDatabase) {
        return `${connName} → ${targetDatabase}`
      }
      return mapping ? connName : `${connName} (DuckDB)`
    }

    const mapping = singleExecutionMapping.value
    const mappedConnectionName = mapping ? getConnectionName(mapping.connectionId) : null
    const connName = mappedConnectionName || currentConnectionName.value || 'SQL'
    const targetDatabase = mapping?.database?.trim()

    if (targetDatabase) {
      return `${connName} → ${targetDatabase}`
    }
    return `${connName} (Admin)`
  })

  const paneTabFederatedName = computed(() => {
    if (federatedScopeConnectionId.value) {
      const mapping = selectedConnections.value.find(
        (selectedMapping) => selectedMapping.connectionId === federatedScopeConnectionId.value
      )
      if (mapping) {
        const connName = getConnectionName(mapping.connectionId) || mapping.connectionId
        const db = mapping.database?.trim()
        const target = db ? `${connName} → ${db}` : connName
        return `Files • ${mapping.alias || 'files'} • ${target}`
      }
    }

    const sourceCount = effectiveSelectedConnections.value.length
    const sourcePart = `${sourceCount} source${sourceCount === 1 ? '' : 's'}`
    return `Multi-source • ${sourcePart}`
  })

  const paneTabName = computed(() =>
    runMode.value === 'federated' ? paneTabFederatedName.value : paneTabDefaultName.value
  )

  return {
    paneTabName
  }
}
