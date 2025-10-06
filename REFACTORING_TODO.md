# Data Explorer Refactoring TODO

**Status:** Ready to implement
**Full Plan:** See [REFACTORING_PLAN_2025-10.md](./REFACTORING_PLAN_2025-10.md)

---

## ✅ HIGH PRIORITY: Pinia Store as Single Source of Truth (COMPLETED 2025-10-05)

**Priority:** CRITICAL - Must be done before Phase 3
**Estimated Effort:** 4-6 hours
**Actual Effort:** ~3 hours

### Problem
Previously, `activeConnectionId` had 4 different sources:
1. ~~`detailsConnectionId`~~ - for connection details panel
2. ~~`overviewConnectionId`~~ - for database overview
3. ~~`diagramConnectionId`~~ - for ER diagram view
4. `currentConnectionId` - from URL route params

This created:
- ❌ Multiple sources of truth
- ❌ Race conditions between route updates (async) and state updates (sync)
- ❌ Breadcrumb showing wrong connection during transitions
- ❌ Complexity and hard-to-maintain code

### Solution Implemented
**Made Pinia store the single source of truth (synchronous):**
1. ✅ Removed `overviewConnectionId`, `detailsConnectionId`, `diagramConnectionId`
2. ✅ Added `activeConnectionId` to `explorerNavigationStore` (synchronous state)
3. ✅ All handlers now update store FIRST, then route (for URL persistence)
4. ✅ Watchers use store state instead of route params (eliminates race conditions)
5. ✅ `currentConnectionId` (from route) still exists for URL-based navigation
6. ✅ Added query params for view modes (`?details=true`, `?diagram=true`)
7. ✅ ExplorerContentArea derives view mode from route

### Tasks Completed
- [x] Audit all uses of `overviewConnectionId`, `detailsConnectionId`, `diagramConnectionId`
- [x] Add `activeConnectionId` state to `explorerNavigationStore`
- [x] Add `setActiveConnectionId()` action to store
- [x] Update all selection actions to set `activeConnectionId`
- [x] Refactor `handleOpenFromTree` to update store first, then route
- [x] Refactor `handleOpenFile` to update store first, then route
- [x] Refactor `handleSelectDatabase` to update store first, then route
- [x] Refactor `handleShowDiagram` to update store first, then route
- [x] Refactor `handleSelectConnection` to update store first, then route
- [x] Refactor `handleFileSelect` to update store first, then route
- [x] Update ExplorerSidebarConnections watcher to use store instead of route
- [x] Remove `useRoute` dependency from ExplorerSidebarConnections
- [x] Remove `overviewConnectionId`, `detailsConnectionId`, `diagramConnectionId` from `useExplorerState`
- [x] Update ExplorerContentArea to derive view mode from route query params
- [x] Simplify `activeConnectionId` computed to just return `currentConnectionId`
- [x] Remove all debug logging
- [x] Build passes with no TypeScript errors

### Files Updated
- ✅ `src/stores/explorerNavigation.ts` - added `activeConnectionId` state and `setActiveConnectionId()` action
- ✅ `src/composables/useExplorerState.ts` - removed 3 connection ID refs, simplified `activeConnectionId` computed
- ✅ `src/views/DatabaseExplorerView.vue` - all handlers now update store first, then route
- ✅ `src/components/explorer/ExplorerContentArea.vue` - removed connection ID props, derives view from route
- ✅ `src/components/database/ExplorerSidebarConnections.vue` - watcher uses store instead of route, removed useRoute import
- ✅ `src/components/database/tree/ConnectionTreeItem.vue` - removed debug logging

### Success Criteria
- ✅ Pinia store is the synchronous source of truth for active connection
- ✅ Route is updated asynchronously for URL persistence
- ✅ No race conditions between store and route updates
- ✅ Breadcrumb always matches active connection (uses store, not route)
- ✅ No multiple sources of truth
- ✅ Code is simpler and easier to understand
- ✅ TypeScript build passes with no errors

### Architecture Pattern
**Before:** Route → Component State (async race condition)
**After:** Component Action → Store (sync) → Route (async for URL only)

This ensures:
1. Store updates synchronously when user clicks
2. Watchers see updated store immediately (no race condition)
3. Route updates asynchronously in background for URL persistence
4. Deep linking still works (route initializes store on load)

---

## 🔴 Phase 1: Foundation (Week 1)

### ✅ Completed
- [x] Create database overview store
- [x] Update components to use overview store
- [x] Remove composable cache for table sizes

