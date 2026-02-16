import { describe, expect, it } from 'vitest'
import { useMonacoSqlProviders } from '@/composables/useMonacoSqlProviders'

type Provider = {
  provideCompletionItems: (
    model: any,
    position: any
  ) => { suggestions: Array<{ label: string; sortText?: string }> }
}

function createMockMonaco() {
  const providers: Provider[] = []

  const monaco = {
    languages: {
      CompletionItemKind: {
        Keyword: 0,
        Function: 1,
        Class: 2,
        Field: 3,
        Snippet: 4
      },
      CompletionItemInsertTextRule: {
        InsertAsSnippet: 1
      },
      registerCompletionItemProvider: (_language: string, provider: Provider) => {
        providers.push(provider)
        return {
          dispose: () => {}
        }
      },
      registerHoverProvider: () => ({ dispose: () => {} })
    }
  }

  return { monaco: monaco as any, providers }
}

function createModel(sql: string) {
  return {
    getValueInRange: () => sql,
    getWordUntilPosition: () => ({
      word: '',
      startColumn: sql.length + 1,
      endColumn: sql.length + 1
    })
  }
}

describe('useMonacoSqlProviders dialect-specific keyword suggestions', () => {
  const whereContextSql = 'SELECT * FROM users WHERE actor_id > 1 '

  it('suggests REGEXP for mysql in WHERE context', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'mysql')

    const provider = providers[0]
    const result = provider.provideCompletionItems(createModel(whereContextSql), {
      lineNumber: 1,
      column: whereContextSql.length + 1
    })

    const labels = result.suggestions.map((s) => s.label)
    expect(labels).toContain('REGEXP')
    expect(labels).not.toContain('ILIKE')
  })

  it('suggests ILIKE for pgsql in WHERE context', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'pgsql')

    const provider = providers[0]
    const result = provider.provideCompletionItems(createModel(whereContextSql), {
      lineNumber: 1,
      column: whereContextSql.length + 1
    })

    const labels = result.suggestions.map((s) => s.label)
    expect(labels).toContain('ILIKE')
    expect(labels).not.toContain('REGEXP')
  })

  it('does not force mysql/pgsql specific keywords for generic sql dialect', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'sql')

    const provider = providers[0]
    const result = provider.provideCompletionItems(createModel(whereContextSql), {
      lineNumber: 1,
      column: whereContextSql.length + 1
    })

    const labels = result.suggestions.map((s) => s.label)
    expect(labels).not.toContain('REGEXP')
    expect(labels).not.toContain('ILIKE')
  })

  it('prioritizes WHERE continuation keywords (AND/OR/ORDER BY/LIMIT)', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'pgsql')

    const provider = providers[0]
    const result = provider.provideCompletionItems(createModel(whereContextSql), {
      lineNumber: 1,
      column: whereContextSql.length + 1
    })

    const labels = result.suggestions.map((s) => s.label)

    expect(labels).toContain('AND')
    expect(labels).toContain('OR')
    expect(labels).toContain('ORDER BY')
    expect(labels).toContain('LIMIT')

    const andIndex = labels.indexOf('AND')
    const orderByIndex = labels.indexOf('ORDER BY')
    const limitIndex = labels.indexOf('LIMIT')
    const countFnIndex = labels.indexOf('COUNT()')

    expect(andIndex).toBeGreaterThanOrEqual(0)
    expect(orderByIndex).toBeGreaterThanOrEqual(0)
    expect(limitIndex).toBeGreaterThanOrEqual(0)
    expect(countFnIndex).toBeGreaterThanOrEqual(0)

    expect(andIndex).toBeLessThan(countFnIndex)
    expect(orderByIndex).toBeLessThan(countFnIndex)
    expect(limitIndex).toBeLessThan(countFnIndex)
  })

  it('prioritizes columns after ORDER BY', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'pgsql', {
      dialect: 'pgsql',
      tables: [{ name: 'actor' }],
      columns: {
        actor: [
          { name: 'actor_id', type: 'int4', nullable: false },
          { name: 'first_name', type: 'text', nullable: false }
        ]
      }
    })

    const sql = 'SELECT * FROM actor ORDER BY '
    const provider = providers[0]
    const result = provider.provideCompletionItems(createModel(sql), {
      lineNumber: 1,
      column: sql.length + 1
    })

    const labels = result.suggestions.map((s) => s.label)

    expect(labels).toContain('actor.actor_id')
    expect(labels).toContain('actor.first_name')
    expect(labels).toContain('COUNT()')

    const actorIdSuggestion = result.suggestions.find((s) => s.label === 'actor.actor_id')
    const firstNameSuggestion = result.suggestions.find((s) => s.label === 'actor.first_name')
    const countFnSuggestion = result.suggestions.find((s) => s.label === 'COUNT()')

    expect(actorIdSuggestion?.sortText).toBeDefined()
    expect(firstNameSuggestion?.sortText).toBeDefined()
    expect(countFnSuggestion?.sortText).toBeDefined()

    expect(
      (actorIdSuggestion?.sortText || '').localeCompare(countFnSuggestion?.sortText || '')
    ).toBe(-1)
    expect(
      (firstNameSuggestion?.sortText || '').localeCompare(countFnSuggestion?.sortText || '')
    ).toBe(-1)
  })
})
