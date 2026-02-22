# Monaco + SQL Editor Consolidated Audit

Original date: February 18, 2026  
Last updated: February 19, 2026  
Scope: `dbconvert-streams-ui` + `dbconvert-stream` (`stream-api`, desktop runtime)

## 1. Executive Summary (Updated)

Current recommendation:
- Stop investing in Monaco SQL completion path.
- Keep backend SQL LSP (`sqls` over `/api/v1/lsp/ws`) as the intelligence backend.
- Migrate SQL editor UX from Monaco to CodeMirror 6.
- Remove Monaco from active UI code paths, including JSON editor/viewer surfaces.

Why this changed:
- LSP backend transport works.
- Direct LSP probes (`initialize` and `textDocument/completion`) work repeatedly.
- Desktop UI still freezes on Monaco completion trigger path (`Ctrl+Space`), even after multiple hardening passes.
- Practical bottleneck is Monaco + WebKit desktop integration in suggestion flow, not `sqls` itself.

## 2. What We Confirmed in Runtime

Validated during debugging:
- `stream-api` receives and serves LSP websocket sessions.
- `sqls` starts and handles DB cache/update cycles.
- Probe calls from UI to LSP succeed:
  - `initialize` success (multiple times)
  - `textDocument/completion` success with stable item counts

Observed failure mode:
- UI freeze reproduced when invoking Monaco completion path (`Ctrl+Space`) in SQL editor.
- Freeze is not reproduced by direct LSP websocket probes (without Monaco suggest widget).

Conclusion:
- Backend LSP path is healthy.
- Freeze is on Monaco-side completion interaction in desktop runtime.

## 3. Current Monaco SQL Status

What remains true:
- Monaco is fully removed from active UI editor/viewer paths.

What changed from original audit:
- Custom SQL provider code was removed.
- SQL editor surfaces were migrated to `SqlCodeMirror`.
- Monaco SQL editor component was removed from active code path.
- JSON editor/viewer surfaces were migrated off Monaco.
- Runtime LSP toggle path was removed; SQL LSP is always active when direct DB context is available.

## 4. LSP in Go Binaries: Status

Backend status:
- `GET /api/v1/lsp/ws` implemented.
- WS <-> stdio bridge implemented in `cmd/stream-api/lsp_ws_handler.go`.
- `sqls` command/args configurable via env:
  - `SQL_LSP_COMMAND`
  - `SQL_LSP_ARGS`
- WS auth query fallback is in place:
  - `api_key`
  - `install_id`

Desktop packaging:
- Current approach (LSP process managed by `stream-api`) is viable and already operational.
- Dedicated separate desktop-managed LSP service is not required for first production rollout.

## 5. Option Analysis (Revised)

### Option A: Continue Monaco SQL + LSP
Pros:
- No immediate editor rewrite.

Cons:
- Current completion path is unstable in desktop runtime.
- Additional fixes are increasingly low ROI and high uncertainty.

Verdict:
- Not recommended as primary direction.

### Option B: CodeMirror 6 for SQL (Recommended)
Pros:
- Clean break from current Monaco completion freeze path.
- Smaller/editor-focused integration surface for SQL.
- Can keep backend LSP architecture unchanged.

Cons:
- Requires SQL editor migration work (component + bindings + shortcuts).

Verdict:
- Recommended next step.

### Option C: Keep Monaco everywhere forever
Verdict:
- Rejected for SQL use case due to current production risk in desktop UX.

## 6. Migration Decision

Decision for next implementation cycle:
1. Clean temporary SQL LSP probe/debug UI code used for diagnosis.
2. Keep backend LSP implementation and transport.
3. Introduce CodeMirror 6 SQL editor path.
4. Wire CodeMirror SQL completion to backend LSP (same endpoint).
5. Switch SQL consoles/wizards to CodeMirror.
6. Migrate JSON editor/viewer paths off Monaco and remove Monaco dependencies/config.

Phase 0 status (2026-02-19):
- Completed: temporary SQL LSP probe UI controls removed.
- Completed: temporary backend LSP session debug logs removed.
- Completed: backend dead `dialect` parsing in LSP WS request struct removed.
- Completed: desktop runtime SQL LSP enable/disable env toggle removed (`DBCONVERT_STREAMS_DESKTOP_SQL_LSP_ENABLED` and injected `VITE_SQL_LSP_ENABLED`).

Phase 1-3 status snapshot (2026-02-19):
- Completed: `SqlCodeMirror` foundation (value binding, selection API, run/format shortcuts, theme, fill-parent).
- Completed: CodeMirror -> backend LSP completion path over `/api/v1/lsp/ws`.
- Completed: SQL surface migration in console pane and stream wizard custom query editor.
- Completed: read-only SQL block moved to CodeMirror.