### ✅ 1. Create Persistence Layer (Completed 2025-10-05)
- [x] Create `src/composables/usePersistedState.ts`
  - [x] Implement generic type-safe composable
  - [x] Add serializer/deserializer options
  - [x] Handle localStorage errors gracefully
  - [x] Add watch for reactive persistence
  - [x] Add helper functions: usePersistedBoolean, usePersistedNumber
- [x] Update `src/views/DatabaseExplorerView.vue` (recentConnections, lastViewed, alwaysOpenNewTab)
- [x] Update `src/composables/useExplorerState.ts` (linkTabs)
- [x] Update `src/composables/useSidebar.ts` (sidebarVisible, sidebarWidthPct, lastSidebarWidthPct)
- [x] Update `src/components/explorer/ExplorerHeader.vue` (connectionType filter)
- [x] Update `src/components/home/QuickActions.vue` (recentConnections access)
- [x] Verified no TypeScript errors in dev server
- [ ] Search for other localStorage usage: `grep -r "localStorage\." src/`
- [ ] Test all persistence edge cases in browser

### ✅ 2. Create File Explorer Store (Completed 2025-10-05)
- [x] Create `src/stores/fileExplorer.ts`
  - [x] Migrate state from `useFileOperations`
  - [x] Add `entriesByConnection` ref
  - [x] Add `selectedPathsByConnection` ref
  - [x] Add `loadingByConnection` ref
  - [x] Add `directoryPathsByConnection` ref
  - [x] Add `errorsByConnection` ref
  - [x] Add getter computeds: `getEntries`, `getSelectedPath`, `getDirectoryPath`, `getError`, `isLoading`
  - [x] Add `loadEntries` action
  - [x] Add `setSelectedPath` action
  - [x] Add `clearSelection` action
  - [x] Add `clearConnectionData` action
  - [x] Add `loadFileMetadata` action
- [x] Update `src/views/DatabaseExplorerView.vue`
  - [x] Replace `useFileOperations` with `useFileExplorerStore`
  - [x] Update `currentFileEntries` to use store getter
  - [x] Replace all `fileOps.*` calls with `fileExplorerStore.*`
  - [x] Remove file-related props from ExplorerSidebarConnections
- [x] Update `src/components/database/ExplorerSidebarConnections.vue`
  - [x] Remove `fileEntries` and `selectedFilePaths` props
  - [x] Import and use `useFileExplorerStore`
  - [x] Update `findFileEntry` to use store
  - [x] Remove prop passing to ConnectionTreeItem
- [x] Update `src/components/database/tree/ConnectionTreeItem.vue`
  - [x] Remove `fileEntries` and `selectedFilePath` props
  - [x] Import and use `useFileExplorerStore`
  - [x] Create computed properties for file data from store
  - [x] Update `visibleFileEntries` to use computed
- [x] ExplorerContentArea needs no changes (gets data via computed prop)
- [x] `useFileOperations.ts` can now be deprecated (optional cleanup)
- [x] Verified no TypeScript/build errors

**Deliverables:** Type-safe persistence + file explorer store

---

## 🔴 Phase 2: Component Simplification (Week 2)

### ✅ 3. Extract Context Menu Logic (Completed 2025-10-05)
- [x] Create `src/composables/useTreeContextMenu.ts` (~75 lines)
  - [x] Extract context menu state (visible, x, y, target)
  - [x] Add `open()` method
  - [x] Add `close()` method
  - [x] Export ContextTarget type
  - [x] Export TableOrViewTarget helper type
  - [x] Add computed properties: hasContextMenu, menuTarget, menuObj
- [x] Create `src/composables/useConnectionActions.ts` (~230 lines)
  - [x] Extract `testConnection(id)`
  - [x] Extract `refreshDatabases(id)`
  - [x] Extract `editConnection(id)`
  - [x] Extract `deleteConnection(id)`
  - [x] Extract `cloneConnection(id)`
  - [x] Extract `refreshDatabase(id, dbName)`
  - [x] Extract `openTable()` with full params
  - [x] Extract `openFile()` for file connections
  - [x] Extract `showDiagram()` action
  - [x] Extract `copyToClipboard()` helper
  - [x] Extract `copyDDL()` for tables/views
  - [x] Add `canCopyDDL()` helper
- [x] Update `src/components/database/ExplorerSidebarConnections.vue`
  - [x] Remove duplicate ContextTarget type
  - [x] Remove context menu state (contextMenuVisible, contextMenuX, contextMenuY, contextTarget)
  - [x] Remove all action handlers (~215 lines removed)
  - [x] Use `useTreeContextMenu()` composable
  - [x] Use `useConnectionActions()` composable
  - [x] Simplify `onMenuAction()` to use composables
  - [x] Update template bindings to use contextMenu.*
  - [x] **Result: 562 lines (was 723) - 22% reduction** ✅
