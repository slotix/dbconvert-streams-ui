/**
 * Monaco SQL Language Providers Composable
 *
 * Provides intelligent SQL editing features:
 * - Autocomplete (keywords, tables, columns, functions, snippets)
 * - Hover information (column types, function signatures)
 * - Validation (basic syntax checking)
 * - Formatting (via Monaco's built-in formatter)
 */

import {
  getAllKeywords,
  getAllFunctions,
  SQL_SNIPPETS,
  type SqlSnippet
} from '@/constants/sqlKeywords'

import type * as MonacoTypes from 'monaco-editor'

export type MonacoApi = typeof import('monaco-editor')

/**
 * Schema context for database-aware autocomplete
 */
export interface SchemaContext {
  tables: Array<{ name: string; schema?: string }>
  columns: Record<string, Array<{ name: string; type: string; nullable: boolean }>>
  dialect: 'mysql' | 'pgsql' | 'sql'
}

interface CompletionContext {
  isTableContext: boolean
  hasTypedPrefix: boolean
  hasAggregateFunction: boolean
  isSelectListContext: boolean
  isSelectHeadContext: boolean
  isAfterSelectStarContext: boolean
  isAfterSelectListContext: boolean
  isAfterFromTableContext: boolean
  isAfterJoinTableContext: boolean
  isWhereHeadContext: boolean
  isAfterWhereClauseContext: boolean
  isOnHeadContext: boolean
  isAfterOnClauseContext: boolean
  isAfterGroupByClauseContext: boolean
  isOrderByHeadContext: boolean
  isAfterOrderByClauseContext: boolean
  isAfterLimitClauseContext: boolean
  suppressBroadSuggestions: boolean
}

interface TopKeywordRule {
  condition: (ctx: CompletionContext) => boolean
  label: string
  insertText: string
  detail: string
  sortText: string
}

function isSqlCompletionDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem('sqlCompletionDebug') === '1'
}

function logSqlCompletionDebug(message: string, payload: unknown) {
  if (!isSqlCompletionDebugEnabled()) return
  console.log(message, payload)
}

function buildCompletionContext(textUntilPosition: string, currentWord: string): CompletionContext {
  const isTableContext = /\b(FROM|JOIN|INTO|UPDATE|TABLE)\s+$/i.test(textUntilPosition)
  const hasTypedPrefix = currentWord.trim().length > 0

  const currentStatement = textUntilPosition.split(';').pop() ?? textUntilPosition
  const upperStatement = currentStatement.toUpperCase()
  const lastSelectIndex = upperStatement.lastIndexOf('SELECT')
  const lastFromIndex = upperStatement.lastIndexOf('FROM')
  const lastWhereIndex = upperStatement.lastIndexOf('WHERE')
  const lastOnIndex = upperStatement.lastIndexOf('ON')
  const lastGroupByIndex = upperStatement.lastIndexOf('GROUP BY')
  const lastOrderByIndex = upperStatement.lastIndexOf('ORDER BY')
  const lastLimitIndex = upperStatement.lastIndexOf('LIMIT')
  const hasAggregateFunction = /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(currentStatement)

  const isSelectListContext = lastSelectIndex !== -1 && lastSelectIndex > lastFromIndex
  const isSelectHeadContext = /\bSELECT\s+(DISTINCT\s+)?$/i.test(textUntilPosition)
  const isAfterSelectStarContext = /\bSELECT\s+(DISTINCT\s+)?\*\s+$/i.test(textUntilPosition)
  const isAfterSelectListContext =
    isSelectListContext &&
    /\s$/.test(textUntilPosition) &&
    !isSelectHeadContext &&
    !isAfterSelectStarContext &&
    !/,\s*$/.test(textUntilPosition)
  const isAfterFromTableContext = /\bFROM\s+[^\s,;()]+\s+$/i.test(textUntilPosition)
  const isAfterJoinTableContext = /\bJOIN\s+[^\s,;()]+\s+$/i.test(textUntilPosition)
  const isWhereHeadContext = /\bWHERE\s+$/i.test(textUntilPosition)
  const isAfterWhereClauseContext =
    lastWhereIndex !== -1 &&
    lastWhereIndex > lastGroupByIndex &&
    lastWhereIndex > lastOrderByIndex &&
    /\s$/.test(textUntilPosition) &&
    !/\bWHERE\s*$/i.test(textUntilPosition) &&
    !/,\s*$/.test(textUntilPosition)
  const isOnHeadContext = /\bON\s+$/i.test(textUntilPosition)
  const isAfterOnClauseContext =
    lastOnIndex !== -1 &&
    lastOnIndex > lastWhereIndex &&
    /\s$/.test(textUntilPosition) &&
    !/\bON\s*$/i.test(textUntilPosition) &&
    !/,\s*$/.test(textUntilPosition)
  const isAfterGroupByClauseContext =
    lastGroupByIndex !== -1 &&
    lastGroupByIndex > lastOrderByIndex &&
    /\s$/.test(textUntilPosition) &&
    !/\bGROUP\s+BY\s*$/i.test(textUntilPosition) &&
    !/,\s*$/.test(textUntilPosition)
  const isOrderByHeadContext = /\bORDER\s+BY\s+$/i.test(textUntilPosition)
  const isAfterOrderByClauseContext =
    lastOrderByIndex !== -1 &&
    /\s$/.test(textUntilPosition) &&
    !/\bORDER\s+BY\s*$/i.test(textUntilPosition) &&
    !/,\s*$/.test(textUntilPosition)
  const isAfterLimitClauseContext =
    lastLimitIndex !== -1 &&
    /\s$/.test(textUntilPosition) &&
    !/\bLIMIT\s*$/i.test(textUntilPosition) &&
    !/,\s*$/.test(textUntilPosition)

  return {
    isTableContext,
    hasTypedPrefix,
    hasAggregateFunction,
    isSelectListContext,
    isSelectHeadContext,
    isAfterSelectStarContext,
    isAfterSelectListContext,
    isAfterFromTableContext,
    isAfterJoinTableContext,
    isWhereHeadContext,
    isAfterWhereClauseContext,
    isOnHeadContext,
    isAfterOnClauseContext,
    isAfterGroupByClauseContext,
    isOrderByHeadContext,
    isAfterOrderByClauseContext,
    isAfterLimitClauseContext,
    suppressBroadSuggestions: isSelectListContext && !hasTypedPrefix
  }
}

