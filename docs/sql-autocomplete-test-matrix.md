# SQL Autocomplete Test Matrix (CodeMirror + SQL LSP)

Purpose: stable regression checklist for SQL completion behavior in current editor architecture:
- editor: CodeMirror 6
- intelligence: backend `sqls` over `/api/v1/lsp/ws`

## 1) Baseline Completion Availability

| Input (cursor at end) | Action | Expected |
| --- | --- | --- |
| `SELECT * FROM ` | `Ctrl+Space` | Table suggestions for selected DB |
| `SELECT * FROM actor a WHERE a.` | `Ctrl+Space` | `actor` columns |
| `SELECT a. FROM actor a` (cursor after `a.`) | `Ctrl+Space` | `actor` columns |

## 2) Incomplete Query Context (No Freeze)

| Input (cursor at end) | Action | Expected |
| --- | --- | --- |
| `SELECT * fr` | `Ctrl+Space` | UI responsive; completion may be limited |
| `SELECT COUNT(` | `Ctrl+Space` | UI responsive; context suggestions may vary |
| `SELECT * FROM actor WHERE ` | `Ctrl+Space` | UI responsive; suggestions available or empty, but no lock/freeze |

## 3) Source/Database Switching

| Scenario | Expected |
| --- | --- |
| Switch `Run on` DB, then `SELECT * FROM ` + `Ctrl+Space` | Suggestions reflect newly selected DB |
| Repeat tab switch + DB switch + completion 3-5 times | No dead UI/focus lock |

## 4) Selection/Edit Behavior

| Action | Expected |
| --- | --- |
| `Ctrl+A` in SQL editor | Selection clearly visible in active theme |
| Mouse drag selection | Selection clearly visible |
| Backspace/delete/replace selected text | Normal editing behavior |

## 5) Theme Consistency

| Theme | Expected |
| --- | --- |
| Dark | Editor background, caret, selection, and completion popup are readable and consistent with app palette |
| Light | Same as above with light palette |

## 6) LSP Session Health Verification

Check API logs while testing:

```bash
tail -f ~/.local/share/dbconvert-streams/logs/api.log | rg --line-buffered "LSP session start|LSP session closed"
```

Expected:
- session start/closed entries appear when editor establishes/tears down LSP websocket
- no repeated rapid reconnect loops during normal typing

Optional deep trace (if debug log level is enabled):
- `[lsp]` lines from bridged `sqls` stderr

## 7) Execution Script

Use and attach execution artifact:
- `docs/SQL_LSP_SMOKE_EXECUTION_REPORT_TEMPLATE.md`

Run this matrix before merge/release in desktop and web dev environments.

Latest execution:
- `docs/SQL_LSP_SMOKE_EXECUTION_REPORT_2026-02-19.md`
