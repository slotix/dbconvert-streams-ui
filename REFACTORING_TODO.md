# Data Explorer Refactoring TODO

**Status:** Ready to implement
**Full Plan:** See [REFACTORING_PLAN_2025-10.md](./REFACTORING_PLAN_2025-10.md)

---

## ✅ HIGH PRIORITY: Route as Single Source of Truth (COMPLETED 2025-10-05)

**Priority:** CRITICAL - Must be done before Phase 3
**Estimated Effort:** 4-6 hours
**Actual Effort:** ~2 hours

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
**Made the route the single source of truth:**
1. ✅ Removed `overviewConnectionId`, `detailsConnectionId`, `diagramConnectionId`
2. ✅ All handlers now only update route
3. ✅ `currentConnectionId` (from route) is the only source
4. ✅ Simplified `activeConnectionId` to just return `currentConnectionId`
5. ✅ Added query params for view modes (`?details=true`, `?diagram=true`)
6. ✅ ExplorerContentArea derives view mode from route

### Tasks Completed
- [x] Audit all uses of `overviewConnectionId`, `detailsConnectionId`, `diagramConnectionId`
- [x] Refactor `handleOpenFromTree` to only use route
- [x] Refactor `handleOpenFile` to only use route (already correct)
- [x] Refactor `handleSelectDatabase` to only use route
- [x] Refactor `handleShowDiagram` to only use route (added `?diagram=true` query param)
- [x] Refactor `handleSelectConnection` to only use route (added `?details=true` query param)
- [x] Remove `overviewConnectionId`, `detailsConnectionId`, `diagramConnectionId` from `useExplorerState`
- [x] Update ExplorerContentArea to derive view mode from route instead of props
- [x] Simplify `activeConnectionId` computed to just return `currentConnectionId`
- [x] Build passes with no TypeScript errors

### Files Updated
- ✅ `src/composables/useExplorerState.ts` - removed 3 connection ID refs, simplified `activeConnectionId` computed
- ✅ `src/views/DatabaseExplorerView.vue` - removed all assignments to the 3 connection IDs, added query params
- ✅ `src/components/explorer/ExplorerContentArea.vue` - removed connection ID props, derives view from route

### Success Criteria
- ✅ Route is the ONLY source for active connection
- ✅ Breadcrumb always matches URL (no more race conditions)
- ✅ No multiple sources of truth
- ✅ Code is simpler and easier to understand
- ✅ TypeScript build passes with no errors

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

## 🟡 Phase 3: Polish & Optimization (Week 3)

### 5. Remove Expansion State Props
- [ ] Update `src/components/database/tree/ConnectionTreeItem.vue`
  - [ ] Remove `expandedDatabases` prop
  - [ ] Remove `expandedSchemas` prop
  - [ ] Use `navigationStore.isDatabaseExpanded()` directly
- [ ] Update `src/components/database/tree/DatabaseTreeItem.vue`
  - [ ] Remove `expandedSchemas` prop
  - [ ] Use `navigationStore.isSchemaExpanded()` directly
- [ ] Update `src/components/database/tree/SchemaTreeItem.vue`
  - [ ] Remove expansion props
  - [ ] Use store directly
- [ ] Update `src/components/database/ExplorerSidebarConnections.vue`
  - [ ] Remove expansion props from template
  - [ ] Clean up prop passing
- [ ] Test expansion state reactivity

### 6. Extract Search Logic
- [ ] Create `src/composables/useTreeSearch.ts`
  - [ ] Add `searchQuery` ref
  - [ ] Add `normalize()` function
  - [ ] Add `matchesQuery()` function
  - [ ] Add `filterConnections()` function
  - [ ] Add `highlightMatches()` function (optional)
- [ ] Update `src/components/database/ExplorerSidebarConnections.vue`
  - [ ] Use `useTreeSearch()` composable
  - [ ] Replace `filteredConnections` logic
  - [ ] Remove duplicate search code
- [ ] Update `src/components/database/tree/ConnectionTreeItem.vue`
  - [ ] Use `useTreeSearch()` for file filtering
  - [ ] Remove duplicate filter logic
- [ ] Test search across all tree levels

### 7. Split useSplitPane
- [ ] Create `src/composables/useSplitPaneResize.ts`
  - [ ] Extract `splitGrow` ref
  - [ ] Extract `isResizing` ref
  - [ ] Extract `onDividerMouseDown()`
  - [ ] Extract `onDividerDoubleClick()`
  - [ ] Pure UI mechanics only
- [ ] Create `src/stores/splitView.ts`
  - [ ] Add `splitContent` ref (type, connectionId, data)
  - [ ] Add `defaultTab` ref
  - [ ] Add `setSplitContent()` action
  - [ ] Add `clearSplit()` action
- [ ] Update `src/views/DatabaseExplorerView.vue`
  - [ ] Use `useSplitPaneResize()` for UI
  - [ ] Use `useSplitViewStore()` for content
  - [ ] Remove old `useSplitPane()` import
- [ ] Update `src/components/explorer/ExplorerSplitPane.vue`
  - [ ] Use split view store
- [ ] Mark `src/composables/useSplitPane.ts` as deprecated
- [ ] Test split pane resize and content

### 8. Breadcrumb Integration (Optional)
- [ ] Update `src/stores/schema.ts`
  - [ ] Add `breadcrumbItems` getter
  - [ ] Map tables and views to breadcrumb format
- [ ] Update `src/composables/useExplorerState.ts`
  - [ ] Remove `breadcrumbObjects` computed
  - [ ] Use `schemaStore.breadcrumbItems`
- [ ] Test breadcrumb navigation

### 9. Visual State Injection (Optional)
- [ ] Update `src/components/database/ExplorerSidebarConnections.vue`
  - [ ] Add `provide('treeSearchQuery', searchQuery)`
  - [ ] Add `provide('treeCaretClass', '...')`
- [ ] Update tree components
  - [ ] Inject searchQuery instead of prop
  - [ ] Inject caretClass instead of prop
  - [ ] Remove props from component definitions
- [ ] Test reactivity of injected values

**Deliverables:** All optimizations complete, fully tested

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
