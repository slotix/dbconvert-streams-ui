# SQL Autocomplete Test Matrix

Purpose: provide a stable regression checklist for Monaco SQL completion behavior across run modes, schema states, and dialects.

## 1) Core Clause Transitions

### 1.1 SELECT head/list transitions

| Input (cursor at end) | Expected top suggestion(s) |
| --------------------- | -------------------------- |
| `SELECT `             | `*`                        |
| `SELECT DISTINCT `    | `*`                        |
| `SELECT * `           | `FROM`                     |
| `SELECT col1, col2 `  | `FROM`                     |
| `SELECT col1, `       | no forced `FROM`           |

### 1.2 FROM/JOIN transitions

| Input                              | Expected top suggestion(s) |
| ---------------------------------- | -------------------------- |
| `SELECT * FROM users `             | `JOIN`, `WHERE`            |
| `SELECT * FROM users JOIN orders ` | `ON`                       |

### 1.3 Predicate/Aggregation transitions

| Input                                             | Expected top suggestion(s) |
| ------------------------------------------------- | -------------------------- |
| `SELECT * FROM users WHERE id > 10 `              | `GROUP BY`                 |
| `SELECT city, COUNT(*) FROM users GROUP BY city ` | `ORDER BY`, `HAVING`       |
| `SELECT city FROM users ORDER BY city `           | `LIMIT`                    |
| `SELECT city FROM users ORDER BY city LIMIT 10 `  | `OFFSET`                   |

## 2) Suggestion Priority Rules

Validate ordering in visible completion list:

1. Context transition keywords (forced top rules)
2. Columns/tables from schema context
3. Generic SQL keywords
4. SQL functions
5. Snippets

## 3) Source Scope Behavior

### 3.1 Direct source mode (`Run on: Database: <alias>`)

| Scenario                          | Expected                                            |
| --------------------------------- | --------------------------------------------------- |
| PostgreSQL direct source selected | only selected PG source tables/columns suggested    |
| MySQL direct source selected      | only selected MySQL source tables/columns suggested |

### 3.2 Multi-source mode (`Run on: Multi-source`)

| Scenario                        | Expected                                                                                              |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `pg1`, `my1`, `files1` selected | schema suggestions include DB sources (`pg1`, `my1`), file source excluded from table/column metadata |
| Typing `pg1.`                   | pg1-qualified table/column suggestions appear                                                         |
| Typing `my1.`                   | my1-qualified table/column suggestions appear                                                         |

## 4) Metadata Availability Cases

| Scenario                                | Expected                                                                            |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| schema metadata present                 | table/column suggestions appear and rank above generic keywords/functions           |
| schema metadata missing                 | no crashes, contextual keyword transitions still work                               |
| source mapping has no explicit database | no invalid fallback guessing; DB suggestions remain empty until mapping is explicit |

## 5) Dialect Baseline Coverage

Confirm baseline behavior per dialect parameter:

| Dialect | Validate                                                                               |
| ------- | -------------------------------------------------------------------------------------- |
| `mysql` | identifier quoting with backticks where applicable; MySQL functions/keywords available |
| `pgsql` | PostgreSQL-specific functions/keywords available                                       |
| `sql`   | generic SQL keyword/function set remains usable                                        |

## 6) Manual Regression Script

Run each sequence in SQL console after opening a fresh tab:

1. `SELECT `
2. `SELECT * `
3. `SELECT id, name `
4. `SELECT * FROM users `
5. `SELECT * FROM users JOIN orders `
6. `SELECT * FROM users WHERE id > 10 `
7. `SELECT city, COUNT(*) FROM users GROUP BY city `
8. `SELECT city FROM users ORDER BY city `
9. `SELECT city FROM users ORDER BY city LIMIT 10 `

For each step, confirm top suggestions match sections 1 and 2.

## 7) Debug Mode (Optional)

Enable completion diagnostics in browser devtools:

```js
localStorage.setItem('sqlCompletionDebug', '1')
```

Disable:

```js
localStorage.removeItem('sqlCompletionDebug')
```

Use logs to verify active context flags and suggestion counts while running matrix scenarios.

## 8) Validation Status

Automated validation (2026-02-17):

- Context rule presence verified in `useMonacoSqlProviders.ts` for: `*`, `FROM`, `JOIN`, `ON`, `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`, `OFFSET`, plus dialect keywords `ILIKE` (pgsql) and `REGEXP` (mysql).
- Completion context flags verified in code for all clause states listed in section 1.
- Error check for modified files completed with no current diagnostics in:
	- `src/composables/useMonacoSqlProviders.ts`
	- `src/components/console/UnifiedConsoleTab.vue`

Manual UX validation remains required for final sign-off:

- Execute section 6 scenarios in UI for both direct and multi-source modes.
- Confirm top suggestion ordering in section 2 under real metadata latency conditions.