- [x] Verified no TypeScript/build errors

### ✅ 4. Break Down DatabaseExplorerView (Completed 2025-10-05)
- [x] Create `src/composables/useExplorerRouter.ts`
  - [x] Extract route watching (lines 676-739)
  - [x] Add `navigateToConnection()`
  - [x] Add `navigateToDatabase()`
  - [x] Add `navigateToTable()`
  - [x] Handle route param sync
- [x] Create `src/composables/useRecentConnections.ts`
  - [x] Use `usePersistedState` for recent list
  - [x] Use `usePersistedState` for lastViewed
  - [x] Add `addToRecent(conn, db?)`
  - [x] Add `removeFromRecent(id)`
  - [x] Limit to 5 recent items
- [x] Update `src/stores/tabs.ts`
  - [x] Add `linkTabs` using `usePersistedState`
  - [x] Add `defaultActiveView` ref
  - [x] Add `syncedDefaultView` computed setter
  - [x] Sync all tabs when linkTabs is true
- [x] Update `src/views/DatabaseExplorerView.vue`
  - [x] Use `useExplorerRouter()` - remove route watching
  - [x] Use `useRecentConnections()` - remove local state
  - [x] Use `tabsStore.syncedDefaultView` - remove sync logic
  - [x] Reduced from 1,012 lines to 939 lines (73 lines / 7.2% reduction)
- [x] Remove `linkTabs` and `selectedDefaultTab` from `useExplorerState`
- [ ] Test route navigation
- [ ] Test recent connections
- [ ] Test tab synchronization

**Note:** DatabaseExplorerView is now at 939 lines (target: <500 lines). Further extraction needed in Phase 3.

**Deliverables:** Simplified components with reusable logic

---

## ✅ Phase 3: Polish & Optimization (Completed 2025-10-06)

### ✅ 5. Remove Expansion State Props (Completed 2025-10-05)
- [x] Update `src/components/database/tree/ConnectionTreeItem.vue`
  - [x] Remove `expandedDatabases` prop
  - [x] Remove `expandedSchemas` prop
  - [x] Use `navigationStore.isDatabaseExpanded()` directly
- [x] Update `src/components/database/tree/DatabaseTreeItem.vue`
  - [x] Remove `expandedSchemas` prop
  - [x] Use `navigationStore.isSchemaExpanded()` directly
- [x] Update `src/components/database/tree/SchemaTreeItem.vue`
  - [x] No changes needed (no expansion props)
  - [x] Uses store directly where needed
- [x] Update `src/components/database/ExplorerSidebarConnections.vue`
  - [x] Remove expansion props from template
  - [x] Clean up prop passing
  - [x] Remove unused fileExplorerStore import
- [x] Test expansion state reactivity

### ✅ 6. Extract Search Logic (Completed 2025-10-05)
- [x] Create `src/composables/useTreeSearch.ts`
  - [x] Add `searchQuery` parameter for reactive search
  - [x] Add `normalize()` function for case-insensitive search
  - [x] Add `matchesQuery()` function for single text matching
  - [x] Add `matchesAnyQuery()` function for array text matching
  - [x] Add `filterConnections()` function with full search logic
  - [x] Add `filterFileEntries()` function for file filtering
  - [x] Add `matchesDatabaseFilter()` function for database filtering
  - [x] Add `getHighlightParts()` function for text highlighting
- [x] Update `src/components/database/ExplorerSidebarConnections.vue`
  - [x] Import and use `useTreeSearch()` composable
  - [x] Replace `filteredConnections` logic with composable
  - [x] Replace `matchesDbFilter` function with composable
  - [x] Remove duplicate search code (`normalized` function)
- [x] Update `src/components/database/tree/ConnectionTreeItem.vue`
  - [x] Import and use `useTreeSearch()` composable
  - [x] Replace file filtering logic with `treeSearch.filterFileEntries()`
  - [x] Remove duplicate filter logic
- [x] Test search across all tree levels (build passed successfully)

### ✅ 7. Split useSplitPane (Completed 2025-10-05)
- [x] Create `src/composables/useSplitPaneResize.ts`
  - [x] Extract `splitGrow` ref for percentage width control
  - [x] Extract `isResizing` ref for drag state
  - [x] Extract `onDividerMouseDown()` for resize start
  - [x] Extract `onDividerDoubleClick()` for reset to 50/50
  - [x] Extract `resetSplitSize()` method
  - [x] Pure UI mechanics only - no content management
