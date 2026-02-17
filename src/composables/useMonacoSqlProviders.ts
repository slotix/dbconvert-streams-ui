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
import { buildTopKeywordRules } from './sqlCompletionTopRules'

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

export interface CompletionContext {
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
  isGroupByHeadContext: boolean
  isHavingHeadContext: boolean
  isAfterHavingClauseContext: boolean
  isOrderByHeadContext: boolean
  isAfterOrderByClauseContext: boolean
  isAfterLimitClauseContext: boolean
  isInsertHeadContext: boolean
  isInsertIntoHeadContext: boolean
  isAfterInsertIntoTableContext: boolean
  isAfterInsertColumnsContext: boolean
  isValuesHeadContext: boolean
  isUpdateHeadContext: boolean
  isAfterUpdateTableContext: boolean
  isSetHeadContext: boolean
  isAfterSetClauseContext: boolean
  isDeleteHeadContext: boolean
  isDeleteFromHeadContext: boolean
  isAfterDeleteFromTableContext: boolean
  isDropHeadContext: boolean
  isDropTableHeadContext: boolean
  isAfterDropTableNameContext: boolean
  isCreateHeadContext: boolean
  isAlterHeadContext: boolean
  isAlterTableHeadContext: boolean
  isAfterAlterTableNameContext: boolean
  isTruncateHeadContext: boolean
  isTruncateTableHeadContext: boolean
  isWithHeadContext: boolean
  isAfterWithCteNameContext: boolean
  isAfterWithCteAsContext: boolean
  isAfterWithCteBodyContext: boolean
  isAfterWithCteBodyCommaContext: boolean
  isAfterWithCteChainNameContext: boolean
  isAfterWithCteChainAsContext: boolean
  isAfterSelectTailContext: boolean
  isAfterUnionHeadContext: boolean
  isAfterUnionAllHeadContext: boolean
  isAfterInsertValuesTupleContext: boolean
  isOnConflictHeadContext: boolean
  isAfterOnConflictTargetContext: boolean
  isDoUpdateHeadContext: boolean
  isOnDuplicateKeyHeadContext: boolean
  isMergeHeadContext: boolean
  isMergeIntoHeadContext: boolean
  isAfterMergeIntoTableContext: boolean
  isMergeUsingHeadContext: boolean
  isAfterMergeUsingTableContext: boolean
  isAfterMergeOnClauseContext: boolean
  isMergeWhenMatchedThenContext: boolean
  isMergeUpdateHeadContext: boolean
  isMergeWhenNotMatchedThenContext: boolean
  isMergeInsertHeadContext: boolean
  isAfterMergeInsertColumnsContext: boolean
  isMergeInsertValuesHeadContext: boolean
  isOverHeadContext: boolean
  isOverOpenParenContext: boolean
  isWindowOrderByInOverContext: boolean
  isRowsHeadContext: boolean
  isRangeHeadContext: boolean
  isRowsBetweenHeadContext: boolean
  isRangeBetweenHeadContext: boolean
  isGroupsHeadContext: boolean
  isGroupsBetweenHeadContext: boolean
  isWindowFrameAndHeadContext: boolean
  isWindowFrameEndContext: boolean
  isExcludeHeadContext: boolean
  isCaseHeadContext: boolean
  isAfterCaseThenClauseContext: boolean
  isElseHeadContext: boolean
  isDescribeHeadContext: boolean
  isDescribeTargetContext: boolean
  suppressBroadSuggestions: boolean
}

