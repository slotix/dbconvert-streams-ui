import type { CompletionContext, TopKeywordRule } from '@/composables/useMonacoSqlProviders'

export function buildTopKeywordRules(dialect: 'mysql' | 'pgsql' | 'sql'): TopKeywordRule[] {
  const makeRule = (
    condition: TopKeywordRule['condition'],
    label: string,
    insertText: string,
    sortText: string,
    detail = 'SQL Keyword'
  ): TopKeywordRule => ({ condition, label, insertText, detail, sortText })

  const isWhereContinuation = (c: CompletionContext) => c.isAfterWhereClauseContext
  const isHavingContinuation = (c: CompletionContext) =>
    c.isHavingHeadContext || c.isAfterHavingClauseContext
  const isPredicateContext = (c: CompletionContext) =>
    c.isWhereHeadContext ||
    c.isAfterWhereClauseContext ||
    c.isHavingHeadContext ||
    c.isAfterHavingClauseContext ||
    c.isOnHeadContext ||
    c.isAfterOnClauseContext

  const fromJoinRules: TopKeywordRule[] = [
    ['INNER JOIN', 'INNER JOIN ', '00_INNER_JOIN'],
    ['LEFT JOIN', 'LEFT JOIN ', '00_LEFT_JOIN'],
    ['RIGHT JOIN', 'RIGHT JOIN ', '00_RIGHT_JOIN'],
    ['FULL JOIN', 'FULL JOIN ', '00_FULL_JOIN'],
    ['CROSS JOIN', 'CROSS JOIN ', '00_CROSS_JOIN'],
    ['JOIN', 'JOIN ', '00_JOIN']
  ].map(([label, insertText, sortText]) =>
    makeRule((c) => c.isAfterFromTableContext, label, insertText, sortText)
  )

  const onContinuationRules: TopKeywordRule[] = [
    ['AND', 'AND ', '00_AND_ON'],
    ['OR', 'OR ', '00_OR_ON'],
    ['INNER JOIN', 'INNER JOIN ', '00_ON_INNER_JOIN'],
    ['LEFT JOIN', 'LEFT JOIN ', '00_ON_LEFT_JOIN'],
    ['RIGHT JOIN', 'RIGHT JOIN ', '00_ON_RIGHT_JOIN'],
    ['FULL JOIN', 'FULL JOIN ', '00_ON_FULL_JOIN'],
    ['CROSS JOIN', 'CROSS JOIN ', '00_ON_CROSS_JOIN'],
    ['WHERE', 'WHERE ', '00_ON_WHERE'],
    ['GROUP BY', 'GROUP BY ', '00_ON_GROUP_BY'],
    ['ORDER BY', 'ORDER BY ', '00_ON_ORDER_BY']
  ].map(([label, insertText, sortText]) =>
    makeRule((c) => c.isAfterOnClauseContext, label, insertText, sortText)
  )

  const dropObjectRules: TopKeywordRule[] = [
    ['TABLE', 'TABLE ', '00_DROP_TABLE'],
    ['VIEW', 'VIEW ', '00_DROP_VIEW'],
    ['INDEX', 'INDEX ', '00_DROP_INDEX'],
    ['DATABASE', 'DATABASE ', '00_DROP_DATABASE'],
    ['SCHEMA', 'SCHEMA ', '00_DROP_SCHEMA']
  ].map(([label, insertText, sortText]) =>
    makeRule((c) => c.isDropHeadContext, label, insertText, sortText)
  )

  const createObjectRules: TopKeywordRule[] = [
    ['TABLE', 'TABLE ', '00_CREATE_TABLE'],
    ['VIEW', 'VIEW ', '00_CREATE_VIEW'],
    ['INDEX', 'INDEX ', '00_CREATE_INDEX'],
    ['DATABASE', 'DATABASE ', '00_CREATE_DATABASE'],
    ['SCHEMA', 'SCHEMA ', '00_CREATE_SCHEMA']
  ].map(([label, insertText, sortText]) =>
    makeRule((c) => c.isCreateHeadContext, label, insertText, sortText)
  )

  return [
    makeRule((c) => c.isSelectHeadContext, '*', '*', '00_*', 'All columns'),
    makeRule(
      (c) => c.isAfterSelectStarContext || c.isAfterSelectListContext,
      'FROM',
      'FROM ',
      '00_FROM'
    ),
    ...fromJoinRules,
    makeRule((c) => c.isAfterFromTableContext, 'WHERE', 'WHERE ', '00_WHERE'),
    makeRule(
      (c) => c.isAfterFromTableContext && c.hasAggregateFunction,
      'GROUP BY',
      'GROUP BY ',
      '00_GROUP_BY_FROM'
    ),
    makeRule((c) => c.isAfterFromTableContext, 'ORDER BY', 'ORDER BY ', '00_ORDER_BY_FROM'),
    makeRule((c) => c.isAfterJoinTableContext, 'ON', 'ON ', '00_ON'),
    makeRule(isWhereContinuation, 'AND', 'AND ', '00_AND'),
    makeRule(isWhereContinuation, 'OR', 'OR ', '00_OR'),
    makeRule(isWhereContinuation, 'LIMIT', 'LIMIT ', '00_LIMIT_WHERE'),
    makeRule(isWhereContinuation, 'ORDER BY', 'ORDER BY ', '00_ORDER_BY_WHERE'),
    makeRule(isWhereContinuation, 'GROUP BY', 'GROUP BY ', '00_GROUP_BY'),
    makeRule(
      (c) => c.isAfterWhereClauseContext && dialect === 'pgsql',
      'ILIKE',
      'ILIKE ',
      '00_ILIKE',
      'PostgreSQL Keyword'
    ),
    makeRule(
      (c) => c.isAfterWhereClauseContext && dialect === 'mysql',
      'REGEXP',
      'REGEXP ',
      '00_REGEXP',
      'MySQL Keyword'
    ),
    ...onContinuationRules,
    makeRule((c) => c.isGroupByHeadContext, 'ROLLUP(', 'ROLLUP(', '00_GROUP_BY_ROLLUP'),
    makeRule((c) => c.isGroupByHeadContext, 'CUBE(', 'CUBE(', '00_GROUP_BY_CUBE'),
    makeRule(
      (c) => c.isGroupByHeadContext,
      'GROUPING SETS (',
      'GROUPING SETS (',
      '00_GROUP_BY_GROUPING_SETS'
    ),
    makeRule((c) => c.isAfterGroupByClauseContext, 'ORDER BY', 'ORDER BY ', '00_ORDER_BY'),
    makeRule((c) => c.isAfterGroupByClauseContext, 'HAVING', 'HAVING ', '00_HAVING'),
    makeRule(isHavingContinuation, 'AND', 'AND ', '00_HAVING_AND'),
    makeRule(isHavingContinuation, 'OR', 'OR ', '00_HAVING_OR'),
    makeRule(isHavingContinuation, 'ORDER BY', 'ORDER BY ', '00_HAVING_ORDER_BY'),
    makeRule(isHavingContinuation, 'LIMIT', 'LIMIT ', '00_HAVING_LIMIT'),
    makeRule(
      (c) => c.isAfterGroupByClauseContext && dialect === 'mysql',
      'WITH ROLLUP',
      'WITH ROLLUP',
      '00_HAVING_WITH_ROLLUP',
      'MySQL Keyword'
    ),
    makeRule((c) => c.isAfterOrderByClauseContext, 'LIMIT', 'LIMIT ', '00_LIMIT'),
    makeRule((c) => c.isAfterLimitClauseContext, 'OFFSET', 'OFFSET ', '00_OFFSET'),
    makeRule((c) => c.isInsertHeadContext, 'INTO', 'INTO ', '00_INTO'),
    makeRule((c) => c.isInsertIntoHeadContext, 'VALUES', 'VALUES ', '00_VALUES_HEAD'),
    makeRule((c) => c.isAfterInsertIntoTableContext, '(', '(', '00_INSERT_COLUMNS', 'Column list'),
    makeRule(
      (c) => c.isAfterInsertIntoTableContext || c.isAfterInsertColumnsContext,
      'VALUES',
      'VALUES ',
      '00_VALUES'
    ),
    makeRule((c) => c.isValuesHeadContext, '(', '(', '00_VALUES_TUPLE', 'Values tuple'),
    makeRule((c) => c.isAfterUpdateTableContext, 'SET', 'SET ', '00_SET'),
    makeRule(
      (c) => c.isSetHeadContext || c.isAfterSetClauseContext,
      'WHERE',
      'WHERE ',
      '00_WHERE_UPDATE'
    ),
    makeRule((c) => c.isDeleteHeadContext, 'FROM', 'FROM ', '00_FROM_DELETE'),
    makeRule((c) => c.isDeleteFromHeadContext, 'WHERE', 'WHERE ', '00_WHERE_DELETE_HEAD'),
    makeRule((c) => c.isAfterDeleteFromTableContext, 'WHERE', 'WHERE ', '00_WHERE_DELETE'),
    ...dropObjectRules,
    makeRule((c) => c.isDropTableHeadContext, 'IF EXISTS', 'IF EXISTS ', '00_DROP_IF_EXISTS'),
    makeRule((c) => c.isAfterDropTableNameContext, 'CASCADE', 'CASCADE', '00_DROP_CASCADE'),
    makeRule((c) => c.isAfterDropTableNameContext, 'RESTRICT', 'RESTRICT', '00_DROP_RESTRICT'),
    ...createObjectRules,
    makeRule((c) => c.isAlterHeadContext, 'TABLE', 'TABLE ', '00_ALTER_TABLE'),
    makeRule(
      (c) => c.isAlterTableHeadContext,
      'ADD COLUMN',
      'ADD COLUMN ',
      '00_ALTER_TABLE_ADD_COLUMN'
    ),
    makeRule(
      (c) => c.isAfterAlterTableNameContext,
      'ADD COLUMN',
      'ADD COLUMN ',
      '00_ALTER_ADD_COLUMN'
    ),
    makeRule(
      (c) => c.isAfterAlterTableNameContext,
      'DROP COLUMN',
      'DROP COLUMN ',
      '00_ALTER_DROP_COLUMN'
    ),
    makeRule(
      (c) => c.isAfterAlterTableNameContext,
      'ALTER COLUMN',
      'ALTER COLUMN ',
      '00_ALTER_ALTER_COLUMN'
    ),
    makeRule(
      (c) => c.isAfterAlterTableNameContext,
      'RENAME COLUMN',
      'RENAME COLUMN ',
      '00_ALTER_RENAME_COLUMN'
    ),
    makeRule(
      (c) => c.isAfterAlterTableNameContext,
      'RENAME TO',
      'RENAME TO ',
      '00_ALTER_RENAME_TO'
    ),
    makeRule((c) => c.isTruncateHeadContext, 'TABLE', 'TABLE ', '00_TRUNCATE_TABLE'),
    makeRule(
      (c) => c.isTruncateTableHeadContext && dialect === 'pgsql',
      'ONLY',
      'ONLY ',
      '00_TRUNCATE_ONLY',
      'PostgreSQL Keyword'
    ),
    makeRule((c) => c.isWithHeadContext, 'RECURSIVE', 'RECURSIVE ', '00_WITH_RECURSIVE'),
    makeRule((c) => c.isAfterWithCteNameContext, 'AS', 'AS ', '00_WITH_AS'),
    makeRule((c) => c.isAfterWithCteAsContext, '(', '(', '00_WITH_BODY', 'CTE body'),
    makeRule((c) => c.isAfterWithCteBodyContext, ',', ', ', '00_WITH_NEXT_CTE', 'Next CTE'),
    makeRule((c) => c.isAfterWithCteBodyContext, 'SELECT', 'SELECT ', '00_WITH_SELECT'),
    makeRule((c) => c.isAfterWithCteBodyContext, 'INSERT', 'INSERT ', '00_WITH_INSERT'),
    makeRule((c) => c.isAfterWithCteBodyContext, 'UPDATE', 'UPDATE ', '00_WITH_UPDATE'),
    makeRule((c) => c.isAfterWithCteBodyContext, 'DELETE', 'DELETE ', '00_WITH_DELETE'),
    makeRule((c) => c.isAfterSelectTailContext, 'UNION', 'UNION ', '00_UNION'),
    makeRule((c) => c.isAfterSelectTailContext, 'UNION ALL', 'UNION ALL ', '00_UNION_ALL'),
    makeRule(
      (c) => c.isAfterUnionHeadContext || c.isAfterUnionAllHeadContext,
      'SELECT',
      'SELECT ',
      '00_UNION_SELECT'
    ),
    makeRule(
      (c) => c.isAfterWithCteBodyCommaContext,
      'cte_name AS (',
      'cte_name AS (',
      '00_WITH_CHAIN_CTE',
      'CTE chain'
    ),
    makeRule((c) => c.isAfterWithCteChainNameContext, 'AS', 'AS ', '00_WITH_CHAIN_AS'),
    makeRule((c) => c.isAfterWithCteChainAsContext, '(', '(', '00_WITH_CHAIN_BODY', 'CTE body'),
    makeRule(isPredicateContext, 'IN', 'IN ', '00_IN'),
    makeRule(isPredicateContext, 'EXISTS', 'EXISTS ', '00_EXISTS'),
    makeRule(isPredicateContext, 'NOT EXISTS', 'NOT EXISTS ', '00_NOT_EXISTS'),
    makeRule(
      (c) => c.isAfterInsertValuesTupleContext && dialect === 'pgsql',
      'ON CONFLICT',
      'ON CONFLICT ',
      '00_ON_CONFLICT',
      'PostgreSQL Keyword'
    ),
    makeRule(
      (c) => c.isAfterInsertValuesTupleContext && dialect === 'mysql',
      'ON DUPLICATE KEY',
      'ON DUPLICATE KEY ',
      '00_ON_DUPLICATE_KEY',
      'MySQL Keyword'
    ),
    makeRule(
      (c) => c.isOnConflictHeadContext,
      '(',
      '(',
      '00_ON_CONFLICT_TARGET',
      'Conflict target'
    ),
    makeRule(
      (c) => c.isAfterOnConflictTargetContext,
      'DO NOTHING',
      'DO NOTHING',
      '00_DO_NOTHING',
      'PostgreSQL Keyword'
    ),
    makeRule(
      (c) => c.isAfterOnConflictTargetContext,
      'DO UPDATE',
      'DO UPDATE ',
      '00_DO_UPDATE',
      'PostgreSQL Keyword'
    ),
    makeRule((c) => c.isDoUpdateHeadContext, 'SET', 'SET ', '00_DO_UPDATE_SET'),
    makeRule(
      (c) => c.isOnDuplicateKeyHeadContext,
      'UPDATE',
      'UPDATE ',
      '00_DUPLICATE_UPDATE',
      'MySQL Keyword'
    ),
    makeRule((c) => c.isMergeHeadContext, 'INTO', 'INTO ', '00_MERGE_INTO'),
    makeRule((c) => c.isAfterMergeIntoTableContext, 'USING', 'USING ', '00_MERGE_USING'),
    makeRule((c) => c.isAfterMergeUsingTableContext, 'ON', 'ON ', '00_MERGE_ON'),
    makeRule(
      (c) => c.isAfterMergeOnClauseContext,
      'WHEN MATCHED THEN',
      'WHEN MATCHED THEN ',
      '00_MERGE_WHEN_MATCHED'
    ),
    makeRule(
      (c) => c.isAfterMergeOnClauseContext,
      'WHEN NOT MATCHED THEN',
      'WHEN NOT MATCHED THEN ',
      '00_MERGE_WHEN_NOT_MATCHED'
    ),
    makeRule(
      (c) => c.isMergeWhenMatchedThenContext,
      'UPDATE',
      'UPDATE ',
      '00_MERGE_MATCHED_UPDATE'
    ),
    makeRule(
      (c) => c.isMergeWhenMatchedThenContext,
      'DELETE',
      'DELETE ',
      '00_MERGE_MATCHED_DELETE'
    ),
    makeRule((c) => c.isMergeUpdateHeadContext, 'SET', 'SET ', '00_MERGE_MATCHED_SET'),
    makeRule(
      (c) => c.isMergeWhenNotMatchedThenContext,
      'INSERT',
      'INSERT ',
      '00_MERGE_NOT_MATCHED_INSERT'
    ),
    makeRule((c) => c.isMergeInsertHeadContext, '(', '(', '00_MERGE_INSERT_COLUMNS', 'Column list'),
    makeRule(
      (c) => c.isAfterMergeInsertColumnsContext,
      'VALUES',
      'VALUES ',
      '00_MERGE_INSERT_VALUES'
    ),
    makeRule(
      (c) => c.isMergeInsertValuesHeadContext,
      '(',
      '(',
      '00_MERGE_INSERT_VALUES_TUPLE',
      'Values tuple'
    ),
    makeRule((c) => c.isOverHeadContext, '(', '(', '00_OVER_OPEN', 'Window specification'),
    makeRule(
      (c) => c.isOverOpenParenContext,
      'PARTITION BY',
      'PARTITION BY ',
      '00_OVER_PARTITION_BY'
    ),
    makeRule((c) => c.isOverOpenParenContext, 'ORDER BY', 'ORDER BY ', '00_OVER_ORDER_BY'),
    makeRule((c) => c.isWindowOrderByInOverContext, 'ROWS', 'ROWS ', '00_OVER_ROWS'),
    makeRule((c) => c.isWindowOrderByInOverContext, 'RANGE', 'RANGE ', '00_OVER_RANGE'),
    makeRule(
      (c) => c.isWindowOrderByInOverContext && dialect === 'pgsql',
      'GROUPS',
      'GROUPS ',
      '00_OVER_GROUPS',
      'PostgreSQL Keyword'
    ),
    makeRule(
      (c) => c.isRowsHeadContext || c.isRangeHeadContext || c.isGroupsHeadContext,
      'BETWEEN',
      'BETWEEN ',
      '00_OVER_FRAME_BETWEEN'
    ),
    makeRule(
      (c) => c.isRowsHeadContext || c.isRangeHeadContext || c.isGroupsHeadContext,
      'CURRENT ROW',
      'CURRENT ROW',
      '00_OVER_FRAME_CURRENT'
    ),
    makeRule(
      (c) =>
        c.isRowsBetweenHeadContext || c.isRangeBetweenHeadContext || c.isGroupsBetweenHeadContext,
      'UNBOUNDED PRECEDING',
      'UNBOUNDED PRECEDING',
      '00_OVER_FRAME_START_UNBOUNDED_PRECEDING'
    ),
    makeRule(
      (c) =>
        c.isRowsBetweenHeadContext || c.isRangeBetweenHeadContext || c.isGroupsBetweenHeadContext,
      'CURRENT ROW',
      'CURRENT ROW',
      '00_OVER_FRAME_START_CURRENT'
    ),
    makeRule(
      (c) => c.isWindowFrameAndHeadContext,
      'CURRENT ROW',
      'CURRENT ROW',
      '00_OVER_FRAME_END_CURRENT'
    ),
    makeRule(
      (c) => c.isWindowFrameAndHeadContext,
      'UNBOUNDED FOLLOWING',
      'UNBOUNDED FOLLOWING',
      '00_OVER_FRAME_END_UNBOUNDED_FOLLOWING'
    ),
    makeRule(
      (c) => c.isWindowFrameEndContext && dialect === 'pgsql',
      'EXCLUDE',
      'EXCLUDE ',
      '00_OVER_EXCLUDE',
      'PostgreSQL Keyword'
    ),
    makeRule(
      (c) => c.isExcludeHeadContext,
      'CURRENT ROW',
      'CURRENT ROW',
      '00_OVER_EXCLUDE_CURRENT_ROW',
      'PostgreSQL Keyword'
    ),
    makeRule(
      (c) => c.isExcludeHeadContext,
      'GROUP',
      'GROUP',
      '00_OVER_EXCLUDE_GROUP',
      'PostgreSQL Keyword'
    ),
    makeRule(
      (c) => c.isExcludeHeadContext,
      'TIES',
      'TIES',
      '00_OVER_EXCLUDE_TIES',
      'PostgreSQL Keyword'
    ),
    makeRule(
      (c) => c.isExcludeHeadContext,
      'NO OTHERS',
      'NO OTHERS',
      '00_OVER_EXCLUDE_NO_OTHERS',
      'PostgreSQL Keyword'
    ),
    makeRule((c) => c.isCaseHeadContext, 'WHEN', 'WHEN ', '00_CASE_WHEN'),
    makeRule((c) => c.isAfterCaseThenClauseContext, 'WHEN', 'WHEN ', '00_CASE_NEXT_WHEN'),
    makeRule((c) => c.isAfterCaseThenClauseContext, 'ELSE', 'ELSE ', '00_CASE_ELSE'),
    makeRule(
      (c) => c.isAfterCaseThenClauseContext || c.isElseHeadContext,
      'END',
      'END',
      '00_CASE_END'
    )
  ]
}