function addTopKeywordSuggestions(
  monaco: MonacoApi,
  suggestions: MonacoTypes.languages.CompletionItem[],
  range: MonacoTypes.IRange,
  ctx: CompletionContext,
  dialect: 'mysql' | 'pgsql' | 'sql'
) {
  const rules: TopKeywordRule[] = [
    {
      condition: (c) => c.isSelectHeadContext,
      label: '*',
      insertText: '*',
      detail: 'All columns',
      sortText: '00_*'
    },
    {
      condition: (c) => c.isAfterSelectStarContext || c.isAfterSelectListContext,
      label: 'FROM',
      insertText: 'FROM ',
      detail: 'SQL Keyword',
      sortText: '00_FROM'
    },
    {
      condition: (c) => c.isAfterFromTableContext,
      label: 'JOIN',
      insertText: 'JOIN ',
      detail: 'SQL Keyword',
      sortText: '00_JOIN'
    },
    {
      condition: (c) => c.isAfterFromTableContext,
      label: 'WHERE',
      insertText: 'WHERE ',
      detail: 'SQL Keyword',
      sortText: '00_WHERE'
    },
    {
      condition: (c) => c.isAfterFromTableContext && c.hasAggregateFunction,
      label: 'GROUP BY',
      insertText: 'GROUP BY ',
      detail: 'SQL Keyword',
      sortText: '00_GROUP_BY_FROM'
    },
    {
      condition: (c) => c.isAfterFromTableContext,
      label: 'ORDER BY',
      insertText: 'ORDER BY ',
      detail: 'SQL Keyword',
      sortText: '00_ORDER_BY_FROM'
    },
    {
      condition: (c) => c.isAfterJoinTableContext,
      label: 'ON',
      insertText: 'ON ',
      detail: 'SQL Keyword',
      sortText: '00_ON'
    },
    {
      condition: (c) => c.isAfterWhereClauseContext,
      label: 'AND',
      insertText: 'AND ',
      detail: 'SQL Keyword',
      sortText: '00_AND'
    },
    {
      condition: (c) => c.isAfterWhereClauseContext,
      label: 'OR',
      insertText: 'OR ',
      detail: 'SQL Keyword',
      sortText: '00_OR'
    },
    {
      condition: (c) => c.isAfterWhereClauseContext,
      label: 'LIMIT',
      insertText: 'LIMIT ',
      detail: 'SQL Keyword',
      sortText: '00_LIMIT_WHERE'
    },
    {
      condition: (c) => c.isAfterWhereClauseContext,
      label: 'ORDER BY',
      insertText: 'ORDER BY ',
      detail: 'SQL Keyword',
      sortText: '00_ORDER_BY_WHERE'
    },
    {
      condition: (c) => c.isAfterWhereClauseContext,
      label: 'GROUP BY',
      insertText: 'GROUP BY ',
      detail: 'SQL Keyword',
      sortText: '00_GROUP_BY'
    },
    {
      condition: (c) => c.isAfterWhereClauseContext && dialect === 'pgsql',
      label: 'ILIKE',
      insertText: 'ILIKE ',
      detail: 'PostgreSQL Keyword',
      sortText: '00_ILIKE'
    },
    {
      condition: (c) => c.isAfterWhereClauseContext && dialect === 'mysql',
      label: 'REGEXP',
      insertText: 'REGEXP ',
      detail: 'MySQL Keyword',
      sortText: '00_REGEXP'
    },
    {
      condition: (c) => c.isAfterOnClauseContext,
      label: 'AND',
      insertText: 'AND ',
      detail: 'SQL Keyword',
      sortText: '00_AND_ON'
    },
    {
      condition: (c) => c.isAfterOnClauseContext,
      label: 'OR',
      insertText: 'OR ',
      detail: 'SQL Keyword',
      sortText: '00_OR_ON'
    },
    {
      condition: (c) => c.isAfterGroupByClauseContext,
      label: 'ORDER BY',
      insertText: 'ORDER BY ',
      detail: 'SQL Keyword',
      sortText: '00_ORDER_BY'
    },
    {
      condition: (c) => c.isAfterGroupByClauseContext,
      label: 'HAVING',
      insertText: 'HAVING ',
      detail: 'SQL Keyword',
      sortText: '00_HAVING'
    },
    {
      condition: (c) => c.isAfterOrderByClauseContext,
      label: 'LIMIT',
      insertText: 'LIMIT ',
      detail: 'SQL Keyword',
      sortText: '00_LIMIT'
    },
    {
      condition: (c) => c.isAfterLimitClauseContext,
      label: 'OFFSET',
      insertText: 'OFFSET ',
      detail: 'SQL Keyword',
      sortText: '00_OFFSET'
    }
  ]

  rules.forEach((rule) => {
    if (!rule.condition(ctx)) return
    suggestions.push({
      label: rule.label,
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: rule.insertText,
      range,
      detail: rule.detail,
      sortText: rule.sortText
    })
  })
}

