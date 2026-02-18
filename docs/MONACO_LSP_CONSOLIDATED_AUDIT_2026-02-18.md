# Monaco + SQL Editor Consolidated Audit

Date: February 18, 2026
Scope: `dbconvert-streams-ui` + `dbconvert-stream` (`stream-api`, `stream-desktop`)

## 1. Executive Summary

Current recommendation:
- Keep Monaco for now.
- Move SQL intelligence from custom frontend logic to LSP-backed backend.
- Do not migrate to CodeMirror/Ace before LSP extraction, unless bundle size remains a hard blocker after LSP rollout.

Why:
- Monaco is used, but mostly for core editor primitives.
- The real complexity/debt is custom SQL intelligence in frontend (`useMonacoSqlProviders.ts`), not the editor widget itself.
- Replacing Monaco now is high rewrite cost with moderate practical gain.

## 2. What Monaco Is Actually Used For

Used in code:
- Editor lifecycle and model operations (`create`, `getValue`, `executeEdits`): `src/components/monaco/MonacoEditor.vue`
- Selection and shortcuts (Ctrl/Cmd+Enter, Shift+Enter, format hotkeys): `src/components/monaco/SqlMonaco.vue`
- Content/focus/resize listeners: `src/components/monaco/MonacoEditor.vue`, `src/components/monaco/SqlMonaco.vue`
- Custom context menu: `src/components/monaco/MonacoEditor.vue`
- SQL completion + hover providers (custom): `src/composables/useMonacoSqlProviders.ts`
- Theme/language switching: `src/components/monaco/MonacoEditor.vue`
- JSON schema diagnostics: `src/components/monaco/JsonEditor.vue`
- JSON fold action: `src/components/monaco/JsonViewer.vue`

Not used:
- Custom marker diagnostics pipeline (`setModelMarkers`, `IMarkerData`) for SQL runtime errors
- Monaco diff editor
- Definition/reference/rename/code actions providers for SQL
- LSP integration

## 3. SQL Intelligence Debt (Main Finding)

`src/composables/useMonacoSqlProviders.ts` is 1018 lines and implements:
- regex/context parsing
- suggestion ranking and context heuristics
- table/column/function/snippet logic
- hover docs

Associated test surface:
- `src/__tests__/useMonacoSqlProvidersDialect.test.ts` (970 lines)

This is effectively a hand-rolled mini SQL language service in TypeScript.

## 4. Bundle/Asset Reality

Observed in `dist/assets` (current local build):
- `monaco-editor-*.js`: ~3.82 MB raw / ~986 KB gzip
- `monaco-editor-*.css`: ~147 KB raw / ~23 KB gzip
- `json.worker-*.js`: ~387 KB raw / ~115 KB gzip
- `codicon-*.ttf`: ~122 KB raw / ~59 KB gzip

Monaco dependency chain currently references many language chunks (86 language-related files referenced by monaco chunk).

Computed totals:
- Monaco chain (resolved assets): ~4.9 MB raw, ~1.35 MB gzip
- All assets: ~2.57 MB gzip

## 5. Current Runtime Error UX Gap

SQL execution errors are shown as text in results pane, not as editor markers.

Relevant paths:
- Error rendering: `src/components/database/sql-console/SqlResultsPane.vue`
- Error normalization: `src/utils/errorHandler.ts`
- No active marker calls in SQL editor path.

Backend currently does not consistently return line/column offsets for SQL errors in API payloads.

## 6. Option Analysis

### Option A: Keep Monaco As-Is
Pros:
- No migration risk.
- Existing UX remains stable.

Cons:
- SQL intelligence debt stays in frontend.
- Dialect expansion continues increasing fragile logic.

Verdict: acceptable short-term only.

### Option B: Replace Monaco with CodeMirror 6 Now
Pros:
- Potentially smaller editor payload.
- Modern modular ecosystem.

Cons:
- Large rewrite surface:
  - `MonacoEditor.vue`, `SqlMonaco.vue`, `JsonEditor.vue`, `JsonViewer.vue`
  - SQL provider logic integration
  - keyboard/actions/context menu/theme/auto-resize parity
  - JSON schema behavior parity
- Existing debt still exists unless moved to LSP.

Verdict: not first move.

### Option C: Keep Monaco + Introduce LSP (Recommended)
Pros:
- Removes custom SQL brain from frontend.
- Better parsing/diagnostics/autocomplete quality.
- Frontend SQL logic shrinks significantly.

Cons:
- Requires backend WS + JSON-RPC/LSP plumbing.
- Requires transport/session lifecycle work.

Verdict: best complexity-reduction path.

## 7. LSP in Current Go Binaries: Feasibility

Short answer: yes, feasible.

### 7.1 Stream API status (updated on 2026-02-18)
- LSP websocket route is added: `GET /api/v1/lsp/ws` in `cmd/stream-api/router.go`
- Initial WS <-> stdio bridge handler exists: `cmd/stream-api/lsp_ws_handler.go`
- Bridge supports configurable LSP process launch via env:
  - `SQL_LSP_COMMAND` (default: `sqls`)
  - `SQL_LSP_ARGS`