export interface TopKeywordRule {
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
  const lastHavingIndex = upperStatement.lastIndexOf('HAVING')
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
  const isGroupByHeadContext = /\bGROUP\s+BY\s+$/i.test(textUntilPosition)
  const isHavingHeadContext = /\bHAVING\s+$/i.test(textUntilPosition)
  const isAfterHavingClauseContext =
    lastHavingIndex !== -1 &&
    /\s$/.test(textUntilPosition) &&
    !/\bHAVING\s*$/i.test(textUntilPosition) &&
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
  const isInsertHeadContext = /\bINSERT\s+$/i.test(textUntilPosition)
  const isInsertIntoHeadContext = /\bINSERT\s+INTO\s+$/i.test(textUntilPosition)
  const isAfterInsertIntoTableContext = /\bINSERT\s+INTO\s+[^\s,;()]+\s+$/i.test(textUntilPosition)
  const isAfterInsertColumnsContext =
    /\bINSERT\s+INTO\s+[^\s,;()]+\s*\([^)]*\)\s+$/i.test(textUntilPosition) &&
    !/\bVALUES\s+$/i.test(textUntilPosition)
  const isValuesHeadContext = /\bVALUES\s+$/i.test(textUntilPosition)
  const isUpdateHeadContext = /\bUPDATE\s+$/i.test(textUntilPosition)
  const isAfterUpdateTableContext = /\bUPDATE\s+[^\s,;()]+\s+$/i.test(textUntilPosition)
  const isSetHeadContext = /\bSET\s+$/i.test(textUntilPosition)
  const isAfterSetClauseContext =
    /\bUPDATE\b/i.test(currentStatement) &&
    /\bSET\b/i.test(currentStatement) &&
    /\s$/.test(textUntilPosition) &&
    !/\bSET\s*$/i.test(textUntilPosition) &&
    !/,\s*$/.test(textUntilPosition)
  const isDeleteHeadContext = /\bDELETE\s+$/i.test(textUntilPosition)
  const isDeleteFromHeadContext = /\bDELETE\s+FROM\s+$/i.test(textUntilPosition)
  const isAfterDeleteFromTableContext = /\bDELETE\s+FROM\s+[^\s,;()]+\s+$/i.test(textUntilPosition)
  const isDropHeadContext = /\bDROP\s+$/i.test(textUntilPosition)
  const isDropTableHeadContext = /\bDROP\s+TABLE\s+$/i.test(textUntilPosition)
  const isAfterDropTableNameContext = /\bDROP\s+TABLE\s+[^\s,;()]+\s+$/i.test(textUntilPosition)
  const isCreateHeadContext = /\bCREATE\s+$/i.test(textUntilPosition)
  const isAlterHeadContext = /\bALTER\s+$/i.test(textUntilPosition)
  const isAlterTableHeadContext = /\bALTER\s+TABLE\s+$/i.test(textUntilPosition)
  const isAfterAlterTableNameContext = /\bALTER\s+TABLE\s+[^\s,;()]+\s+$/i.test(textUntilPosition)
  const isTruncateHeadContext = /\bTRUNCATE\s+$/i.test(textUntilPosition)
  const isTruncateTableHeadContext = /\bTRUNCATE\s+TABLE\s+$/i.test(textUntilPosition)
  const isWithHeadContext = /\bWITH\s+$/i.test(textUntilPosition)
  const isAfterWithCteNameContext = /\bWITH\s+[A-Za-z_][\w$]*\s+$/i.test(textUntilPosition)
  const isAfterWithCteAsContext = /\bWITH\s+[A-Za-z_][\w$]*\s+AS\s*$/i.test(textUntilPosition)
  const isAfterWithCteBodyContext = /\bWITH\b[\s\S]*\)\s+$/i.test(textUntilPosition)
  const isAfterWithCteBodyCommaContext = /\bWITH\b[\s\S]*\)\s*,\s*$/i.test(textUntilPosition)
  const isAfterWithCteChainNameContext = /\bWITH\b[\s\S]*\)\s*,\s*[A-Za-z_][\w$]*\s+$/i.test(
    textUntilPosition
  )
  const isAfterWithCteChainAsContext = /\bWITH\b[\s\S]*\)\s*,\s*[A-Za-z_][\w$]*\s+AS\s*$/i.test(
    textUntilPosition
  )
  const isAfterSelectTailContext =
    /\bSELECT\b/i.test(currentStatement) &&
    /\s$/.test(textUntilPosition) &&
    !isSelectHeadContext &&
    !isAfterSelectStarContext &&
    !isAfterSelectListContext &&
    !isTableContext &&
    !isWhereHeadContext &&
    !isOnHeadContext &&
    !isOrderByHeadContext &&
    !isAfterOrderByClauseContext &&
    !isAfterLimitClauseContext
  const isAfterUnionHeadContext = /\bUNION\s+$/i.test(textUntilPosition)
  const isAfterUnionAllHeadContext = /\bUNION\s+ALL\s+$/i.test(textUntilPosition)
  const isAfterInsertValuesTupleContext =
    /\bINSERT\s+INTO\s+[^\s,;()]+\s*(\([^)]*\)\s*)?VALUES\s*\([^)]*\)\s+$/i.test(textUntilPosition)
  const isOnConflictHeadContext = /\bON\s+CONFLICT\s+$/i.test(textUntilPosition)
  const isAfterOnConflictTargetContext = /\bON\s+CONFLICT\s*\([^)]*\)\s+$/i.test(textUntilPosition)
  const isDoUpdateHeadContext = /\bDO\s+UPDATE\s+$/i.test(textUntilPosition)
  const isOnDuplicateKeyHeadContext = /\bON\s+DUPLICATE\s+KEY\s+$/i.test(textUntilPosition)
  const isMergeHeadContext = /\bMERGE\s+$/i.test(textUntilPosition)
  const isMergeIntoHeadContext = /\bMERGE\s+INTO\s+$/i.test(textUntilPosition)
  const isAfterMergeIntoTableContext = /\bMERGE\s+INTO\s+[^\s,;()]+\s+$/i.test(textUntilPosition)
  const isMergeUsingHeadContext = /\bMERGE\s+INTO\s+[^\s,;()]+\s+USING\s+$/i.test(textUntilPosition)
  const isAfterMergeUsingTableContext =
    /\bMERGE\s+INTO\s+[^\s,;()]+\s+USING\s+[^\s,;()]+\s+$/i.test(textUntilPosition)
  const isAfterMergeOnClauseContext =
    /\bMERGE\s+INTO\b/i.test(currentStatement) &&
    /\bUSING\b/i.test(currentStatement) &&
    /\bON\b/i.test(currentStatement) &&
    /\s$/.test(textUntilPosition) &&
    !/\bON\s*$/i.test(textUntilPosition)
  const isMergeWhenMatchedThenContext =
    /\bMERGE\s+INTO\b/i.test(currentStatement) &&
    /\bWHEN\s+MATCHED\s+THEN\s+$/i.test(textUntilPosition)
  const isMergeUpdateHeadContext =
    /\bMERGE\s+INTO\b/i.test(currentStatement) &&
    /\bWHEN\s+MATCHED\s+THEN\s+UPDATE\s+$/i.test(textUntilPosition)
  const isMergeWhenNotMatchedThenContext =
    /\bMERGE\s+INTO\b/i.test(currentStatement) &&
    /\bWHEN\s+NOT\s+MATCHED\s+THEN\s+$/i.test(textUntilPosition)
  const isMergeInsertHeadContext =
    /\bMERGE\s+INTO\b/i.test(currentStatement) &&
    /\bWHEN\s+NOT\s+MATCHED\s+THEN\s+INSERT\s+$/i.test(textUntilPosition)
  const isAfterMergeInsertColumnsContext =
    /\bMERGE\s+INTO\b/i.test(currentStatement) &&
    /\bWHEN\s+NOT\s+MATCHED\s+THEN\s+INSERT\s*\([^)]*\)\s+$/i.test(textUntilPosition)
  const isMergeInsertValuesHeadContext =
    /\bMERGE\s+INTO\b/i.test(currentStatement) &&
    /\bWHEN\s+NOT\s+MATCHED\s+THEN\s+INSERT\s*(\([^)]*\)\s*)?VALUES\s+$/i.test(textUntilPosition)
  const isOverHeadContext = /\bOVER\s+$/i.test(textUntilPosition)
  const isOverOpenParenContext = /\bOVER\s*\(\s*$/i.test(textUntilPosition)
  const isWindowOrderByInOverContext = /\bOVER\s*\([^)]*\bORDER\s+BY\s+[^)]*\s+$/i.test(
    textUntilPosition
  )
  const isRowsHeadContext = /\bROWS\s+$/i.test(textUntilPosition)
  const isRangeHeadContext = /\bRANGE\s+$/i.test(textUntilPosition)
  const isRowsBetweenHeadContext = /\bROWS\s+BETWEEN\s+$/i.test(textUntilPosition)
  const isRangeBetweenHeadContext = /\bRANGE\s+BETWEEN\s+$/i.test(textUntilPosition)
  const isGroupsHeadContext = /\bGROUPS\s+$/i.test(textUntilPosition)
  const isGroupsBetweenHeadContext = /\bGROUPS\s+BETWEEN\s+$/i.test(textUntilPosition)
  const isWindowFrameAndHeadContext = /\b(ROWS|RANGE)\s+BETWEEN\s+[^)\n]+\s+AND\s+$/i.test(
    textUntilPosition
  )
  const isWindowFrameEndContext =
    /\b(ROWS|RANGE|GROUPS)\s+BETWEEN\s+[^)\n]+\s+AND\s+(CURRENT\s+ROW|UNBOUNDED\s+FOLLOWING)\s+$/i.test(
      textUntilPosition
    )
  const isExcludeHeadContext = /\bEXCLUDE\s+$/i.test(textUntilPosition)
  const isCaseHeadContext = /\bCASE\s+$/i.test(textUntilPosition)
  const isAfterCaseThenClauseContext =
    /\bCASE\b/i.test(currentStatement) &&
    /\bTHEN\s+[^;\n]+\s+$/i.test(textUntilPosition) &&
    !/\bEND\s*$/i.test(textUntilPosition)
  const isElseHeadContext = /\bELSE\s+$/i.test(textUntilPosition)
  const isDescribeHeadContext = /\bDESCRIBE\s+$/i.test(textUntilPosition)
  const isDescribeTargetContext = /\bDESCRIBE\s+[^\s,;()]+\s+$/i.test(textUntilPosition)

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
    isGroupByHeadContext,
    isHavingHeadContext,
    isAfterHavingClauseContext,
    isOrderByHeadContext,
    isAfterOrderByClauseContext,
    isAfterLimitClauseContext,
    isInsertHeadContext,
    isInsertIntoHeadContext,
    isAfterInsertIntoTableContext,
    isAfterInsertColumnsContext,
    isValuesHeadContext,
    isUpdateHeadContext,
    isAfterUpdateTableContext,
    isSetHeadContext,
    isAfterSetClauseContext,
    isDeleteHeadContext,
    isDeleteFromHeadContext,
    isAfterDeleteFromTableContext,
    isDropHeadContext,
    isDropTableHeadContext,
    isAfterDropTableNameContext,
    isCreateHeadContext,
    isAlterHeadContext,
    isAlterTableHeadContext,
    isAfterAlterTableNameContext,
    isTruncateHeadContext,
    isTruncateTableHeadContext,
    isWithHeadContext,
    isAfterWithCteNameContext,
    isAfterWithCteAsContext,
    isAfterWithCteBodyContext,
    isAfterWithCteBodyCommaContext,
    isAfterWithCteChainNameContext,
    isAfterWithCteChainAsContext,
    isAfterSelectTailContext,
    isAfterUnionHeadContext,
    isAfterUnionAllHeadContext,
    isAfterInsertValuesTupleContext,
    isOnConflictHeadContext,
    isAfterOnConflictTargetContext,
    isDoUpdateHeadContext,
    isOnDuplicateKeyHeadContext,
    isMergeHeadContext,
    isMergeIntoHeadContext,
    isAfterMergeIntoTableContext,
    isMergeUsingHeadContext,
    isAfterMergeUsingTableContext,
    isAfterMergeOnClauseContext,
    isMergeWhenMatchedThenContext,
    isMergeUpdateHeadContext,
    isMergeWhenNotMatchedThenContext,
    isMergeInsertHeadContext,
    isAfterMergeInsertColumnsContext,
    isMergeInsertValuesHeadContext,
    isOverHeadContext,
    isOverOpenParenContext,
    isWindowOrderByInOverContext,
    isRowsHeadContext,
    isRangeHeadContext,
    isRowsBetweenHeadContext,
    isRangeBetweenHeadContext,
    isGroupsHeadContext,
    isGroupsBetweenHeadContext,
    isWindowFrameAndHeadContext,
    isWindowFrameEndContext,
    isExcludeHeadContext,
    isCaseHeadContext,
    isAfterCaseThenClauseContext,
    isElseHeadContext,
    isDescribeHeadContext,
    isDescribeTargetContext,
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
  const rules = buildTopKeywordRules(dialect)

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
    triggerCharacters: [' ', '.', '(', ','],
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
      const isDuckDbCsvArgsContext =
        dialect === 'sql' && /\bread_csv(_auto)?\s*\([^)]*$/i.test(textUntilPosition)
      const isDuckDbParquetArgsContext =
        dialect === 'sql' && /\bread_parquet\s*\([^)]*$/i.test(textUntilPosition)
      const isDuckDbJsonArgsContext =
        dialect === 'sql' && /\bread_json(_auto)?\s*\([^)]*$/i.test(textUntilPosition)
      const isDuckDbArgsAfterCommaContext =
        (isDuckDbCsvArgsContext || isDuckDbParquetArgsContext || isDuckDbJsonArgsContext) &&
        /,\s*$/.test(textUntilPosition)
      const isPredicateContext =
        completionContext.isWhereHeadContext ||
        completionContext.isAfterWhereClauseContext ||
        completionContext.isHavingHeadContext ||
        completionContext.isAfterHavingClauseContext ||
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

      // 2. Add Table Names (if schema available) - prioritize in table context
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

      // 2.1 Add DuckDB file table functions in FROM/JOIN contexts
      if (dialect === 'sql' && completionContext.isTableContext) {
        const duckdbTableFunctions = [
          {
            label: 'read_parquet(...)',
            insertText: "read_parquet('${1:/path/to/files/*.parquet}')",
            detail: 'DuckDB table function'
          },
          {
            label: 'read_csv_auto(...)',
            insertText: "read_csv_auto('${1:/path/to/files/*.csv}')",
            detail: 'DuckDB table function'
          },
          {
            label: 'read_json_auto(...)',
            insertText: "read_json_auto('${1:/path/to/files/*.json*}')",
            detail: 'DuckDB table function'
          },
          {
            label: 'glob(...)',
            insertText: "glob('${1:/path/to/files/*}')",
            detail: 'DuckDB table function'
          }
        ]

        duckdbTableFunctions.forEach((item) => {
          suggestions.push({
            label: item.label,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: item.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            detail: item.detail,
            sortText: `00_${item.label}`
          })
        })
      }

      if (dialect === 'sql' && completionContext.isDescribeHeadContext) {
        suggestions.push(
          {
            label: 'read_parquet(...)',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: "read_parquet('${1:/path/to/files/*.parquet}')",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            detail: 'DuckDB table function',
            sortText: '00_DESCRIBE_READ_PARQUET'
          },
          {
            label: 'read_csv_auto(...)',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: "read_csv_auto('${1:/path/to/files/*.csv}')",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            detail: 'DuckDB table function',
            sortText: '00_DESCRIBE_READ_CSV'
          },
          {
            label: 'read_json_auto(...)',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: "read_json_auto('${1:/path/to/files/*.json*}')",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            detail: 'DuckDB table function',
            sortText: '00_DESCRIBE_READ_JSON'
          }
        )
      }

      if (dialect === 'sql' && completionContext.isDescribeTargetContext) {
        suggestions.push(
          {
            label: 'AS',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'AS ',
            range,
            detail: 'Alias',
            sortText: '00_DESCRIBE_AS'
          },
          {
            label: 'SELECT',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'SELECT ',
            range,
            detail: 'SQL Keyword',
            sortText: '01_DESCRIBE_SELECT'
          }
        )
      }

      // 2.2 Add DuckDB named parameters inside read_* argument contexts
      if (isDuckDbCsvArgsContext || isDuckDbParquetArgsContext || isDuckDbJsonArgsContext) {
        const duckdbNamedArgs: Array<{ label: string; insertText: string; documentation: string }> =
          []

        if (isDuckDbCsvArgsContext) {
          duckdbNamedArgs.push(
            {
              label: 'union_by_name = ...',
              insertText: 'union_by_name = ${1:true}',
              documentation: 'Match columns by name when reading multiple files.'
            },
            {
              label: 'filename = ...',
              insertText: 'filename = ${1:true}',
              documentation: 'Include source filename as an output column.'
            },
            {
              label: 'header = ...',
              insertText: 'header = ${1:true}',
              documentation: 'Treat first row as header row.'
            },
            {
              label: 'auto_detect = ...',
              insertText: 'auto_detect = ${1:true}',
              documentation: 'Automatically infer delimiter/types.'
            },
            {
              label: 'sample_size = ...',
              insertText: 'sample_size = ${1:20480}',
              documentation: 'Rows sampled for auto detection.'
            },
            {
              label: 'compression = ...',
              insertText: "compression = ${1|'auto','gzip','zstd','none'|}",
              documentation: 'Compression codec for input files.'
            }
          )
        }

        if (isDuckDbParquetArgsContext) {
          duckdbNamedArgs.push(
            {
              label: 'filename = ...',
              insertText: 'filename = ${1:true}',
              documentation: 'Include source filename as an output column.'
            },
            {
              label: 'union_by_name = ...',
              insertText: 'union_by_name = ${1:true}',
              documentation: 'Match columns by name when reading multiple files.'
            },
            {
              label: 'hive_partitioning = ...',
              insertText: 'hive_partitioning = ${1:true}',
              documentation: 'Read partition columns from Hive-style folder names.'
            },
            {
              label: 'compression = ...',
              insertText: "compression = ${1|'auto','gzip','zstd','none'|}",
              documentation: 'Compression codec for input files.'
            }
          )
        }

        if (isDuckDbJsonArgsContext) {
          duckdbNamedArgs.push(
            {
              label: 'filename = ...',
              insertText: 'filename = ${1:true}',
              documentation: 'Include source filename as an output column.'
            },
            {
              label: 'union_by_name = ...',
              insertText: 'union_by_name = ${1:true}',
              documentation: 'Match columns by name when reading multiple files.'
            },
            {
              label: 'maximum_object_size = ...',
              insertText: 'maximum_object_size = ${1:16777216}',
              documentation: 'Maximum JSON object size in bytes.'
            },
            {
              label: 'compression = ...',
              insertText: "compression = ${1|'auto','gzip','zstd','none'|}",
              documentation: 'Compression codec for input files.'
            }
          )
        }

        duckdbNamedArgs.forEach((arg) => {
          suggestions.push({
            label: arg.label,
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: arg.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            detail: 'DuckDB named parameter',
            documentation: arg.documentation,
            sortText: `00_ARG_${arg.label}`
          })
        })

        if (isDuckDbArgsAfterCommaContext) {
          suggestions.push({
            label: ')',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: ')',
            range,
            detail: 'Close function call',
            sortText: '00_ARG_CLOSE_PAREN'
          })
        }
      }

      // 3. Add Column Names (if schema available)
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

      // 4. Add SQL Functions
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
  const duckdbArgDocs: Record<string, string> = {
    union_by_name:
      '**union_by_name**\n\nMatch columns by name when scanning multiple files in `read_*` functions.',
    filename: '**filename**\n\nInclude source filename as an output column.',
    header: '**header**\n\nTreat first row as a header row for CSV input.',
    auto_detect: '**auto_detect**\n\nAutomatically infer delimiter and types for CSV input.',
    sample_size: '**sample_size**\n\nNumber of rows sampled for type inference.',
    compression: '**compression**\n\nCompression codec, e.g. `auto`, `gzip`, `zstd`, `none`.',
    hive_partitioning:
      '**hive_partitioning**\n\nExtract partition columns from Hive-style folder names.',
    maximum_object_size:
      '**maximum_object_size**\n\nMaximum JSON object size in bytes for JSON readers.'
  }

  return monaco.languages.registerHoverProvider(language, {
    provideHover: (
      model: MonacoTypes.editor.ITextModel,
      position: MonacoTypes.Position
    ): MonacoTypes.languages.Hover | null => {
      const word = model.getWordAtPosition(position)
      if (!word) return null

      const hoveredWord = word.word.toLowerCase()

      if (schemaContext?.dialect === 'sql' && duckdbArgDocs[hoveredWord]) {
        return {
          contents: [{ value: duckdbArgDocs[hoveredWord] }]
        }
      }

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
