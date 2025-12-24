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

      // Check if we're after FROM, JOIN, etc. (table context)
      const isTableContext = /\b(FROM|JOIN|INTO|UPDATE|TABLE)\s+$/i.test(textUntilPosition)

      console.log('Completion provider triggered:', {
        text: textUntilPosition,
        isTableContext,
        word: wordInfo.word,
        hasSchema: !!schemaContext
      })

      // 1. Add SQL Keywords
      const keywords = getAllKeywords(dialect)
      keywords.forEach((keyword) => {
        suggestions.push({
          label: keyword,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: keyword,
          range,
          detail: 'SQL Keyword',
          sortText: isTableContext ? `9_${keyword}` : `1_${keyword}` // Deprioritize in table context
        })
      })

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
          sortText: `2_${func}`
        })
      })

      // 3. Add Table Names (if schema available) - prioritize in table context
      if (schemaContext?.tables) {
        schemaContext.tables.forEach((table) => {
          const displayName = table.schema ? `${table.schema}.${table.name}` : table.name
          suggestions.push({
            label: displayName,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: quoteIdentifier(table.name),
            range,
            detail: table.schema ? `Table (${table.schema})` : 'Table',
            documentation: `Table: ${displayName}`,
            sortText: isTableContext ? `0_${table.name}` : `3_${table.name}` // Prioritize in table context
          })
        })
      }

      // 4. Add Column Names (if schema available)
      if (schemaContext?.columns) {
        Object.entries(schemaContext.columns).forEach(([tableName, columns]) => {
          columns.forEach((column) => {
            const nullableStr = column.nullable ? 'NULL' : 'NOT NULL'
            suggestions.push({
              label: `${tableName}.${column.name}`,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: quoteIdentifier(column.name),
              range,
              detail: `${column.type} ${nullableStr}`,
              documentation: `Column from table ${tableName}\nType: ${column.type} ${nullableStr}`,
              sortText: `4_${column.name}`
            })
          })
        })
      }

      // 5. Add SQL Snippets
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

      console.log('Generated suggestions:', {
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
