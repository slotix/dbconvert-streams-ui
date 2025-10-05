# Data Explorer Refactoring TODO

**Status:** Ready to implement
**Full Plan:** See [REFACTORING_PLAN_2025-10.md](./REFACTORING_PLAN_2025-10.md)

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

### 3. Extract Context Menu Logic
- [ ] Create `src/composables/useTreeContextMenu.ts`
  - [ ] Extract context menu state (visible, x, y, target)
  - [ ] Add `open()` method
  - [ ] Add `close()` method
  - [ ] Export ContextTarget type
- [ ] Create `src/composables/useConnectionActions.ts`
  - [ ] Extract `testConnection(id)`
  - [ ] Extract `refreshDatabases(id)`
  - [ ] Extract `editConnection(id)`
  - [ ] Extract `deleteConnection(id)`
  - [ ] Extract `cloneConnection(id)`
  - [ ] Extract `refreshDatabase(id, dbName)`
  - [ ] Extract `openTable(id, db, table, schema?)`
  - [ ] Extract file-related actions
- [ ] Update `src/components/database/ExplorerSidebarConnections.vue`
  - [ ] Remove context menu state (lines 100-111)
  - [ ] Remove action handlers (lines 338-439)
  - [ ] Use `useTreeContextMenu()` composable
  - [ ] Use `useConnectionActions()` composable
  - [ ] Update template bindings
  - [ ] Verify <400 lines after refactor
- [ ] Test all context menu actions

### 4. Break Down DatabaseExplorerView
- [ ] Create `src/composables/useExplorerRouter.ts`
  - [ ] Extract route watching (lines 676-739)
  - [ ] Add `navigateToConnection()`
  - [ ] Add `navigateToDatabase()`
  - [ ] Add `navigateToTable()`
  - [ ] Handle route param sync
- [ ] Create `src/composables/useRecentConnections.ts`
  - [ ] Use `usePersistedState` for recent list
  - [ ] Use `usePersistedState` for lastViewed
  - [ ] Add `addToRecent(conn, db?)`
  - [ ] Add `removeFromRecent(id)`
  - [ ] Limit to 10 recent items
- [ ] Update `src/stores/tabs.ts`
  - [ ] Add `linkTabs` using `usePersistedState`
  - [ ] Add `defaultActiveView` ref
  - [ ] Add `syncedDefaultView` computed setter
  - [ ] Sync all tabs when linkTabs is true
- [ ] Update `src/views/DatabaseExplorerView.vue`
  - [ ] Use `useExplorerRouter()` - remove route watching
  - [ ] Use `useRecentConnections()` - remove local state
  - [ ] Use `tabsStore.syncedDefaultView` - remove sync logic
  - [ ] Use `useConnectionActions()` for CRUD - remove handlers
  - [ ] Verify <500 lines after refactor
- [ ] Test route navigation
- [ ] Test recent connections
- [ ] Test tab synchronization

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