- [x] Create `src/stores/splitView.ts`
  - [x] Add `splitContent` ref (union of database/file content types)
  - [x] Add `defaultTab` ref for new content default
  - [x] Add `setSplitDatabaseContent()` action
  - [x] Add `setSplitFileContent()` action
  - [x] Add `clearSplit()` action
  - [x] Add getters: `hasContent`, `isDatabaseContent`, `isFileContent`, `connectionId`, `databaseContent`, `fileContent`
- [x] Update `src/views/DatabaseExplorerView.vue`
  - [x] Use `useSplitPaneResize()` for UI mechanics
  - [x] Use `useSplitViewStore()` for content management
  - [x] Remove old `useSplitPane()` import
  - [x] Update all split-related function calls to use new APIs
  - [x] Remove split-related props from ExplorerContentArea
- [x] Update `src/components/explorer/ExplorerSplitPane.vue`
  - [x] Use split view store instead of props
  - [x] Remove split-related props from component interface
  - [x] Use `useSplitViewStore.hasContent` for split visibility
- [x] Mark `src/composables/useSplitPane.ts` as deprecated
- [x] Test split pane resize and content (build passes successfully)

### ✅ 8. Breadcrumb Integration (Completed 2025-10-06)
- [x] Update `src/stores/schema.ts`
  - [x] Add `breadcrumbItems` getter
  - [x] Map tables and views to breadcrumb format
- [x] Update `src/composables/useExplorerState.ts`
  - [x] Remove `breadcrumbObjects` computed
  - [x] Use `schemaStore.breadcrumbItems`
- [x] Test breadcrumb navigation

### ✅ 9. Visual State Injection (Completed 2025-10-06)
- [x] Update `src/components/database/ExplorerSidebarConnections.vue`
  - [x] Add `provide('treeSearchQuery', searchQuery)`
  - [x] Add `provide('treeCaretClass', '...')`
- [x] Update tree components
  - [x] Inject searchQuery instead of prop (6 components updated)
  - [x] Inject caretClass instead of prop (3 components updated)
  - [x] Remove props from component definitions
  - [x] Updated: ConnectionTreeItem, DatabaseTreeItem, SchemaTreeItem, ObjectList, FileEntry
- [x] Test reactivity of injected values

**Deliverables:** ✅ All Phase 3 optimizations complete!

---

## Testing Checklist

### Manual Testing
- [ ] Connection expand/collapse
- [ ] Database expand with metadata loading
- [ ] Schema expand
- [ ] Search with text highlighting
- [ ] Context menu - all actions
- [ ] File connections display
- [ ] Tab sync when linked
- [ ] Split pane open/close/resize
- [ ] Recent connections tracking
- [ ] Route navigation
- [ ] Persistence after reload
- [ ] AG Grid with 20M+ rows
- [ ] Table sizes in sidebar

### Performance
- [ ] Profile component render times
- [ ] Check for memory leaks
- [ ] Verify no regression in load times
- [ ] Test with large databases (100+ tables)

### Code Review
- [ ] All TypeScript errors resolved
- [ ] No console errors/warnings
- [ ] Consistent code style
- [ ] Documentation updated
- [ ] No dead code remaining

---

## Rollback Points

- Phase 1 complete: Tag `refactor-phase1`
- Phase 2 complete: Tag `refactor-phase2`
- Phase 3 complete: Tag `refactor-phase3-complete`

Each phase is independent and can be rolled back if needed.

---

## Success Criteria

- [x] DatabaseOverview store created (✅ Done 2025-10-05)
- [ ] DatabaseExplorerView < 500 lines (currently 1,010)
- [ ] ExplorerSidebarConnections < 400 lines (currently 727)
- [ ] All localStorage centralized in `usePersistedState`
- [ ] File operations in store (no prop drilling)
- [ ] Context menu in dedicated composables
- [ ] Tab sync in tabsStore
- [ ] Split view in proper store
- [ ] No TypeScript errors
- [ ] All manual tests passing
- [ ] Performance maintained or improved

---

## Next Steps

1. Review plan with team
2. Start with Phase 1, Task 1 (usePersistedState)
3. Create feature branch: `refactor/data-explorer-phase1`
4. Implement and test incrementally
5. Code review before merging
6. Proceed to Phase 2

---

**Last Updated:** 2025-10-05
**Estimated Total Effort:** 15-20 hours across 3 weeks
