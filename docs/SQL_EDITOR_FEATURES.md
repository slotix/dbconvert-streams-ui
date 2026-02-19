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

| Shortcut | Action |
|----------|--------|
| `Ctrl+Space` | Trigger autocomplete manually |
| `Ctrl+Enter` / `Cmd+Enter` | Execute query (if enabled in host surface) |
| `Shift+Enter` | Execute query (alternative) |
| `Shift+Alt+F` | Format action callback |
| `Ctrl+Shift+F` / `Cmd+Shift+F` | Format action callback |

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

## Expected limitations (normal)

- No guarantee of rich suggestions in syntactically incomplete context.
- Column suggestions typically require table/alias scope.
- Behavior can differ slightly between SQL dialects because completions come from LSP engine.
- Hover tooltips are not enabled yet (next phase item).

## Smoke checklist (recommended before release)

1. `SELECT * FROM ` + `Ctrl+Space` -> table list appears.
2. `SELECT * FROM actor a WHERE a.` + `Ctrl+Space` -> column list appears.
3. Switch `Run on` database and repeat #1 -> list reflects selected DB.
4. Repeat completion + DB switching several times -> UI remains responsive.
5. Confirm selection visibility and editing behavior in both light/dark themes.

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