// Store disposables globally to allow disposal on re-registration
let disposables: Array<{ dispose: () => void }> = []

/**
 * Register all SQL language providers for Monaco editor
 *
 * @param monaco - Monaco instance from editor mount
 * @param language - Monaco language ID (always 'sql')
 * @param dialect - SQL dialect for features ('mysql', 'pgsql', 'sql')
 * @param schemaContext - Optional schema information for table/column autocomplete
 */
export function useMonacoSqlProviders(
  monaco: MonacoApi,
  language: string,
  dialect: 'mysql' | 'pgsql' | 'sql',
  schemaContext?: SchemaContext
) {
  if (!monaco || !monaco.languages) {
    console.warn('Monaco instance not available')
    return
  }

  // Dispose previous providers before registering new ones
  disposables.forEach((d) => d.dispose())
  disposables = []

  // console.log('Registering SQL providers:', {
  //   language,
  //   dialect,
  //   hasTables: !!schemaContext?.tables,
  //   tableCount: schemaContext?.tables?.length || 0
  // })

  // Register completion provider (autocomplete)
  disposables.push(registerCompletionProvider(monaco, language, dialect, schemaContext))

  // Register hover provider (show info on hover)
  disposables.push(registerHoverProvider(monaco, language, schemaContext))

  // Register validation provider (syntax checking)
  registerValidationProvider(monaco, language)
}

/**
 * Completion Provider - Provides autocomplete suggestions
 */
