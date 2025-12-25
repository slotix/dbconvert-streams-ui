# Explorer Search Flow (Current)

This document describes how the **Database Explorer** sidebar search works end-to-end (UI filtering, best-effort auto-loading/expansion, and backend caching).

## Where the search value comes from

- The search box in the Explorer view is owned by the Explorer page and passed down as a prop.
  - Page: [src/views/DatabaseExplorerView.vue](../src/views/DatabaseExplorerView.vue)
  - Sidebar tree: [src/components/database/ExplorerSidebarConnections.vue](../src/components/database/ExplorerSidebarConnections.vue)

## Minimum length behavior (MIN_SEARCH_LENGTH)

- The Explorer tree uses `MIN_SEARCH_LENGTH = 2`.
- If the user has typed 1 character (or whitespace-only), the UI treats it as **no search**:
  - No filtering happens.
  - No highlighting happens.
  - Search-driven auto-expansion does not run.

Implementation:
- [ExplorerSidebarConnections.vue](../src/components/database/ExplorerSidebarConnections.vue) computes `effectiveSearchQuery` which becomes `''` unless `trimmed.length >= 2`.
- The tree provides `effectiveSearchQuery` to all tree row components using Vue `provide('treeSearchQuery', ...)`.

## Core search logic: `useTreeSearch`

The reusable composable is:
- [src/composables/useTreeSearch.ts](../src/composables/useTreeSearch.ts)

It provides:
- `filterConnections(connections)` — which connections should remain visible.
- `filterFileEntries(entries)` — which file/S3 entries under a file connection should remain visible.
- `matchesDatabaseFilter(connectionId, databaseName)` — used for search-time expansion decisions.

### What `filterConnections` searches

`filterConnections` is client-side and matches a connection when **any** of these match the query:

1. **Connection label / host / type**
   - Uses host from `spec` and matches against `${name} ${host} ${type}`.
2. **Database names**
   - Uses the Explorer Navigation store’s databases list (which respects system-db filtering).
3. **Loaded metadata (tables/views)**
   - Searches loaded metadata across databases:
     - table/view name
     - schema name (when present)
4. **Loaded file entries (Files + S3)**
   - Searches the file tree recursively (folder + descendants).

Important: this is not a backend “search endpoint”. The search matches what is currently present in Pinia stores; the UI will *try* to load/expand data as you type (see below), but it’s still “search within loaded state”.

### What `filterFileEntries` does (Files + S3)

`filterFileEntries(entries)` returns a **pruned subtree**:
- A file/folder matches if its `name` contains the query.
- A folder is also included if **any descendant** matches.
- Non-matching branches are removed so results don’t dump the entire bucket.

This is why deep S3 keys now show under their folders/buckets when you search.

## Search-driven auto-loading & expansion (Explorer sidebar)

The Explorer sidebar does two best-effort things when `effectiveSearchQuery` is active:

### 1) Ensure file/S3 connections have root entries loaded

In [ExplorerSidebarConnections.vue](../src/components/database/ExplorerSidebarConnections.vue):
- A debounced watcher calls `loadFileEntriesForSearch()`.
- For each “file connection” (local files or S3), it calls `fileExplorerStore.loadEntries(connectionId)` if entries are empty and not already loading.

S3 is treated as a file connection (even when `connection.type` is `s3`) by:
- [src/stores/fileExplorer.ts](../src/stores/fileExplorer.ts) `isFilesConnectionType()` which returns true for `type === 'files'` **or** `spec.s3`.

### 2) Expand tree nodes so matches aren’t hidden

In [ExplorerSidebarConnections.vue](../src/components/database/ExplorerSidebarConnections.vue):
- `expandForSearch()` runs (debounced) when query length ≥ 2.
- It iterates through connections (respecting type filters) and:

For **all connections**:
- Expands the connection node.

For **DB connections**:
- Ensures databases are loaded: `navigationStore.ensureDatabases(connectionId)`.

### DB search completeness (metadata preloading)

During an active search (query length ≥ 2), the sidebar now **best-effort preloads metadata for each database** in DB connections.

Why:
- Without metadata, a database cannot be detected as matching a table/view name.
- Preloading metadata makes table/view searches **complete** even if the user hasn’t expanded that database yet.

