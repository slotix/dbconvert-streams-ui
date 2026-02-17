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

  it('suggests DuckDB file table functions after FROM in sql dialect', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'sql')

    const sql = 'SELECT * FROM '
    const provider = providers[0]
    const result = provider.provideCompletionItems(createModel(sql), {
      lineNumber: 1,
      column: sql.length + 1
    })

    const labels = result.suggestions.map((s) => s.label)
    expect(labels).toContain('read_parquet(...)')
    expect(labels).toContain('read_csv_auto(...)')
    expect(labels).toContain('read_json_auto(...)')
    expect(labels).toContain('glob(...)')

    const readParquetIndex = labels.indexOf('read_parquet(...)')
    const countFnIndex = labels.indexOf('COUNT()')
    expect(readParquetIndex).toBeGreaterThanOrEqual(0)
    expect(countFnIndex).toBeGreaterThanOrEqual(0)
    expect(readParquetIndex).toBeLessThan(countFnIndex)
  })

  it('includes DuckDB-specific metadata functions in sql dialect', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'sql')

    const provider = providers[0]
    const result = provider.provideCompletionItems(createModel('SELECT '), {
      lineNumber: 1,
      column: 'SELECT '.length + 1
    })

    const labels = result.suggestions.map((s) => s.label)
    expect(labels).toContain('PARQUET_METADATA()')
    expect(labels).toContain('PARQUET_SCHEMA()')
    expect(labels).toContain('SNIFF_CSV()')
  })

  it('suggests DuckDB read_csv_auto named parameters inside function args', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'sql')

    const sql = "SELECT * FROM read_csv_auto('/tmp/data.csv', "
    const provider = providers[0]
    const result = provider.provideCompletionItems(createModel(sql), {
      lineNumber: 1,
      column: sql.length + 1
    })

    const labels = result.suggestions.map((s) => s.label)
    expect(labels).toContain('union_by_name = ...')
    expect(labels).toContain('filename = ...')
    expect(labels).toContain('header = ...')
    expect(labels).toContain('auto_detect = ...')
    expect(labels).toContain('sample_size = ...')
  })

  it('suggests DuckDB read_parquet named parameters inside function args', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'sql')

    const sql = "SELECT * FROM read_parquet('/tmp/data.parquet', "
    const provider = providers[0]
    const result = provider.provideCompletionItems(createModel(sql), {
      lineNumber: 1,
      column: sql.length + 1
    })

    const labels = result.suggestions.map((s) => s.label)
    expect(labels).toContain('filename = ...')
    expect(labels).toContain('union_by_name = ...')
    expect(labels).toContain('hive_partitioning = ...')
  })

  it('suggests DuckDB read_json_auto named parameters inside function args', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'sql')

    const sql = "SELECT * FROM read_json_auto('/tmp/data.json', "
    const provider = providers[0]
    const result = provider.provideCompletionItems(createModel(sql), {
      lineNumber: 1,
      column: sql.length + 1
    })

    const labels = result.suggestions.map((s) => s.label)
    expect(labels).toContain('filename = ...')
    expect(labels).toContain('union_by_name = ...')
    expect(labels).toContain('maximum_object_size = ...')
    expect(labels).toContain('compression = ...')
  })

  it('suggests DuckDB table functions after DESCRIBE', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'sql')

    const sql = 'DESCRIBE '
    const provider = providers[0]
    const result = provider.provideCompletionItems(createModel(sql), {
      lineNumber: 1,
      column: sql.length + 1
    })

    const labels = result.suggestions.map((s) => s.label)
    expect(labels).toContain('SELECT')
    expect(labels).toContain('read_parquet(...)')
    expect(labels).toContain('read_csv_auto(...)')
    expect(labels).toContain('read_json_auto(...)')

    const selectIndex = labels.indexOf('SELECT')
    const readParquetIndex = labels.indexOf('read_parquet(...)')
    expect(selectIndex).toBeGreaterThanOrEqual(0)
    expect(readParquetIndex).toBeGreaterThanOrEqual(0)
    expect(selectIndex).toBeLessThan(readParquetIndex)
  })

  it('supports DESC alias in mysql and prioritizes table targets', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'mysql', {
      dialect: 'mysql',
      tables: [{ name: 'actor' }],
      columns: {
        actor: [{ name: 'actor_id', type: 'int', nullable: false }]
      }
    })

    const sql = 'DESC '
    const provider = providers[0]
    const result = provider.provideCompletionItems(createModel(sql), {
      lineNumber: 1,
      column: sql.length + 1
    })

    const labels = result.suggestions.map((s) => s.label)
    expect(labels).toContain('actor')
    expect(labels).toContain('COUNT()')

    const actorSuggestion = result.suggestions.find((s) => s.label === 'actor')
    const countFnSuggestion = result.suggestions.find((s) => s.label === 'COUNT()')

    expect(actorSuggestion?.sortText).toBeDefined()
    expect(countFnSuggestion?.sortText).toBeDefined()
    expect((actorSuggestion?.sortText || '').localeCompare(countFnSuggestion?.sortText || '')).toBe(
      -1
    )
  })

  it('suggests DESCRIBE and DESC for mysql when typing des prefix', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'mysql')

    const sql = 'des'
    const provider = providers[0]
    const result = provider.provideCompletionItems(createModel(sql), {
      lineNumber: 1,
      column: sql.length + 1
    })

    const labels = result.suggestions.map((s) => s.label)
    expect(labels).toContain('DESCRIBE')
    expect(labels).toContain('DESC')
  })

  it('suggests table columns after DESCRIBE table_name in mysql', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'mysql', {
      dialect: 'mysql',
      tables: [{ name: 'actor' }],
      columns: {
        actor: [
          { name: 'actor_id', type: 'int', nullable: false },
          { name: 'first_name', type: 'varchar', nullable: false }
        ]
      }
    })

    const sql = 'DESCRIBE actor '
    const provider = providers[0]
    const result = provider.provideCompletionItems(createModel(sql), {
      lineNumber: 1,
      column: sql.length + 1
    })

    const labels = result.suggestions.map((s) => s.label)
    expect(labels).toContain('actor_id')
    expect(labels).toContain('first_name')

    const actorIdIndex = labels.indexOf('actor_id')
    const countFnIndex = labels.indexOf('COUNT()')
    expect(actorIdIndex).toBeGreaterThanOrEqual(0)
    expect(countFnIndex).toBeGreaterThanOrEqual(0)
    expect(actorIdIndex).toBeLessThan(countFnIndex)
  })

  it('suggests named args and close paren after comma in read_* contexts', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'sql')

    const sql = "SELECT * FROM read_csv_auto('/tmp/data.csv',"
    const provider = providers[0]
    const result = provider.provideCompletionItems(createModel(sql), {
      lineNumber: 1,
      column: sql.length + 1
    })

    const labels = result.suggestions.map((s) => s.label)
    expect(labels).toContain('union_by_name = ...')
    expect(labels).toContain('compression = ...')
    expect(labels).toContain(')')
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

  it('suggests INTO after INSERT and prioritizes it over functions', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'pgsql')

    const sql = 'INSERT '
    const provider = providers[0]
    const result = provider.provideCompletionItems(createModel(sql), {
      lineNumber: 1,
      column: sql.length + 1
    })

    const labels = result.suggestions.map((s) => s.label)
    expect(labels).toContain('INTO')

    const intoIndex = labels.indexOf('INTO')
    const countFnIndex = labels.indexOf('COUNT()')

    expect(intoIndex).toBeGreaterThanOrEqual(0)
    expect(countFnIndex).toBeGreaterThanOrEqual(0)
    expect(intoIndex).toBeLessThan(countFnIndex)
  })

  it('suggests VALUES after INSERT INTO table', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'pgsql')

    const sql = 'INSERT INTO actor '
    const provider = providers[0]
    const result = provider.provideCompletionItems(createModel(sql), {
      lineNumber: 1,
      column: sql.length + 1
    })

    const labels = result.suggestions.map((s) => s.label)
    expect(labels).toContain('VALUES')
    expect(labels).toContain('(')
  })

  it('suggests SET after UPDATE table', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'pgsql')

    const sql = 'UPDATE actor '
    const provider = providers[0]
    const result = provider.provideCompletionItems(createModel(sql), {
      lineNumber: 1,
      column: sql.length + 1
    })

    const labels = result.suggestions.map((s) => s.label)
    expect(labels).toContain('SET')
  })

  it('suggests FROM after DELETE', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'pgsql')

    const sql = 'DELETE '
    const provider = providers[0]
    const result = provider.provideCompletionItems(createModel(sql), {
      lineNumber: 1,
      column: sql.length + 1
    })

    const labels = result.suggestions.map((s) => s.label)
    expect(labels).toContain('FROM')
  })

  it('suggests drop object types after DROP', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'pgsql')

    const sql = 'DROP '
    const provider = providers[0]
    const result = provider.provideCompletionItems(createModel(sql), {
      lineNumber: 1,
      column: sql.length + 1
    })

    const labels = result.suggestions.map((s) => s.label)
    expect(labels).toContain('TABLE')
    expect(labels).toContain('VIEW')
    expect(labels).toContain('INDEX')
  })

  it('suggests common DDL continuations for CREATE/ALTER/TRUNCATE', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'pgsql')

    const provider = providers[0]

    const createResult = provider.provideCompletionItems(createModel('CREATE '), {
      lineNumber: 1,
      column: 'CREATE '.length + 1
    })
    const createLabels = createResult.suggestions.map((s) => s.label)
    expect(createLabels).toContain('TABLE')

    const alterResult = provider.provideCompletionItems(createModel('ALTER '), {
      lineNumber: 1,
      column: 'ALTER '.length + 1
    })
    const alterLabels = alterResult.suggestions.map((s) => s.label)
    expect(alterLabels).toContain('TABLE')

    const truncateResult = provider.provideCompletionItems(createModel('TRUNCATE '), {
      lineNumber: 1,
      column: 'TRUNCATE '.length + 1
    })
    const truncateLabels = truncateResult.suggestions.map((s) => s.label)
    expect(truncateLabels).toContain('TABLE')
  })

  it('suggests CTE and UNION flow keywords', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'pgsql')

    const provider = providers[0]

    const withResult = provider.provideCompletionItems(createModel('WITH '), {
      lineNumber: 1,
      column: 'WITH '.length + 1
    })
    const withLabels = withResult.suggestions.map((s) => s.label)
    expect(withLabels).toContain('RECURSIVE')

    const unionResult = provider.provideCompletionItems(createModel('SELECT * FROM actor '), {
      lineNumber: 1,
      column: 'SELECT * FROM actor '.length + 1
    })
    const unionLabels = unionResult.suggestions.map((s) => s.label)
    expect(unionLabels).toContain('UNION')
    expect(unionLabels).toContain('UNION ALL')
  })

  it('suggests IN/EXISTS in predicate contexts', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'pgsql')

    const provider = providers[0]
    const sql = 'SELECT * FROM actor WHERE actor_id > 1 '
    const result = provider.provideCompletionItems(createModel(sql), {
      lineNumber: 1,
      column: sql.length + 1
    })

    const labels = result.suggestions.map((s) => s.label)
    expect(labels).toContain('IN')
    expect(labels).toContain('EXISTS')
    expect(labels).toContain('NOT EXISTS')
  })

  it('suggests PostgreSQL ON CONFLICT flow after INSERT VALUES', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'pgsql')

    const provider = providers[0]
    const sql = 'INSERT INTO actor (actor_id) VALUES (1) '
    const result = provider.provideCompletionItems(createModel(sql), {
      lineNumber: 1,
      column: sql.length + 1
    })

    const labels = result.suggestions.map((s) => s.label)
    expect(labels).toContain('ON CONFLICT')
  })

  it('suggests MySQL ON DUPLICATE KEY flow after INSERT VALUES', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'mysql')

    const provider = providers[0]
    const sql = 'INSERT INTO actor (actor_id) VALUES (1) '
    const result = provider.provideCompletionItems(createModel(sql), {
      lineNumber: 1,
      column: sql.length + 1
    })

    const labels = result.suggestions.map((s) => s.label)
    expect(labels).toContain('ON DUPLICATE KEY')
  })

  it('suggests MERGE flow keywords', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'pgsql')

    const provider = providers[0]

    const mergeResult = provider.provideCompletionItems(createModel('MERGE '), {
      lineNumber: 1,
      column: 'MERGE '.length + 1
    })
    const mergeLabels = mergeResult.suggestions.map((s) => s.label)
    expect(mergeLabels).toContain('INTO')

    const mergeIntoResult = provider.provideCompletionItems(
      createModel('MERGE INTO target_table '),
      {
        lineNumber: 1,
        column: 'MERGE INTO target_table '.length + 1
      }
    )
    const mergeIntoLabels = mergeIntoResult.suggestions.map((s) => s.label)
    expect(mergeIntoLabels).toContain('USING')

    const mergeUsingResult = provider.provideCompletionItems(
      createModel('MERGE INTO target_table USING source_table '),
      {
        lineNumber: 1,
        column: 'MERGE INTO target_table USING source_table '.length + 1
      }
    )
    const mergeUsingLabels = mergeUsingResult.suggestions.map((s) => s.label)
    expect(mergeUsingLabels).toContain('ON')
  })

  it('suggests OVER window helpers', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'pgsql')

    const provider = providers[0]

    const overResult = provider.provideCompletionItems(createModel('COUNT(*) OVER '), {
      lineNumber: 1,
      column: 'COUNT(*) OVER '.length + 1
    })
    const overLabels = overResult.suggestions.map((s) => s.label)
    expect(overLabels).toContain('(')

    const overOpenResult = provider.provideCompletionItems(createModel('COUNT(*) OVER ('), {
      lineNumber: 1,
      column: 'COUNT(*) OVER ('.length + 1
    })
    const overOpenLabels = overOpenResult.suggestions.map((s) => s.label)
    expect(overOpenLabels).toContain('PARTITION BY')
    expect(overOpenLabels).toContain('ORDER BY')
  })

  it('suggests CASE expression progression', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'pgsql')

    const provider = providers[0]

    const caseResult = provider.provideCompletionItems(createModel('CASE '), {
      lineNumber: 1,
      column: 'CASE '.length + 1
    })
    const caseLabels = caseResult.suggestions.map((s) => s.label)
    expect(caseLabels).toContain('WHEN')

    const thenResult = provider.provideCompletionItems(createModel('CASE WHEN a > 0 THEN 1 '), {
      lineNumber: 1,
      column: 'CASE WHEN a > 0 THEN 1 '.length + 1
    })
    const thenLabels = thenResult.suggestions.map((s) => s.label)
    expect(thenLabels).toContain('ELSE')
    expect(thenLabels).toContain('END')
  })

  it('suggests MERGE branch actions and INSERT branch progression', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'pgsql')

    const provider = providers[0]

    const matchedThenResult = provider.provideCompletionItems(
      createModel('MERGE INTO t USING s ON t.id = s.id WHEN MATCHED THEN '),
      {
        lineNumber: 1,
        column: 'MERGE INTO t USING s ON t.id = s.id WHEN MATCHED THEN '.length + 1
      }
    )
    const matchedThenLabels = matchedThenResult.suggestions.map((s) => s.label)
    expect(matchedThenLabels).toContain('UPDATE')
    expect(matchedThenLabels).toContain('DELETE')

    const mergeUpdateResult = provider.provideCompletionItems(
      createModel('MERGE INTO t USING s ON t.id = s.id WHEN MATCHED THEN UPDATE '),
      {
        lineNumber: 1,
        column: 'MERGE INTO t USING s ON t.id = s.id WHEN MATCHED THEN UPDATE '.length + 1
      }
    )
    const mergeUpdateLabels = mergeUpdateResult.suggestions.map((s) => s.label)
    expect(mergeUpdateLabels).toContain('SET')

    const notMatchedThenResult = provider.provideCompletionItems(
      createModel('MERGE INTO t USING s ON t.id = s.id WHEN NOT MATCHED THEN '),
      {
        lineNumber: 1,
        column: 'MERGE INTO t USING s ON t.id = s.id WHEN NOT MATCHED THEN '.length + 1
      }
    )
    const notMatchedThenLabels = notMatchedThenResult.suggestions.map((s) => s.label)
    expect(notMatchedThenLabels).toContain('INSERT')

    const mergeInsertColumnsResult = provider.provideCompletionItems(
      createModel('MERGE INTO t USING s ON t.id = s.id WHEN NOT MATCHED THEN INSERT (id) '),
      {
        lineNumber: 1,
        column: 'MERGE INTO t USING s ON t.id = s.id WHEN NOT MATCHED THEN INSERT (id) '.length + 1
      }
    )
    const mergeInsertColumnsLabels = mergeInsertColumnsResult.suggestions.map((s) => s.label)
    expect(mergeInsertColumnsLabels).toContain('VALUES')
  })

  it('suggests window frame progression after OVER ORDER BY', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'pgsql')

    const provider = providers[0]

    const frameTypeResult = provider.provideCompletionItems(
      createModel('COUNT(*) OVER (ORDER BY actor_id '),
      {
        lineNumber: 1,
        column: 'COUNT(*) OVER (ORDER BY actor_id '.length + 1
      }
    )
    const frameTypeLabels = frameTypeResult.suggestions.map((s) => s.label)
    expect(frameTypeLabels).toContain('ROWS')
    expect(frameTypeLabels).toContain('RANGE')

    const rowsHeadResult = provider.provideCompletionItems(
      createModel('COUNT(*) OVER (ORDER BY actor_id ROWS '),
      {
        lineNumber: 1,
        column: 'COUNT(*) OVER (ORDER BY actor_id ROWS '.length + 1
      }
    )
    const rowsHeadLabels = rowsHeadResult.suggestions.map((s) => s.label)
    expect(rowsHeadLabels).toContain('BETWEEN')
    expect(rowsHeadLabels).toContain('CURRENT ROW')

    const frameAndResult = provider.provideCompletionItems(
      createModel('COUNT(*) OVER (ORDER BY actor_id ROWS BETWEEN UNBOUNDED PRECEDING AND '),
      {
        lineNumber: 1,
        column: 'COUNT(*) OVER (ORDER BY actor_id ROWS BETWEEN UNBOUNDED PRECEDING AND '.length + 1
      }
    )
    const frameAndLabels = frameAndResult.suggestions.map((s) => s.label)
    expect(frameAndLabels).toContain('CURRENT ROW')
    expect(frameAndLabels).toContain('UNBOUNDED FOLLOWING')
  })

  it('suggests JOIN type keywords after FROM and ON clause', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'pgsql')

    const provider = providers[0]

    const fromResult = provider.provideCompletionItems(createModel('SELECT * FROM actor '), {
      lineNumber: 1,
      column: 'SELECT * FROM actor '.length + 1
    })
    const fromLabels = fromResult.suggestions.map((s) => s.label)
    expect(fromLabels).toContain('INNER JOIN')
    expect(fromLabels).toContain('LEFT JOIN')
    expect(fromLabels).toContain('RIGHT JOIN')
    expect(fromLabels).toContain('FULL JOIN')
    expect(fromLabels).toContain('CROSS JOIN')

    const onResult = provider.provideCompletionItems(
      createModel('SELECT * FROM actor a JOIN film_actor fa ON a.actor_id = fa.actor_id '),
      {
        lineNumber: 1,
        column: 'SELECT * FROM actor a JOIN film_actor fa ON a.actor_id = fa.actor_id '.length + 1
      }
    )
    const onLabels = onResult.suggestions.map((s) => s.label)
    expect(onLabels).toContain('LEFT JOIN')
    expect(onLabels).toContain('WHERE')
    expect(onLabels).toContain('GROUP BY')
  })

  it('suggests GROUP BY extensions and mysql WITH ROLLUP', () => {
    const { monaco: pgMonaco, providers: pgProviders } = createMockMonaco()
    useMonacoSqlProviders(pgMonaco, 'sql', 'pgsql')

    const pgProvider = pgProviders[0]
    const groupHeadResult = pgProvider.provideCompletionItems(
      createModel('SELECT actor_id FROM actor GROUP BY '),
      {
        lineNumber: 1,
        column: 'SELECT actor_id FROM actor GROUP BY '.length + 1
      }
    )
    const groupHeadLabels = groupHeadResult.suggestions.map((s) => s.label)
    expect(groupHeadLabels).toContain('ROLLUP(')
    expect(groupHeadLabels).toContain('CUBE(')
    expect(groupHeadLabels).toContain('GROUPING SETS (')

    const { monaco: myMonaco, providers: myProviders } = createMockMonaco()
    useMonacoSqlProviders(myMonaco, 'sql', 'mysql')

    const myProvider = myProviders[0]
    const myGroupTailResult = myProvider.provideCompletionItems(
      createModel('SELECT actor_id FROM actor GROUP BY actor_id '),
      {
        lineNumber: 1,
        column: 'SELECT actor_id FROM actor GROUP BY actor_id '.length + 1
      }
    )
    const myGroupTailLabels = myGroupTailResult.suggestions.map((s) => s.label)
    expect(myGroupTailLabels).toContain('WITH ROLLUP')
  })

  it('suggests HAVING continuation and predicate helpers', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'pgsql')

    const provider = providers[0]

    const havingHeadResult = provider.provideCompletionItems(
      createModel('SELECT actor_id, COUNT(*) FROM actor GROUP BY actor_id HAVING '),
      {
        lineNumber: 1,
        column: 'SELECT actor_id, COUNT(*) FROM actor GROUP BY actor_id HAVING '.length + 1
      }
    )
    const havingHeadLabels = havingHeadResult.suggestions.map((s) => s.label)
    expect(havingHeadLabels).toContain('AND')
    expect(havingHeadLabels).toContain('OR')
    expect(havingHeadLabels).toContain('ORDER BY')
    expect(havingHeadLabels).toContain('LIMIT')
    expect(havingHeadLabels).toContain('IN')
    expect(havingHeadLabels).toContain('EXISTS')

    const havingTailResult = provider.provideCompletionItems(
      createModel('SELECT actor_id, COUNT(*) FROM actor GROUP BY actor_id HAVING COUNT(*) > 1 '),
      {
        lineNumber: 1,
        column:
          'SELECT actor_id, COUNT(*) FROM actor GROUP BY actor_id HAVING COUNT(*) > 1 '.length + 1
      }
    )
    const havingTailLabels = havingTailResult.suggestions.map((s) => s.label)
    expect(havingTailLabels).toContain('AND')
    expect(havingTailLabels).toContain('ORDER BY')
  })

  it('suggests multi-CTE chain progression with comma', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'pgsql')

    const provider = providers[0]

    const afterBodyResult = provider.provideCompletionItems(
      createModel('WITH cte1 AS (SELECT 1) '),
      {
        lineNumber: 1,
        column: 'WITH cte1 AS (SELECT 1) '.length + 1
      }
    )
    const afterBodyLabels = afterBodyResult.suggestions.map((s) => s.label)
    expect(afterBodyLabels).toContain(',')
    expect(afterBodyLabels).toContain('SELECT')

    const afterCommaResult = provider.provideCompletionItems(
      createModel('WITH cte1 AS (SELECT 1), '),
      {
        lineNumber: 1,
        column: 'WITH cte1 AS (SELECT 1), '.length + 1
      }
    )
    const afterCommaLabels = afterCommaResult.suggestions.map((s) => s.label)
    expect(afterCommaLabels).toContain('cte_name AS (')

    const afterChainNameResult = provider.provideCompletionItems(
      createModel('WITH cte1 AS (SELECT 1), cte2 '),
      {
        lineNumber: 1,
        column: 'WITH cte1 AS (SELECT 1), cte2 '.length + 1
      }
    )
    const afterChainNameLabels = afterChainNameResult.suggestions.map((s) => s.label)
    expect(afterChainNameLabels).toContain('AS')
  })

  it('suggests SELECT after UNION and UNION ALL', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'pgsql')

    const provider = providers[0]

    const unionResult = provider.provideCompletionItems(createModel('SELECT 1 UNION '), {
      lineNumber: 1,
      column: 'SELECT 1 UNION '.length + 1
    })
    const unionLabels = unionResult.suggestions.map((s) => s.label)
    expect(unionLabels).toContain('SELECT')

    const unionAllResult = provider.provideCompletionItems(createModel('SELECT 1 UNION ALL '), {
      lineNumber: 1,
      column: 'SELECT 1 UNION ALL '.length + 1
    })
    const unionAllLabels = unionAllResult.suggestions.map((s) => s.label)
    expect(unionAllLabels).toContain('SELECT')
  })

  it('suggests PostgreSQL window GROUPS and EXCLUDE options', () => {
    const { monaco, providers } = createMockMonaco()

    useMonacoSqlProviders(monaco, 'sql', 'pgsql')

    const provider = providers[0]

    const groupsResult = provider.provideCompletionItems(
      createModel('COUNT(*) OVER (ORDER BY actor_id '),
      {
        lineNumber: 1,
        column: 'COUNT(*) OVER (ORDER BY actor_id '.length + 1
      }
    )
    const groupsLabels = groupsResult.suggestions.map((s) => s.label)
    expect(groupsLabels).toContain('GROUPS')

    const excludeResult = provider.provideCompletionItems(
      createModel(
        'COUNT(*) OVER (ORDER BY actor_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW '
      ),
      {
        lineNumber: 1,
        column:
          'COUNT(*) OVER (ORDER BY actor_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW '
            .length + 1
      }
    )
    const excludeLabels = excludeResult.suggestions.map((s) => s.label)
    expect(excludeLabels).toContain('EXCLUDE')

    const excludeHeadResult = provider.provideCompletionItems(
      createModel(
        'COUNT(*) OVER (ORDER BY actor_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW EXCLUDE '
      ),
      {
        lineNumber: 1,
        column:
          'COUNT(*) OVER (ORDER BY actor_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW EXCLUDE '
            .length + 1
      }
    )
    const excludeHeadLabels = excludeHeadResult.suggestions.map((s) => s.label)
    expect(excludeHeadLabels).toContain('CURRENT ROW')
    expect(excludeHeadLabels).toContain('GROUP')
    expect(excludeHeadLabels).toContain('TIES')
    expect(excludeHeadLabels).toContain('NO OTHERS')
  })
})