function registerCompletionProvider(
  monaco: MonacoApi,
  language: string,
  dialect: 'mysql' | 'pgsql' | 'sql',
  schemaContext?: SchemaContext
) {
  // Quote character based on dialect
  const quoteChar = dialect === 'mysql' ? '`' : '"'
  const quoteIdentifier = (name: string) => `${quoteChar}${name}${quoteChar}`

  return monaco.languages.registerCompletionItemProvider(language, {
    triggerCharacters: [' ', '.', '('],
    provideCompletionItems: (
      model: MonacoTypes.editor.ITextModel,
      position: MonacoTypes.Position
    ) => {
      const suggestions: MonacoTypes.languages.CompletionItem[] = []

      // Get text before cursor to understand context
      const textUntilPosition = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column
      })

      // Get the word being typed
      const wordInfo = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: wordInfo.startColumn,
        endColumn: wordInfo.endColumn
      }

      const completionContext = buildCompletionContext(textUntilPosition, wordInfo.word)
      const isPredicateContext =
        completionContext.isWhereHeadContext ||
        completionContext.isAfterWhereClauseContext ||
        completionContext.isOnHeadContext ||
        completionContext.isAfterOnClauseContext
      const isOrderByContext =
        completionContext.isOrderByHeadContext || completionContext.isAfterOrderByClauseContext

      logSqlCompletionDebug('Completion provider triggered:', {
        text: textUntilPosition,
        isTableContext: completionContext.isTableContext,
        word: wordInfo.word,
        hasSchema: !!schemaContext
      })

      addTopKeywordSuggestions(monaco, suggestions, range, completionContext, dialect)

      // 1. Add SQL Keywords
      if (!completionContext.suppressBroadSuggestions) {
        const keywords = getAllKeywords(dialect)
        keywords.forEach((keyword) => {
          suggestions.push({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            range,
            detail: 'SQL Keyword',
            sortText: completionContext.isTableContext ? `9_${keyword}` : `1_${keyword}` // Deprioritize in table context
          })
        })
      }

      // 2. Add SQL Functions
      const functions = getAllFunctions(dialect)
      functions.forEach((func) => {
        suggestions.push({
          label: `${func}()`,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: `${func}($0)`,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
          detail: 'SQL Function',
          sortText:
            completionContext.isSelectListContext || isPredicateContext || isOrderByContext
              ? `8_${func}`
              : `2_${func}`
        })
      })

      // 3. Add Table Names (if schema available) - prioritize in table context
      if (schemaContext?.tables) {
        schemaContext.tables.forEach((table) => {
          const displayName = table.schema ? `${table.schema}.${table.name}` : table.name
          const tableInsertText = displayName.includes('.')
            ? displayName
            : quoteIdentifier(table.name)
          suggestions.push({
            label: displayName,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: tableInsertText,
            range,
            detail: table.schema ? `Table (${table.schema})` : 'Table',
            documentation: `Table: ${displayName}`,
            sortText: completionContext.isTableContext
              ? `0_${table.name}`
              : completionContext.isSelectListContext
                ? `2_${table.name}`
                : `3_${table.name}` // Prioritize in table context
          })
        })
      }

      // 4. Add Column Names (if schema available)
      if (schemaContext?.columns) {
        Object.entries(schemaContext.columns).forEach(([tableName, columns]) => {
          columns.forEach((column) => {
            const nullableStr = column.nullable ? 'NULL' : 'NOT NULL'
            const columnInsertText = tableName.includes('.')
              ? `${tableName}.${column.name}`
              : quoteIdentifier(column.name)
            suggestions.push({
              label: `${tableName}.${column.name}`,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: columnInsertText,
              range,
              detail: `${column.type} ${nullableStr}`,
              documentation: `Column from table ${tableName}\nType: ${column.type} ${nullableStr}`,
              sortText:
                completionContext.isSelectListContext || isPredicateContext || isOrderByContext
                  ? `0_${tableName}_${column.name}`
                  : `4_${column.name}`
            })
          })
        })
      }

      // 5. Add SQL Snippets
      if (!completionContext.suppressBroadSuggestions) {
        SQL_SNIPPETS.forEach((snippet: SqlSnippet) => {
          suggestions.push({
            label: snippet.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: snippet.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            detail: 'Snippet',
            documentation: snippet.description,
            sortText: `5_${snippet.label}`
          })
        })
      }

      logSqlCompletionDebug('Generated suggestions:', {
        total: suggestions.length,
        tables: suggestions.filter((s) => s.kind === monaco.languages.CompletionItemKind.Class)
          .length,
        keywords: suggestions.filter((s) => s.kind === monaco.languages.CompletionItemKind.Keyword)
          .length
      })

      return { suggestions }
    }
  })
}

