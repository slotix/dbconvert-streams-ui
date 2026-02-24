import type { ComputedRef, Ref } from 'vue'
import type { ConnectionMapping } from '@/api/federated'
import type { DirectSourceReadiness } from '@/composables/useConsoleQueryHelpers'

type MaybeRef<T> = Ref<T> | ComputedRef<T>

interface ValidateDatabaseTargetInput {
  connectionId: string
  database?: string
}

interface UseConsoleExecutionGuardsOptions {
  sqlQuery: Ref<string>
  selectedConnections: MaybeRef<ConnectionMapping[]>
  rewrittenFederatedStarterQuery: MaybeRef<string | null>
  getDirectSourceReadiness: (mapping: {
    connectionId: string
    database?: string
  }) => DirectSourceReadiness
}

export function useConsoleExecutionGuards(options: UseConsoleExecutionGuardsOptions) {
  const rewriteStarterQueryToFederated = () => {
    const rewritten = options.rewrittenFederatedStarterQuery.value
    if (!rewritten) return
    options.sqlQuery.value = rewritten
  }

  const validateDatabaseTarget = (target: ValidateDatabaseTargetInput): string | null => {
    const selected = options.selectedConnections.value.find(
      (mapping) => mapping.connectionId === target.connectionId
    )

    const readiness = options.getDirectSourceReadiness({
      connectionId: target.connectionId,
      database: target.database || selected?.database
    })

    if (readiness.reason === 'missing-database') {
      return 'Select database in Query Session before running direct database queries.'
    }

    if (readiness.reason === 'database-not-found') {
      return 'Selected database is no longer available for this connection. Choose another database in Query Session.'
    }

    return null
  }

  return {
    rewriteStarterQueryToFederated,
    validateDatabaseTarget
  }
}
