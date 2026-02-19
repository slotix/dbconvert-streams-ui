# SQL LSP Smoke Execution Report

## Metadata

- Date: 2026-02-19
- Tester: dm3
- Environment: `desktop-dev`
- OS: Linux
- App/UI commit: `6bfa496`
- Backend commit: `1657777b`
- SQL LSP binary path (`SQL_LSP_COMMAND`): bundled `bin/linux-amd64/sqls`

## Preconditions

- [x] UI starts without critical errors.
- [x] Backend `/api/v1/lsp/ws` is reachable.
- [x] SQL LSP process starts successfully (no `sqls not found`).

## Test Matrix (Phase 4.1)

| # | Scenario | Expected | Result (Pass/Fail) | Notes |
|---|----------|----------|--------------------|-------|
| 1 | `SELECT * FROM |` + `Ctrl+Space` | tables for selected DB | Pass | table suggestions returned |
| 2 | `SELECT * FROM actor WHERE |` + `Ctrl+Space` | columns/keywords in scope | Pass | context suggestions present |
| 3 | `SELECT * FROM actor a WHERE a.|` + `Ctrl+Space` | `actor` columns only | Pass | alias-scope completion works |
| 4 | `SELECT a.| FROM actor a` + `Ctrl+Space` | `actor` columns | Pass | alias-scope completion works |
| 5 | `SELECT COUNT(|) FROM actor` + `Ctrl+Space` | expression/context suggestions | Pass | no freeze |
| 6 | `SELECT * FROM actor JOIN address ON actor.address_id = |` + `Ctrl+Space` | join-condition suggestions | Pass | no freeze |
| 7 | `SELECT * fr|` + `Ctrl+Space` | no freeze; completion may be limited | Pass | no freeze; limited suggestions is acceptable |
| 8 | switch `Run on` DB, then `SELECT * FROM |` + `Ctrl+Space` | list reflects selected DB | Pass | source switch reflected in results |
| 9 | 3-5 cycles: tab switch + DB switch + `Ctrl+Space` | no dead UI/focus lock | Pass | no dead UI reproduced |
| 10 | `Ctrl+A`, mouse selection, backspace/edit | selection visible, editing works | Pass | selection/edit behavior stable |

## Observed Issues

| Severity | Area | Repro | Notes |
|----------|------|-------|-------|
| Low | completion UX | case #7 | limited suggestions in invalid partial syntax (`fr`) are acceptable for current release scope |

## Final Status

- Overall: `PASS`
- Blocking issues: none
- Follow-ups: none for completion-first rollout
