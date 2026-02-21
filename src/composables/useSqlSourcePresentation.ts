import { computed, type ComputedRef, type Ref } from 'vue'
import type { ConnectionMapping } from '@/api/federated'
import type { Connection } from '@/types/connections'
import { getConnectionKindFromSpec, getConnectionTypeLabel, isDatabaseKind } from '@/types/specs'

export interface UseSqlSourcePresentationOptions {
  selectedConnections: Ref<ConnectionMapping[]> | ComputedRef<ConnectionMapping[]>
  getConnectionById: (connectionId: string) => Connection | null
}

export interface UseSqlSourcePresentationReturn {
  sourcePills: ComputedRef<Array<{ connectionId: string; key: string; label: string }>>
  isDatabaseMapping: (mapping: { connectionId: string }) => boolean
  getDatabaseTypeDisplay: (connectionId: string) => string | null
}

export function useSqlSourcePresentation(
  options: UseSqlSourcePresentationOptions
): UseSqlSourcePresentationReturn {
  const { selectedConnections, getConnectionById } = options

  const sourcePills = computed(() => {
    const singleSelected = selectedConnections.value.length === 1
    return selectedConnections.value.map((mapping) => {
      const connection = getConnectionById(mapping.connectionId)
      const connectionName = connection?.name?.trim() || ''
      const fallbackAlias = mapping.alias || 'db'

      return {
        connectionId: mapping.connectionId,
        key: `${mapping.connectionId}:${mapping.database?.trim() || ''}:${mapping.alias?.trim() || ''}`,
        label: singleSelected ? connectionName || fallbackAlias : fallbackAlias
      }
    })
  })

  function isDatabaseMapping(mapping: { connectionId: string }): boolean {
    const connection = getConnectionById(mapping.connectionId)
    const kind = getConnectionKindFromSpec(connection?.spec)
    return isDatabaseKind(kind)
  }

  function getDatabaseTypeDisplay(connectionId: string): string | null {
    const connection = getConnectionById(connectionId)
    const typeLabel = getConnectionTypeLabel(connection?.spec, connection?.type)
    if (!typeLabel) return connection?.type || null

    const lowered = typeLabel.toLowerCase()
    if (lowered.includes('postgres')) return 'PostgreSQL'
    if (lowered.includes('mysql') || lowered.includes('mariadb')) return 'MySQL'
    if (lowered === 'snowflake') return 'Snowflake'

    return connection?.type || typeLabel
  }

  return {
    sourcePills,
    isDatabaseMapping,
    getDatabaseTypeDisplay
  }
}
