import { computed, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { useConsoleExecutionGuards } from '@/composables/useConsoleExecutionGuards'

describe('useConsoleExecutionGuards', () => {
  it('rewrites starter query when rewritten SQL exists', () => {
    const sqlQuery = ref('SELECT * FROM users LIMIT 100;')
    const guards = useConsoleExecutionGuards({
      sqlQuery,
      selectedConnections: computed(() => [{ connectionId: 'c1', alias: 'a1', database: 'db1' }]),
      rewrittenFederatedStarterQuery: computed(() => 'SELECT * FROM a1.db1.users LIMIT 100;'),
      getDirectSourceReadiness: () => ({ ready: true })
    })

    guards.rewriteStarterQueryToFederated()

    expect(sqlQuery.value).toBe('SELECT * FROM a1.db1.users LIMIT 100;')
  })

  it('returns validation messages based on direct-source readiness reason', () => {
    const sqlQuery = ref('SELECT 1;')

    const missingDatabase = useConsoleExecutionGuards({
      sqlQuery,
      selectedConnections: computed(() => [{ connectionId: 'c1', alias: 'a1' }]),
      rewrittenFederatedStarterQuery: computed(() => null),
      getDirectSourceReadiness: () => ({ ready: false, reason: 'missing-database' })
    })

    expect(missingDatabase.validateDatabaseTarget({ connectionId: 'c1' })).toBe(
      'Select database in Query Session before running direct database queries.'
    )

    const databaseMissingInConnection = useConsoleExecutionGuards({
      sqlQuery,
      selectedConnections: computed(() => [{ connectionId: 'c1', alias: 'a1' }]),
      rewrittenFederatedStarterQuery: computed(() => null),
      getDirectSourceReadiness: () => ({ ready: false, reason: 'database-not-found' })
    })

    expect(databaseMissingInConnection.validateDatabaseTarget({ connectionId: 'c1' })).toBe(
      'Selected database is no longer available for this connection. Choose another database in Query Session.'
    )
  })

  it('passes validation when direct source is ready', () => {
    const guards = useConsoleExecutionGuards({
      sqlQuery: ref('SELECT 1;'),
      selectedConnections: computed(() => [{ connectionId: 'c1', alias: 'a1', database: 'db1' }]),
      rewrittenFederatedStarterQuery: computed(() => null),
      getDirectSourceReadiness: () => ({ ready: true })
    })

    expect(guards.validateDatabaseTarget({ connectionId: 'c1' })).toBeNull()
  })
})