Phase 4 status snapshot (2026-02-19):
- Completed: desktop freeze path moved away from Monaco SQL suggest flow by switching SQL surfaces to CodeMirror.
- Completed: selection and focus behavior hardened after screenshot/debug iterations (`closeOnBlur` restored for normal UX).
- Completed: editor/completion visuals aligned to current app light/dark palette.
- Completed: frontend metadata-refresh path for SQL autocomplete removed from `UnifiedConsoleTab` (LSP context-only flow).
- Completed: UI runtime LSP feature-toggle state removed from active SQL path.
- Completed: formal pre-commit smoke/regression pass for SQL LSP behavior (`docs/SQL_LSP_SMOKE_EXECUTION_REPORT_2026-02-19.md`).
- Completed: LSP diagnostics rendering in `SqlCodeMirror` via `textDocument/publishDiagnostics`.
- Completed: LSP hover integration in `SqlCodeMirror` via `textDocument/hover`.
- Completed: LSP websocket auto-reconnect (backoff) in `SqlCodeMirror` on unexpected close.
- Completed: `SqlCodeMirror` internals split into focused helper modules (`sqlCodeMirrorTypes`, `sqlCodeMirrorLspUtils`, `sqlCodeMirrorHoverUtils`) to reduce maintenance risk.
- Completed: SQL LSP regression command now includes CodeMirror LSP/hover utility unit tests.
- Completed: Monaco removed from JSON editor/viewer paths and build/dependency config.

## 7. Phase Plan (Updated)

### Phase 0: Cleanup before migration
- Remove temporary debug probe controls/messages added only for diagnosis.
- Keep only necessary production safeguards in LSP client/backend.
- Reconfirm no SQL provider files remain in active path.

### Phase 1: CodeMirror SQL foundation
- Create `CodeMirrorSqlEditor` with:
  - value binding
  - selection APIs
  - run/format shortcut parity
  - theme integration
  - fill-parent layout parity

### Phase 2: LSP integration for CodeMirror
- Reuse existing backend websocket endpoint.
- Implement completion request/response path without Monaco-specific provider APIs.
- Add hover/diagnostics only after completion path is stable.

### Phase 3: SQL surface migration
- Replace Monaco SQL component usage in:
  - SQL console editor pane
  - stream wizard custom query editor
  - other SQL entry points

### Phase 4: Stabilization
- Desktop smoke tests for:
  - open/close editor
  - source/database switching
  - completion invocation
  - run selected/run query
- Regression checks for shortcuts and focus behavior.

### Phase 4.1: SQL LSP smoke script (manual)

Use this script before merge/release in desktop + web dev:

1. `SELECT * FROM |` + `Ctrl+Space`
Expected: tables for selected DB.

2. `SELECT * FROM actor WHERE |` + `Ctrl+Space`
Expected: columns/keywords in current scope.

3. `SELECT * FROM actor a WHERE a.|` + `Ctrl+Space`
Expected: `actor` columns only.

4. `SELECT a.| FROM actor a` + `Ctrl+Space`
Expected: `actor` columns.

5. `SELECT COUNT(|) FROM actor` + `Ctrl+Space`
Expected: expression/context suggestions, no freeze.

6. `SELECT * FROM actor JOIN address ON actor.address_id = |` + `Ctrl+Space`
Expected: join-condition relevant suggestions.

7. `SELECT * fr|` + `Ctrl+Space`
Expected: no freeze; completion may be limited before valid `FROM` context.

8. Switch `Run on` to another DB, then `SELECT * FROM |` + `Ctrl+Space`
Expected: table list reflects new DB.

9. Repeat context switching 3-5 times (tab switch + DB switch + `Ctrl+Space`)
Expected: no dead UI/focus lock.

10. `Ctrl+A`, mouse selection, backspace/edit
Expected: selection visible in both themes; edit behavior intact.

Execution artifact:
- Use `docs/SQL_LSP_SMOKE_EXECUTION_REPORT_TEMPLATE.md` for each pre-merge/pre-release run.
- Fast unit regression command: `yarn test:sql-lsp`.

## 8. Remaining Decisions

- None.

Resolved on 2026-02-19:
- Hover formatting policy: keep markdown rendering with sanitized DOM output (including markdown table rendering) as default for SQL LSP hover in `SqlCodeMirror`.

Current working default:
- Release scope is completion + diagnostics + hover.

## 9. Source Pointers (Current)

UI:
- `src/components/codemirror/SqlCodeMirror.vue`
- `src/components/common/JsonConfigEditor.vue`
- `src/components/common/JsonViewer.vue`
- `src/composables/useSqlLspProviders.ts`
- `src/components/database/sql-console/SqlEditorPane.vue`
- `src/components/stream/wizard/CustomQueryEditor.vue`
- `src/components/database/SqlCodeBlock.vue`
- `src/components/console/UnifiedConsoleTab.vue`

Backend:
- `cmd/stream-api/router.go`
- `cmd/stream-api/lsp_ws_handler.go`

Desktop:
- `cmd/stream-desktop/supervisor.go`
- `cmd/stream-desktop/cleanup_linux.go`
- `cmd/stream-desktop/cleanup_windows.go`