- API key auth middleware now supports websocket handshake fallback query params for browsers:
  - `api_key`
  - `install_id`
- Existing REST/SSE/auth infrastructure is reused.

### 7.2 Desktop status today
`stream-desktop` supervisor is hardcoded around `stream-api`, `stream-reader`, `stream-writer`:
- required service binaries check: `cmd/stream-desktop/supervisor.go`
- stale cleanup targets: `cmd/stream-desktop/cleanup_linux.go`, `cmd/stream-desktop/cleanup_windows.go`
- build services list: `cmd/stream-desktop/Makefile`
- readiness gate expects only nats/api/reader/writer: `cmd/stream-desktop/supervisor.go`

Implication:
- If LSP is a separate managed desktop service, supervisor/build/cleanup/readiness need extension.
- If LSP process is spawned by `stream-api` internally, desktop supervisor changes can be minimized.

### 7.3 Practical embedding models
1. Backend proxy model (recommended first):
- `stream-api` exposes `/api/v1/lsp/ws`
- `stream-api` bridges WS JSON-RPC <-> LSP stdio process (`sqls` or similar)
- keeps desktop supervisor mostly unchanged

2. Native in-process model:
- implement minimal LSP methods directly in Go in `stream-api`
- no external LSP binary, but more backend implementation effort

## 8. SQL LSP Candidate Snapshot (as of 2026-02-18)

- `sqls-server/sqls`
  - Active, Go-based, multi-DB focus
  - Latest release observed: `v0.2.45` (2026-01-07)

- `supabase-community/postgres-language-server`
  - Very active, strong feature set, frequent releases
  - Postgres-focused (not multi-dialect)

- `joe-re/sql-language-server`
  - Stable project history but latest release is older (`v1.7.0`, 2023-08-13)

## 9. Consolidated Recommendation

Proceed with Monaco + LSP backend integration.

Execution order:
1. Add LSP transport path in backend.
2. Swap frontend SQL completion/hover from custom provider to LSP client.
3. Keep minimal local frontend helpers only for product-specific logic (for example, file/federated shortcuts/snippets).
4. Add diagnostic marker mapping once backend returns positional errors consistently.

Do not start CodeMirror migration before step 2 and observed post-LSP metrics.

## 10. Implementation Plan (Ready for Discussion)

### Phase 0: Baseline and contract
- Define LSP endpoint contract: auth, connection/session identity, payload limits.
- Decide candidate server per dialect coverage (`sqls` vs custom minimal vs hybrid).

### Phase 1: Backend transport
- [x] Add `/api/v1/lsp/ws` in `stream-api`.
- [x] Implement initial WS <-> JSON-RPC framing bridge with stdio LSP process.
- [x] Reuse existing auth middleware (with WS query fallback for browser clients).
- [x] Add unit tests for LSP framing/parser helpers and desktop LSP command resolution.
- [ ] Add integration-level WS tests around process lifecycle and close semantics.

### Phase 2: Frontend integration
- [x] Add feature-flagged Monaco LSP client integration in UI (`VITE_SQL_LSP_ENABLED`).
- [x] Add runtime fallback to existing `useMonacoSqlProviders` when LSP is disabled/unavailable.
- [x] Add runtime UI toggle in Settings (LSP/Legacy) without rebuild.
- [x] Add user-visible warning toast on LSP fallback to legacy mode.
- [ ] Replace `useMonacoSqlProviders` for completion/hover path by default.
- [ ] Keep only minimal product-specific helpers (file/federated snippets) after LSP cutover.

### Phase 3: Diagnostics and runtime errors
- Return/normalize line+column info from backend SQL errors where available.
- Map diagnostics and execution errors to editor markers.

### Phase 4: Cleanup
- Remove dead custom SQL provider code and reduce test surface tied to regex parser logic.

## 11. Open Decisions for Next Discussion

- Which LSP backend strategy first: external `sqls` proxy or minimal custom Go LSP.
- Dialect coverage priority: PostgreSQL-first vs MySQL+PostgreSQL in first milestone.
- [Resolved] Desktop packaging includes bundled `sqls` binary in `services/` (with env override support).

## 12. Source Pointers (Primary)

UI:
- `src/components/monaco/MonacoEditor.vue`
- `src/components/monaco/SqlMonaco.vue`
- `src/components/monaco/JsonEditor.vue`
- `src/components/monaco/JsonViewer.vue`
- `src/composables/useMonacoSqlProviders.ts`
- `src/components/console/UnifiedConsoleTab.vue`
- `src/components/database/sql-console/SqlResultsPane.vue`
- `src/utils/errorHandler.ts`
- `vite.config.ts`
- `src/utils/monaco-loader.ts`

Backend/Desktop:
- `cmd/stream-api/router.go`
- `cmd/stream-api/database_handlers.go`
- `internal/errors/errors.go`
- `cmd/stream-desktop/supervisor.go`
- `cmd/stream-desktop/cleanup_linux.go`
- `cmd/stream-desktop/cleanup_windows.go`
- `cmd/stream-desktop/Makefile`
