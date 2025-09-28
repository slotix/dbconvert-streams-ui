# Database Explorer — Minimal Build Plan (TODO)

Keep this tight and iterative; we’ll implement once you confirm.
reuse existing components/APIs as much as possible. No new backend services unless absolutely necessary.
if any API gaps emerge, we’ll stub UI loading with graceful errors and add a small API ticket.


## Scope (MVP)
- Tree roots = Connections
- Expand only the clicked connection on open (no global expand)
- Lazy load children (DBs/Schemas/Tables/Views/Folders) on expand
- Preview tab behavior like VS Code: single-click reuses one preview tab; double-click/middle-click pins
- Optional setting: always open new tab (overrides preview)
- Data/View editors must keep server-side paging (no perf regression)
- Context menus (start small):
  - Connection: Test connection, Refresh
  - DB/Schema: Generate DDL
  - Table/View: Open Data, Open Structure, Open DDL, Generate/Copy DDL
- Breadcrumb: Connections / <conn> / <db> / <schema> / <table> — each segment clickable
- Deep-link: “Explore” from card opens Explorer with that connection expanded
- Split open: “Open in right split” action (same preview/pin rules per split)

## Acceptance Criteria (tight)
- Tree lists all connections; expanding a connection loads DBs/schemas without blocking UI (lazy + loading states)
- Single-click on a DB object opens a reusable Preview tab; double-click pins the tab
- “Explore” from a connection card lands in Explorer with that connection expanded
- No regression to data grid performance (server-side paging remains intact)

## Minimal Checklist
- [x] Tree roots = connections
  - [x] Show all connections (icon + name: e.g., `MySQL-localhost:3306`)
  - [x] Expand clicked connection only; do not auto-expand others
  - [x] Lazy-load its immediate children: Databases/Schemas/Folders
  - [x] Loading/empty/error states per node (non-blocking UI)
- [ ] Children loaders
  - [x] MySQL: Databases → {Tables, Views}
  - [x] PostgreSQL: Databases → Schemas → {Tables, Views}
  - [ ] Files: Datasets → folder tree
- [ ] Item open behavior (Preview model)
  - [x] Single-click opens in a single preview tab (reused)
  - [x] Double-click opens a pinned tab (middle-click pending)
  - [x] Setting: `explorer.alwaysOpenNewTab` (default false)
- [ ] Editors
  - [ ] Data preview uses existing server-side paging (no regression)
  - [x] Structure/DDL viewers leverage existing API
- [ ] Context menus (initial actions)
  - [ ] Connection: Test connection, Refresh
  - [ ] DB/Schema: Generate DDL
  - [ ] Table/View: Open Data, Open Structure, Open DDL, Generate/Copy DDL
- [ ] Breadcrumb
  - [ ] Render: Connections / <conn> / <db> / <schema> / <table>
  - [ ] Each segment clickable; click navigates to that level and focuses node
- [x] Deep link from “Explore” card
  - [x] Navigates to Explorer and expands that connection
- [ ] Split view support
  - [ ] Context action: Open in right split (same preview/pin rules per split)
- [ ] Non-regression
  - [ ] Validate grid perf: paging requests unchanged; no large client payloads

## Assumptions
- Existing APIs provide list endpoints for connections, DBs/schemas/tables/views, and data/DDL; if any gap emerges, we’ll stub UI loading with graceful errors and add a small API ticket.
- Pinia store already available for settings; if not, we’ll add one minimal boolean flag.
- “Explore” cards already know the connection id/name.

## Out of Scope (MVP)
- Advanced actions beyond listed context menu items
- Diagramming UI beyond links/placeholders
- Bulk operations/multi-select

## Rollout Order (tiny increments)
1) Tree + lazy load + preview/pin basics
2) Breadcrumb + deep-link from card
3) Context menus (initial set)
4) Split view open
5) Non-regression/perf check

Confirm this plan and I’ll start wiring it up step-by-step.