/**
 * Hover Provider - Shows information when hovering over text
 */
function registerHoverProvider(monaco: MonacoApi, language: string, schemaContext?: SchemaContext) {
  return monaco.languages.registerHoverProvider(language, {
    provideHover: (
      model: MonacoTypes.editor.ITextModel,
      position: MonacoTypes.Position
    ): MonacoTypes.languages.Hover | null => {
      const word = model.getWordAtPosition(position)
      if (!word) return null

      const hoveredWord = word.word.toLowerCase()

      // Check if hovering over a column name
      if (schemaContext?.columns) {
        for (const [tableName, columns] of Object.entries(schemaContext.columns)) {
          const column = columns.find((col) => col.name.toLowerCase() === hoveredWord)
          if (column) {
            const nullableStr = column.nullable ? 'NULL' : 'NOT NULL'
            return {
              contents: [
                {
                  value:
                    `**${column.name}** (from \`${tableName}\`)\n\n` +
                    `Type: \`${column.type}\` ${nullableStr}`
                }
              ]
            }
          }
        }
      }

      // Check if hovering over a table name
      if (schemaContext?.tables) {
        const table = schemaContext.tables.find((t) => t.name.toLowerCase() === hoveredWord)
        if (table) {
          const displayName = table.schema ? `${table.schema}.${table.name}` : table.name
          const columnCount = schemaContext.columns[table.name]?.length || 0
          return {
            contents: [
              {
                value: `**Table:** \`${displayName}\`\n\n` + `Columns: ${columnCount}`
              }
            ]
          }
        }
      }

      // Check if hovering over a SQL function
      const functions = getAllFunctions(schemaContext?.dialect || 'sql')
      if (functions.some((f) => f.toLowerCase() === hoveredWord)) {
        return {
          contents: [
            {
              value: getFunctionDocumentation(hoveredWord.toUpperCase())
            }
          ]
        }
      }

      return null
    }
  })
}

/**
 * Get documentation for SQL functions
 */
function getFunctionDocumentation(funcName: string): string {
  const docs: Record<string, string> = {
    COUNT: '**COUNT(expression)**\n\nReturns the number of rows that match the specified criteria.',
    SUM: '**SUM(expression)**\n\nReturns the sum of a set of values.',
    AVG: '**AVG(expression)**\n\nReturns the average value of a set of values.',
    MIN: '**MIN(expression)**\n\nReturns the minimum value in a set of values.',
    MAX: '**MAX(expression)**\n\nReturns the maximum value in a set of values.',
    CONCAT: '**CONCAT(string1, string2, ...)**\n\nConcatenates two or more strings.',
    COALESCE: '**COALESCE(value1, value2, ...)**\n\nReturns the first non-null value in the list.',
    SUBSTRING: '**SUBSTRING(string, start, length)**\n\nExtracts a substring from a string.',
    UPPER: '**UPPER(string)**\n\nConverts a string to uppercase.',
    LOWER: '**LOWER(string)**\n\nConverts a string to lowercase.',
    TRIM: '**TRIM(string)**\n\nRemoves leading and trailing spaces from a string.',
    NOW: '**NOW()**\n\nReturns the current date and time.',
    DATE: '**DATE(expression)**\n\nExtracts the date part from a datetime expression.',
    CAST: '**CAST(expression AS type)**\n\nConverts a value to a specified data type.',
    ROUND: '**ROUND(number, decimals)**\n\nRounds a number to a specified number of decimal places.'
  }

  return docs[funcName] || `**${funcName}**\n\nSQL function`
}

/**
 * Validation Provider - Monaco has built-in SQL validation
 * Custom validation can be added here in the future if needed
 */
function registerValidationProvider(_monaco: MonacoApi, _language: string) {
  // Monaco provides built-in SQL syntax validation
  // Custom validation rules can be added here in the future
}