Behavior:
- Ensures databases are loaded: `navigationStore.ensureDatabases(connectionId)`.
- For each database under the connection:
  - Best-effort loads metadata (if not already loaded): `navigationStore.ensureMetadata(connectionId, dbName)`.
  - Then, if the database matches `matchesDatabaseFilter(...)`:
    - Expands that database node.
    - If the engine is schema-based (e.g. Postgres/Snowflake), it expands schemas that contain matches.

Tradeoff:
- This may issue more metadata requests during search (one per database). The API caches metadata responses, and the search expansion is debounced.

For **file/S3 connections**:
- Triggers `request-file-entries` to load root entries.

Cancellation behavior:
- The expansion work uses a `searchRunId` token. When the query changes, older expansion runs stop early.

## File/S3 subtree rendering + highlight behavior

### Rendering the (filtered) file entries

The per-connection tree item is:
- [src/components/database/tree/ConnectionTreeItem.vue](../src/components/database/tree/ConnectionTreeItem.vue)

For file connections:
- It computes `visibleFileEntries = treeSearch.filterFileEntries(fileEntries)`.
- The UI renders `visibleFileEntries` (not the raw store entries) so only matching branches are shown during search.

### Auto-expanding matching file/S3 folders during search

To make deep matches visible without manual clicking:
- [ConnectionTreeItem.vue](../src/components/database/tree/ConnectionTreeItem.vue) watches `[searchQuery, visibleFileEntries]`.
- When search is active and there are results, it expands every directory node present in `visibleFileEntries`.

This ensures the path down to the matching object is expanded, so the match can be seen and highlighted.

### Where highlighting happens

Rows use the shared component:
- [src/components/common/HighlightedText.vue](../src/components/common/HighlightedText.vue)

File entries use:
- [src/components/database/FileEntry.vue](../src/components/database/FileEntry.vue)

DB tree items (connection/db/schema/table/view) similarly pass the injected `treeSearchQuery` into `HighlightedText`.

## File/S3 data model and lazy loading

File state is owned by the Pinia store:
- [src/stores/fileExplorer.ts](../src/stores/fileExplorer.ts)

Key points:
- `entriesByConnection[connectionId]` holds the root entries.
- `expandedFoldersByConnection[connectionId]` holds a `Set<string>` of expanded folder paths.
- Root loading:
  - `loadEntries(connectionId)` loads local filesystem roots or S3 roots.
  - For `s3://` (no bucket) it lists buckets.
  - For `s3://bucket/prefix` it lists objects and groups into a tree.
- Lazy folder loading:
  - When a folder is expanded and `entry.isLoaded` is false, the UI requests children via `loadFolderContents(...)`.

Important UX detail:
- The Explorer controller avoids force-refreshing file roots on expand because that can wipe already-loaded child nodes.
  - [src/composables/useDatabaseExplorerController.ts](../src/composables/useDatabaseExplorerController.ts)

## Type filters

The Explorer has optional connection type filters (the “Types” dropdown).
- They are applied before search filtering.
- Both `ExplorerSidebarConnections` and `useTreeSearch` respect the filters.

## Backend caching (what’s cached, not “search results”)

Search itself is client-side, but the UI depends on backend endpoints to fetch:
- connection list
- databases list
- metadata (tables/views)
- file/S3 listings

The API server uses in-memory TTL caches for API responses/metadata.
- The main API cache is created with a **10 minute TTL**:
  - [cmd/stream-api/server.go](../../dbconvert-stream/cmd/stream-api/server.go)

This reduces repeated metadata/overview requests while navigating and expanding nodes, which indirectly makes search expansion feel faster (because the same data is reused).

---

## Summary: What happens when you type `act`

1. Explorer computes `effectiveSearchQuery` (`act` passes min-length).
2. Tree provides the query to children for filtering + highlighting.
3. Sidebar filters connections via `useTreeSearch.filterConnections`.
4. Sidebar expands connections and loads databases and metadata (DB) and root entries (files/S3) best-effort.
  - For DB connections, metadata is best-effort loaded for each database so table/view name searches are complete.
5. File connections render a pruned matching subtree and auto-expand matching folders so deep hits become visible.
6. Any matching labels render with highlight via `HighlightedText`.
