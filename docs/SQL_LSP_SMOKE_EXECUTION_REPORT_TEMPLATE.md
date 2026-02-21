# SQL LSP Smoke Execution Report Template

Use this report for every pre-merge/pre-release SQL editor validation pass.

## Metadata

- Date:
- Tester:
- Environment: `desktop-dev` / `desktop-build` / `web-dev`
- OS:
- App/UI commit:
- Backend commit:
- SQL LSP binary path (`SQL_LSP_COMMAND`):

## Preconditions

- [ ] UI starts without critical errors.
- [ ] Backend `/api/v1/lsp/ws` is reachable.
- [ ] SQL LSP process starts successfully (no `sqls not found`).

## Test Matrix (Phase 4.1)

| # | Scenario | Expected | Result (Pass/Fail) | Notes |
|---|----------|----------|--------------------|-------|
| 1 | `SELECT * FROM |` + `Ctrl+Space` | tables for selected DB |  |  |
| 2 | `SELECT * FROM actor WHERE |` + `Ctrl+Space` | columns/keywords in scope |  |  |
| 3 | `SELECT * FROM actor a WHERE a.|` + `Ctrl+Space` | `actor` columns only |  |  |
| 4 | `SELECT a.| FROM actor a` + `Ctrl+Space` | `actor` columns |  |  |
| 5 | `SELECT COUNT(|) FROM actor` + `Ctrl+Space` | expression/context suggestions |  |  |
| 6 | `SELECT * FROM actor JOIN address ON actor.address_id = |` + `Ctrl+Space` | join-condition suggestions |  |  |
| 7 | `SELECT * fr|` + `Ctrl+Space` | no freeze; completion may be limited |  |  |
| 8 | add/remove sources in Query Session, then `SELECT * FROM |` + `Ctrl+Space` | list reflects active mode context |  |  |
| 9 | 3-5 cycles: tab switch + source changes + `Ctrl+Space` | no dead UI/focus lock |  |  |
| 10 | `Ctrl+A`, mouse selection, backspace/edit | selection visible, editing works |  |  |
| 11 | hover known token in valid query context | hover tooltip appears; no freeze |  |  |

## Observed Issues

| Severity | Area | Repro | Notes |
|----------|------|-------|-------|
|  |  |  |  |

## Final Status

- Overall: `PASS` / `FAIL`
- Blocking issues:
- Follow-ups:
