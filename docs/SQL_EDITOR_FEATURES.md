# SQL Editor - Current Behavior (CodeMirror + backend SQL LSP)

## Overview

SQL editing in DBConvert Streams UI is powered by:
- **CodeMirror 6** as the editor UI layer
- **`sqls` via backend websocket** (`/api/v1/lsp/ws`) as SQL intelligence

This keeps SQL parsing/completion in backend LSP and avoids frontend SQL parser logic.

## What is currently implemented

### 1) SQL autocomplete

Manual trigger:
- `Ctrl+Space` invokes completion.

Context behavior:
- Table suggestions are expected after `FROM `.
- Column suggestions are expected after known table scope (for example `a.` where `a` is defined alias).
- In incomplete SQL contexts (for example `SELECT * fr`), suggestions can be limited; this is normal for LSP-first behavior.

### 1.1) SQL diagnostics

- LSP `textDocument/publishDiagnostics` messages are rendered as inline editor diagnostics.
- Severity mapping:
  - LSP `Error` -> editor `error`
  - LSP `Warning` -> editor `warning`
  - other severities -> editor `info`
- Diagnostics are cleared when LSP session is reconnected/disposed.

### 1.2) SQL hover

- Hover uses LSP `textDocument/hover`.
- Hover content is shown as a lightweight tooltip above the token/range.
- Hover shares the editor light/dark popup palette and is disabled automatically when LSP is unavailable.

### 2) SQL dialect-aware syntax highlighting

The editor configures SQL language mode by selected source dialect:
- MySQL
- PostgreSQL
- Generic SQL fallback

### 3) Selection and editor interaction

Supported:
- Mouse text selection
- Keyboard selection (`Ctrl+A` etc.)
- `Backspace`/typing edits with selection replacement

### 4) Keyboard shortcuts

| Shortcut                               | Action                                                  |
| -------------------------------------- | ------------------------------------------------------- |
| `Ctrl+Space` / `Cmd+Space`             | Trigger autocomplete manually                           |
| `F12`                                  | Go to definition (within current query buffer)          |
| `Ctrl+Shift+Space` / `Cmd+Shift+Space` | Trigger signature help manually                         |
| `Ctrl+Alt+F` / `Cmd+Alt+F`             | LSP format                                              |
| `Ctrl+Enter` / `Cmd+Enter`             | Execute query (if enabled in host surface)              |
| `Shift+Enter`                          | Execute query (alternative)                             |
| `Shift+Alt+F`                          | Format action callback                                  |
| `Ctrl+Shift+F` / `Cmd+Shift+F`         | Format action callback                                  |
| `Ctrl+F` / `Cmd+F`                     | Open built-in Find/Replace panel (CodeMirror search UI) |

### 4.1) Find/Replace panel (`Ctrl+F` / `Cmd+F`)

- Opens an inline editor panel with:
  - find input
  - next/previous/all matches
  - match case / regexp / whole-word toggles
  - replace / replace all actions

### 5) Theme integration

The SQL editor and completion popup are themed for both:
- Light theme
- Dark theme

Selection highlight and autocomplete colors are aligned to current app palette.

## Architecture notes

- SQL intelligence source is backend LSP process (`sqls`).
- Frontend does not implement a custom SQL parser/state machine for completions.
- Websocket auth for LSP uses existing API auth context and install metadata.
- SQL LSP enablement is context-driven (direct DB context present), not a user runtime toggle.

### DuckDB LSP route

- DuckDB contexts use backend route: `/api/v1/lsp/duckdb/ws`.
- This route does **not** spawn `sqls`; it handles JSON-RPC in Go using DuckDB driver.
- Supported context params include:
  - `file` + optional `format`
  - `connection_id` (can be repeated for federated metadata scope)
  - optional `connection_alias`

### Multi-source SQL conventions (DuckDB-native)

In multi-source mode, SQL naming follows DuckDB attached-catalog conventions.

- Root relation context (`FROM`, `JOIN`, `INTO`, `UPDATE`, `TABLE`) suggests:
  - selected source aliases
  - DuckDB file read functions (`read_csv_auto(`, `read_parquet(`, `read_json_auto(`, ...)
- System schemas are hidden from suggestions by default:
  - `information_schema`
  - `pg_catalog`
  - `pg_toast`

Dot navigation by source type:

- PostgreSQL (attached as alias `pg1`):
  - `pg1.` -> schemas (`public`, `private`, ...)
  - `pg1.public.` -> tables
  - `pg1.public.actor.` -> columns
  - Query shape: `alias.schema.table`
- MySQL (attached as alias `my1`):
  - `my1.` -> databases/schemas (`sakila`, ...)
  - `my1.sakila.` -> tables
  - `my1.sakila.actor.` -> columns
  - Query shape: `alias.database.table`
- File alias (for example `files1`):
  - `files1.` -> file-backed table/view or column scope (depending on object)

Important:

- Multi-source execution uses the same naming conventions as autocomplete.
- No hidden query rewriting should be required to execute valid suggested identifiers.
- If a suggestion is shown, its inserted form is expected to run as-is.

DuckDB references:

- PostgreSQL extension: <https://duckdb.org/docs/stable/core_extensions/postgres>
- MySQL extension: <https://duckdb.org/docs/stable/core_extensions/mysql>
- Multi-database `ATTACH` model: <https://duckdb.org/2024/01/26/multi-database-support-in-duckdb.html>

## Expected limitations (normal)

- No guarantee of rich suggestions in syntactically incomplete context.
- Column suggestions typically require table/alias scope.
- Behavior can differ slightly between SQL dialects because completions come from LSP engine.

## Smoke checklist (recommended before release)

1. `SELECT * FROM ` + `Ctrl+Space` -> table list appears.
2. `SELECT * FROM actor a WHERE a.` + `Ctrl+Space` -> column list appears.
3. Switch `Run on` database and repeat #1 -> list reflects selected DB.
4. Repeat completion + DB switching several times -> UI remains responsive.
5. Confirm selection visibility and editing behavior in both light/dark themes.

Multi-source checklist:

1. Run context: `Multi-source` with aliases `my1`, `pg1`, `files1`.
2. `SELECT * FROM ` + `Ctrl+Space` -> only aliases + `read_*` functions.
3. `SELECT * FROM pg1.` -> schemas (for example `public`), no `postgres` database hop.
4. `SELECT * FROM pg1.public.` -> PostgreSQL table list.
5. `SELECT * FROM my1.` -> MySQL database list (for example `sakila`).
6. `SELECT * FROM my1.sakila.` -> MySQL table list.
7. Execute:
   - `SELECT * FROM pg1.public.actor LIMIT 10;`
   - `SELECT * FROM my1.sakila.actor LIMIT 10;`
   - both succeed without manual identifier rewriting.

Quick regression command (unit scope):

```bash
yarn test:sql-lsp
```

## Troubleshooting

### No autocomplete at all

Check:
1. `SQL_LSP_COMMAND` points to valid `sqls` binary in current runtime.
2. Backend `/api/v1/lsp/ws` is reachable.
3. API logs contain LSP session activity (`LSP session start` / `LSP session closed`).
4. Optional deep trace is available via debug logs (`[lsp]` stderr bridge lines).

### UI responsive but completion empty

Possible reasons:
- incomplete query context
- selected DB has no relevant objects for context
- LSP is connected but cannot resolve expected scope

Use context-rich patterns (`FROM ...`, alias + `.`) to validate baseline behavior first.
