# SQL Console Multi-Source Flow

## Scope

This document defines the SQL console flow for:
- single-source database queries
- federated (multi-source) queries in DuckDB mode
- explicit transition rules between them

## Core principles

1. No hidden SQL rewrites.
2. Source selection drives execution mode.
3. Suggestions must match executable SQL naming.
4. User actions must be explicit and predictable.

## Flow

### 1) Start in single-source mode

- User opens a table/view from Explorer tree via `Open in SQL Console`.
- A new SQL console session opens.
- Starter query is prefilled from selected object:
  - `SELECT * FROM <table> LIMIT 100;`
  - or `SELECT * FROM <schema>.<table> LIMIT 100;` when schema is known.
- No alias is required at this stage.

### 2) Add sources in Query Session

- User opens `Query Session` drawer and enables additional sources.
- Each enabled source has an alias (for example `my1`, `pg1`, `files1`).
- When selected sources become `> 1`, behavior transitions to federated mode automatically.

Note: this is already the promote step. There is no separate manual `Promote` control.

### 3) Execution context

Execution mode is determined only by selected source count:
- exactly `1` source -> `single` mode
- more than `1` source -> `Multi-source` mode

No per-connection execution dropdown is shown in `Multi-source` mode.
When multiple sources are selected, SQL view always uses DuckDB LSP context for the active session.

### 4) SQL stays unchanged on promote

- Existing SQL is not rewritten when additional sources are enabled.
- This prevents hidden query mutation during mode transitions.

Demote rule:
- if selected sources drop from `2` to `1`, mode demotes automatically back to `single`.

### 5) Optional explicit rewrite

For starter table queries in federated mode, UI may show:
- `Rewrite starter SQL to federated naming`

Rewrite rules:
- MySQL origin: `alias.database.table` (example: `my1.sakila.actor`)
- PostgreSQL origin: `alias.schema.table` (example: `pg1.public.actor`)

Rewrite is manual and user-triggered.

## Autocomplete in federated mode

Root relation positions (`FROM`, `JOIN`, `INTO`, `UPDATE`, `TABLE`) should show:
- selected aliases
- DuckDB `read_*` functions

System schemas are hidden by default:
- `information_schema`
- `pg_catalog`
- `pg_toast`

Dot-navigation expectations:
- PostgreSQL alias `pg1`:
  - `pg1.` -> schemas
  - `pg1.public.` -> tables
  - `pg1.public.actor.` -> columns
- MySQL alias `my1`:
  - `my1.` -> databases
  - `my1.sakila.` -> tables
  - `my1.sakila.actor.` -> columns

## SQL naming conventions

- PostgreSQL attached catalog: `alias.schema.table`
- MySQL attached catalog: `alias.database.table`
- File sources: use DuckDB file functions and/or file alias conventions from current session

Suggestions and execution must use the same naming model.
In multi-source mode, alias-qualified references are required for table relations.

## Real examples (`my1`, `pg1`, `files1`)

### A) Start from tree (single-source)

User opens `actor` table from MySQL tree (`my1 -> sakila -> actor`):

```sql
SELECT * FROM actor LIMIT 100;
```

or (when schema/database-qualified by origin):

```sql
SELECT * FROM sakila.actor LIMIT 100;
```

### B) Add second source (auto-promote to multi-source)

After enabling `pg1` (and optionally `files1`) in Query Session:

- Existing SQL remains unchanged until user edits or applies explicit rewrite.
- Optional explicit rewrite for MySQL starter query:

```sql
SELECT * FROM my1.sakila.actor LIMIT 100;
```

For PostgreSQL starter query (`public.actor`), explicit rewrite:

```sql
SELECT * FROM pg1.public.actor LIMIT 100;
```

### C) Federated reads by alias

MySQL:

```sql
SELECT * FROM my1.sakila.film LIMIT 10;
```

PostgreSQL:

```sql
SELECT * FROM pg1.public.actor LIMIT 10;
```

### D) Cross-source join (MySQL + PostgreSQL)

```sql
SELECT p.first_name, p.last_name, m.title
FROM my1.sakila.film AS m
JOIN pg1.public.film_actor AS fa ON m.film_id = fa.film_id
JOIN pg1.public.actor AS p ON p.actor_id = fa.actor_id
WHERE m.title = 'ACE GOLDFINGER';
```

### E) File source usage (`files1`)

Root completion includes `read_*` functions. Example:

```sql
SELECT *
FROM read_csv_auto('./part-0-001.csv')
LIMIT 50;
```

If file source is exposed via alias/table in session metadata, use suggested alias path from autocomplete.

## Anti-examples (what not to use)

These forms are intentionally not part of the supported federated naming flow:

| Source type | Correct shape | Common wrong shape |
| --- | --- | --- |
| PostgreSQL | `alias.schema.table` (example: `pg1.public.actor`) | `alias.database.schema.table` (example: `pg1.postgres.public.actor`) |
| MySQL | `alias.database.table` (example: `my1.sakila.actor`) | `alias.table` (example: `my1.actor`) |
| Starter query migration | Explicit rewrite action when needed | Expecting automatic SQL text rewrite after adding sources |

- PostgreSQL with extra database hop:

```sql
SELECT * FROM pg1.postgres.public.actor;
```

Why not:
- PostgreSQL federated naming in this flow is `alias.schema.table`.
- Correct form:

```sql
SELECT * FROM pg1.public.actor;
```

- MySQL without database segment:

```sql
SELECT * FROM my1.actor;
```

Why not:
- MySQL federated naming in this flow is `alias.database.table`.
- Correct form:

```sql
SELECT * FROM my1.sakila.actor;
```

- Assuming auto-rewrite after adding sources:

```sql
-- source was added, expecting SQL text to change automatically
SELECT * FROM actor LIMIT 100;
```

Why not:
- SQL text is not mutated implicitly on promote to multi-source.
- Use explicit action `Rewrite starter SQL to federated naming` when needed.
