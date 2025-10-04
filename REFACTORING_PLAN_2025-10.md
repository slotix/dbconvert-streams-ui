# Data Explorer Refactoring Plan - October 2025

**Date Created:** 2025-10-05
**Status:** Planning Phase
**Priority:** High

## Executive Summary

Comprehensive analysis of Data Explorer architecture revealed several critical areas requiring refactoring:
- **Over-sized components** (1,010 lines in main view)
- **Prop drilling** through 4 component levels
- **Scattered state management** (composables vs stores)
- **Duplicate localStorage access** (7+ files)
- **Complex event bubbling** (200+ lines of forwarding)

**Expected Outcomes:**
- 50% reduction in view component size
- Eliminate 80% of prop drilling
- Type-safe localStorage access
- Clearer state ownership
- Easier testing and maintenance

---

## Recent Accomplishments (Context)

### ✅ Database Overview Store (2025-10-05)
Created centralized Pinia store for database statistics:
- `stores/databaseOverview.ts` - Row counts, table sizes, overview data
- Updated 4 components to use store instead of duplicate API calls
- Removed redundant caching from `useConnectionTreeLogic` composable
- **Result:** Single source of truth for database statistics

### ✅ AG Grid Integration (2025-10-05)
Implemented AG Grid Community for large dataset display:
- Infinite Row Model for 20M+ row tables
- Pagination support (100/200/500/1000 rows per page)
- Position indicator showing current view
- Table sizes displayed in tree view sidebar
- **Result:** Can now handle multi-million row tables efficiently

---

## 🔴 Priority 1: Critical Issues (Start Here)

### 1. Create Persistence Layer
**File:** `src/composables/usePersistedState.ts` (NEW)
**Priority:** 🔴 Critical
**Impact:** Affects 7+ files
**Effort:** 2-3 hours

**Problem:** Direct localStorage access scattered across codebase
```typescript
// DatabaseExplorerView.vue
JSON.parse(localStorage.getItem('recentConnections') || '[]')

// useExplorerState.ts
localStorage.getItem('explorer.linkTabs') === 'true'

// Multiple files with manual parsing, no type safety
```

**Solution:** Create type-safe persistence composable
```typescript
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  options?: {
    serializer?: (value: T) => string
    deserializer?: (value: string) => T
  }
): Ref<T>

// Usage
const linkTabs = usePersistedState('explorer.linkTabs', false)
const recentConnections = usePersistedState('recentConnections', [])
```

**Files to Update:**
- [ ] Create `src/composables/usePersistedState.ts`
- [ ] Update `src/views/DatabaseExplorerView.vue` (lines 46-58)
- [ ] Update `src/composables/useExplorerState.ts` (line 47)
- [ ] Update `src/composables/useSidebar.ts`
- [ ] Update `src/stores/common.ts` if needed
- [ ] Update any other localStorage usage found

**Benefits:**
- Type safety for all persisted state
- Automatic reactive updates
- Centralized error handling
- Easy testing and mocking

---

### 2. Create File Explorer Store
**File:** `src/stores/fileExplorer.ts` (NEW)
**Priority:** 🔴 Critical
**Impact:** Eliminates prop drilling
**Effort:** 3-4 hours

**Problem:** File operations in composable but passed as props
```typescript
// Current: useFileOperations composable with ref state
const fileEntriesByConnection = ref<Record<string, FileSystemEntry[]>>({})

// Passed as props through 3 levels
<ExplorerSidebarConnections :file-entries="fileOps.fileEntriesByConnection.value" />
<ConnectionTreeItem :file-entries="props.fileEntries" />
<FileEntry :entry="entry" />
```

**Solution:** Migrate to Pinia store
```typescript
export const useFileExplorerStore = defineStore('fileExplorer', () => {
  const entriesByConnection = ref<Record<string, FileSystemEntry[]>>({})
  const selectedPathsByConnection = ref<Record<string, string | null>>({})
  const loadingByConnection = ref<Record<string, boolean>>({})

  const getCurrentEntries = computed(() => (connectionId: string) => {
    return entriesByConnection.value[connectionId] || []
  })

  async function loadEntries(connectionId: string, force = false) {
    // Move logic from useFileOperations composable
  }

  function setSelectedPath(connectionId: string, path: string | null) {
    selectedPathsByConnection.value[connectionId] = path
  }

  return {
    entriesByConnection,
    selectedPathsByConnection,
    loadingByConnection,
    getCurrentEntries,
    loadEntries,
    setSelectedPath
  }
})
```

**Files to Update:**
- [ ] Create `src/stores/fileExplorer.ts`
- [ ] Migrate logic from `src/composables/useFileOperations.ts`
- [ ] Update `src/views/DatabaseExplorerView.vue` (lines 66-70)
- [ ] Update `src/components/database/ExplorerSidebarConnections.vue`
- [ ] Update `src/components/database/tree/ConnectionTreeItem.vue`
- [ ] Remove file-related props from tree components
- [ ] Consider deprecating `useFileOperations.ts`

**Benefits:**
- Eliminate 3 levels of prop drilling
- Shared state across components
- Better caching and loading states
- Reactive updates

---

### 3. Extract Context Menu Logic
**Files:** Multiple new composables
**Priority:** 🔴 Critical
**Impact:** Reduces ExplorerSidebarConnections from 727 to ~350 lines
**Effort:** 4-5 hours

**Problem:** ExplorerSidebarConnections has 200+ lines of context menu code
```typescript
// Lines 82-99: Complex ContextTarget type
// Lines 100-111: Context menu state
// Lines 226-244: Menu positioning
// Lines 338-439: Menu action handlers (15+ cases)
```

**Solution:** Extract to composables

**A. Create `useTreeContextMenu.ts`**
```typescript
export function useTreeContextMenu() {
  const visible = ref(false)
  const x = ref(0)
  const y = ref(0)
  const target = ref<ContextTarget | null>(null)

  function open(event: MouseEvent, contextTarget: ContextTarget) {
    event.preventDefault()
    event.stopPropagation()
    x.value = event.clientX
    y.value = event.clientY
    target.value = contextTarget
    visible.value = true
  }

  function close() {
    visible.value = false
    target.value = null
  }

  return { visible, x, y, target, open, close }
}
```

**B. Create `useConnectionActions.ts`**
```typescript
export function useConnectionActions() {
  const router = useRouter()
  const connectionsStore = useConnectionsStore()
  const navigationStore = useExplorerNavigationStore()

  async function testConnection(id: string) { /* ... */ }
  async function refreshDatabases(id: string) { /* ... */ }
  async function editConnection(id: string) { /* ... */ }
  async function deleteConnection(id: string) { /* ... */ }
  async function cloneConnection(id: string) { /* ... */ }
  async function refreshDatabase(id: string, dbName: string) { /* ... */ }
  async function openTable(id: string, db: string, table: string) { /* ... */ }

  return {
    testConnection,
    refreshDatabases,
    editConnection,
    deleteConnection,
    cloneConnection,
    refreshDatabase,
    openTable
  }
}
```

**Files to Create:**
- [ ] `src/composables/useTreeContextMenu.ts` (~80 lines)
- [ ] `src/composables/useConnectionActions.ts` (~150 lines)

**Files to Update:**
- [ ] `src/components/database/ExplorerSidebarConnections.vue`
  - Remove context menu state (lines 100-111)
  - Remove action handlers (lines 338-439)
  - Use new composables

**Benefits:**
- 200+ line reduction in main component
- Reusable context menu logic
- Testable action handlers
- Clearer separation of concerns

---

### 4. Break Down DatabaseExplorerView
**File:** `src/views/DatabaseExplorerView.vue`
**Priority:** 🔴 Critical
**Impact:** Reduce from 1,010 to ~450 lines
**Effort:** 6-8 hours

**Problem:** View component has 9 responsibilities
1. Route handling (lines 676-739)
2. Recent connections (lines 46-58, 631-663)
3. Tab management (lines 92-232, 399-440)
4. File operations (lines 171-232, 285-308)
5. Database object handling (lines 92-169)
6. Split pane coordination (lines 73-90)
7. Breadcrumb navigation (lines 499-584)
8. Connection CRUD (lines 443-496)
9. Metadata loading (lines 610-629)

**Solution:** Extract to composables and smaller components

**A. Create `useExplorerRouter.ts`**
```typescript
export function useExplorerRouter() {
  const route = useRoute()
  const router = useRouter()
  const explorerState = useExplorerState()

  // Watch route params and sync to state
  watch(
    () => route.params,
    (params) => {
      // Sync logic from lines 676-739
    },
    { immediate: true }
  )

  function navigateToConnection(id: string) { /* ... */ }
  function navigateToDatabase(id: string, db: string) { /* ... */ }

  return { navigateToConnection, navigateToDatabase }
}
```

**B. Create `useRecentConnections.ts`**
```typescript
export function useRecentConnections() {
  const recent = usePersistedState<RecentConnection[]>('recentConnections', [])
  const lastViewed = usePersistedState<string>('lastViewedConnectionId', '')

  function addToRecent(conn: Connection, db?: string) { /* ... */ }
  function removeFromRecent(id: string) { /* ... */ }

  return { recent, lastViewed, addToRecent, removeFromRecent }
}
```

**C. Consolidate Tab State in `stores/tabs.ts`**
```typescript
// Add to existing tabsStore
export const useTabsStore = defineStore('tabs', () => {
  // ... existing state

  const linkTabs = usePersistedState('explorer.linkTabs', false)
  const defaultActiveView = ref<'structure' | 'data'>('data')

  const syncedDefaultView = computed({
    get: () => defaultActiveView.value,
    set: (value) => {
      defaultActiveView.value = value
      if (linkTabs.value) {
        // Sync all open tabs
        pinnedTabs.value.forEach(tab => tab.viewTab = value)
        if (previewTab.value) previewTab.value.viewTab = value
      }
    }
  })

  return {
    // ... existing
    linkTabs,
    syncedDefaultView
  }
})
```

**Files to Create:**
- [ ] `src/composables/useExplorerRouter.ts` (~100 lines)
- [ ] `src/composables/useRecentConnections.ts` (~80 lines)

**Files to Update:**
- [ ] `src/stores/tabs.ts` - Add tab sync logic
- [ ] `src/views/DatabaseExplorerView.vue` - Use new composables
  - Replace route watching with `useExplorerRouter()`
  - Replace recent connections with `useRecentConnections()`
  - Replace tab sync with `tabsStore.syncedDefaultView`
  - Move connection CRUD to `useConnectionActions()`

**Target Structure:**
```typescript
// DatabaseExplorerView.vue (~450 lines)
const explorerRouter = useExplorerRouter()
const recentConns = useRecentConnections()
const connectionActions = useConnectionActions()
const tabsStore = useTabsStore()
const splitPane = useSplitPane()

// Just orchestration, no complex logic
```

**Benefits:**
- 50% reduction in view component size
- Testable composables
- Reusable logic
- Clearer responsibilities

---

## 🟡 Priority 2: Important Improvements

### 5. Remove Expansion State Prop Drilling
**Files:** Tree components
**Priority:** 🟡 Important
**Impact:** Simplify tree hierarchy
**Effort:** 2-3 hours

**Problem:** explorerNavigationStore has expansion state, but it's passed as props
```typescript
// Store has it
expandedDatabases: new Set<string>()

// But also passed as prop (unnecessary!)
<ConnectionTreeItem
  :expanded-databases="navigationStore.expandedDatabases"
  :expanded-schemas="navigationStore.expandedSchemas"
/>
```

**Solution:** Remove props, use store directly
```typescript
// In DatabaseTreeItem.vue
const navigationStore = useExplorerNavigationStore()

const isDatabaseExpanded = computed(() =>
  navigationStore.isDatabaseExpanded(`${props.connectionId}:${props.database.name}`)
)
```

**Files to Update:**
- [ ] `src/components/database/tree/ConnectionTreeItem.vue`
- [ ] `src/components/database/tree/DatabaseTreeItem.vue`
- [ ] `src/components/database/tree/SchemaTreeItem.vue`
- [ ] `src/components/database/ExplorerSidebarConnections.vue`

**Benefits:**
- Less prop drilling
- Direct store access
- Simpler component props
- Better reactivity

---

### 6. Extract Search Logic
**Files:** Create `useTreeSearch.ts`
**Priority:** 🟡 Important
**Impact:** DRY principle, reusable search
**Effort:** 2-3 hours

**Problem:** Duplicate search/filter logic
```typescript
// In ExplorerSidebarConnections.vue (lines 127-159)
const filteredConnections = computed(() => {
  // 30+ lines of filtering
})

// In ConnectionTreeItem.vue (lines 158-165)
const visibleFileEntries = () => {
  // Similar filtering
}
```

**Solution:** Centralized search composable
```typescript
export function useTreeSearch() {
  const searchQuery = ref('')

  const normalize = (s: string) => s.toLowerCase().trim()

  function matchesQuery(text: string | string[], query: string): boolean {
    const q = normalize(query)
    if (!q) return true

    const texts = Array.isArray(text) ? text : [text]
    return texts.some(t => normalize(t).includes(q))
  }

  function filterConnections(
    connections: Connection[],
    query: string,
    navigationStore: ReturnType<typeof useExplorerNavigationStore>
  ): Connection[] {
    // Unified filtering logic
  }

  function highlightMatches(text: string, query: string) {
    // Highlight logic
  }

  return { searchQuery, matchesQuery, filterConnections, highlightMatches }
}
```

**Files to Create:**
- [ ] `src/composables/useTreeSearch.ts` (~120 lines)

**Files to Update:**
- [ ] `src/components/database/ExplorerSidebarConnections.vue`
- [ ] `src/components/database/tree/ConnectionTreeItem.vue`
- [ ] Replace duplicate filtering logic

**Benefits:**
- DRY - no duplicate search code
- Consistent search behavior
- Testable search logic
- Easy to enhance (fuzzy search, etc.)

---

### 7. Split useSplitPane Composable
**Files:** Refactor existing composable
**Priority:** 🟡 Important
**Impact:** Separate UI from content state
**Effort:** 2-3 hours

**Problem:** Mixed concerns - resize mechanics + content state
```typescript
// useSplitPane.ts mixes:
// 1. Resize mechanics (good)
const splitGrow = ref(50)
const onDividerMouseDown = (e: MouseEvent) => { /* ... */ }

// 2. Split content state (should be separate)
const splitMeta = ref<SQLTableMeta | null>(null)
const splitFileEntry = ref<FileSystemEntry | null>(null)
```

**Solution:** Split into two pieces

**A. Keep UI mechanics: `useSplitPaneResize.ts`**
```typescript
export function useSplitPaneResize() {
  const splitGrow = ref(50)
  const isResizing = ref(false)

  function onDividerMouseDown(e: MouseEvent) { /* ... */ }
  function onDividerDoubleClick() { /* ... */ }

  return { splitGrow, isResizing, onDividerMouseDown, onDividerDoubleClick }
}
```

**B. Create store for content: `stores/splitView.ts`**
```typescript
export const useSplitViewStore = defineStore('splitView', () => {
  const splitContent = ref<{
    type: 'database' | 'file' | null
    connectionId: string
    data: SQLTableMeta | FileSystemEntry
    defaultTab?: 'data' | 'structure'
  } | null>(null)

  function setSplitContent(content: /* ... */) { /* ... */ }
  function clearSplit() { /* ... */ }

  return { splitContent, setSplitContent, clearSplit }
})
```

**Files to Create:**
- [ ] `src/composables/useSplitPaneResize.ts` (~50 lines)
- [ ] `src/stores/splitView.ts` (~80 lines)

**Files to Update:**
- [ ] Deprecate `src/composables/useSplitPane.ts`
- [ ] Update `src/views/DatabaseExplorerView.vue`
- [ ] Update components using split pane

**Benefits:**
- Separation of concerns
- UI mechanics reusable
- Content state in store (proper pattern)
- Easier testing

---

## 🟢 Priority 3: Nice to Have

### 8. Breadcrumb Store Integration
**File:** `stores/schema.ts`
**Priority:** 🟢 Nice to have
**Effort:** 1-2 hours

**Problem:** Breadcrumb computation in composable
```typescript
// In useExplorerState.ts
const breadcrumbObjects = computed(() => [
  ...schemaStore.tables.map(t => ({ name: t.name, type: 'table' })),
  ...schemaStore.views.map(v => ({ name: v.name, type: 'view' }))
])
```

**Solution:** Add getter to schemaStore
```typescript
// In stores/schema.ts
getters: {
  breadcrumbItems(state): Array<{ name: string; type: 'table' | 'view'; schema?: string }> {
    return [
      ...state.tables.map(t => ({ name: t.name, type: 'table' as const, schema: t.schema })),
      ...state.views.map(v => ({ name: v.name, type: 'view' as const, schema: v.schema }))
    ]
  }
}
```

**Benefits:**
- Cached by Pinia
- Belongs in schemaStore
- One less computed in composable

---

### 9. Component Injection for Visual State
**Files:** Tree components
**Priority:** 🟢 Nice to have
**Effort:** 2-3 hours

**Problem:** Props for visual state (`searchQuery`, `caretClass`)
```typescript
// Drilled through 3 levels
<ConnectionTreeItem :search-query="searchQuery" :caret-class="caretClass" />
<DatabaseTreeItem :search-query="props.searchQuery" :caret-class="props.caretClass" />
<SchemaTreeItem :search-query="props.searchQuery" :caret-class="props.caretClass" />
```

**Solution:** Use provide/inject
```typescript
// In ExplorerSidebarConnections.vue
provide('treeSearchQuery', searchQuery)
provide('treeCaretClass', 'w-[16px] h-[16px]...')

// In any tree component
const searchQuery = inject<Ref<string>>('treeSearchQuery', ref(''))
const caretClass = inject<string>('treeCaretClass', '')
```

**Benefits:**
- No prop drilling for visual state
- Cleaner component props
- Easy to add more injected values

---

## Implementation Plan

### Phase 1: Foundation (Week 1)
**Goal:** Type-safe persistence and eliminate file prop drilling

1. **Day 1-2:** Create `usePersistedState` composable
   - Implement composable
   - Update all localStorage usage
   - Test thoroughly

2. **Day 3-4:** Create file explorer store
   - Migrate from `useFileOperations`
   - Update all components
   - Remove file props from tree

3. **Day 5:** Testing and validation
   - Manual testing of all changes
   - Fix any issues
   - Update documentation

**Deliverables:**
- ✅ Type-safe persistence layer
- ✅ File explorer store
- ✅ Reduced prop drilling
- ✅ All tests passing

---

### Phase 2: Component Simplification (Week 2)
**Goal:** Reduce component complexity by 50%

1. **Day 1-2:** Extract context menu logic
   - Create `useTreeContextMenu`
   - Create `useConnectionActions`
   - Update ExplorerSidebarConnections

2. **Day 3-5:** Break down DatabaseExplorerView
   - Create `useExplorerRouter`
   - Create `useRecentConnections`
   - Update tab sync in tabsStore
   - Refactor main view component

**Deliverables:**
- ✅ ExplorerSidebarConnections <400 lines
- ✅ DatabaseExplorerView <500 lines
- ✅ Reusable composables
- ✅ Better separation of concerns

---

### Phase 3: Polish & Optimization (Week 3)
**Goal:** Complete remaining improvements

1. **Day 1-2:** Remove expansion props
   - Update tree components
   - Direct store access
   - Clean up props

2. **Day 3:** Extract search logic
   - Create `useTreeSearch`
   - Update components

3. **Day 4:** Split useSplitPane
   - Create resize composable
   - Create split view store

4. **Day 5:** Nice-to-haves (if time permits)
   - Breadcrumb integration
   - Provide/inject pattern

**Deliverables:**
- ✅ All planned refactorings complete
- ✅ Documentation updated
- ✅ Performance validated
- ✅ Code review completed

---

## Success Metrics

### Code Quality
- [ ] DatabaseExplorerView: 1,010 → 450 lines (55% reduction)
- [ ] ExplorerSidebarConnections: 727 → 350 lines (52% reduction)
- [ ] Prop drilling: 4 levels → 1-2 levels (50% reduction)
- [ ] localStorage access: 7+ files → 1 composable (centralized)
- [ ] Event handlers: 15+ forwarding → Direct store calls

### Architecture
- [ ] All persisted state uses `usePersistedState`
- [ ] File operations in `fileExplorerStore`
- [ ] Context menu in dedicated composables
- [ ] Tab sync consolidated in `tabsStore`
- [ ] Split view in proper store

### Performance
- [ ] No performance regressions
- [ ] Faster component initialization
- [ ] Better reactivity (fewer watchers)
- [ ] Reduced memory usage (shared caches)

### Developer Experience
- [ ] Type safety for all persisted state
- [ ] Clear component responsibilities
- [ ] Testable composables and stores
- [ ] Good IntelliSense support
- [ ] Updated documentation

---

## Testing Strategy

### Unit Tests
- [ ] Test `usePersistedState` with various types
- [ ] Test `useTreeContextMenu` state management
- [ ] Test `useConnectionActions` API calls
- [ ] Test `useTreeSearch` filtering logic
- [ ] Test store getters and actions

### Integration Tests
- [ ] Test file explorer store integration
- [ ] Test tab synchronization
- [ ] Test split view coordination
- [ ] Test route navigation

### Manual Testing Checklist
- [ ] Connection expansion/collapse
- [ ] Database expansion with metadata loading
- [ ] Schema expansion
- [ ] Search with highlight
- [ ] Context menu all actions
- [ ] File connections
- [ ] Tab synchronization when linked
- [ ] Split pane open/close/resize
- [ ] Recent connections tracking
- [ ] Route navigation
- [ ] Persistence after page reload

---

## Risk Mitigation

### Potential Risks
1. **Breaking changes** in components
   - Mitigation: Comprehensive testing before deployment
   - Rollback plan: Git branches for each phase

2. **Performance regressions**
   - Mitigation: Profile before/after each change
   - Benchmark: Measure render times

3. **State synchronization issues**
   - Mitigation: Careful store design with clear ownership
   - Testing: Focus on edge cases

4. **LocalStorage compatibility**
   - Mitigation: Error handling in `usePersistedState`
   - Fallback: In-memory state if localStorage fails

### Rollback Plan
Each phase is independent and can be rolled back:
- Phase 1: Revert persistence and file store commits
- Phase 2: Revert component refactoring commits
- Phase 3: Revert optimization commits

---

## Notes

### What NOT to Change
- ✅ Keep explorerNavigationStore (working well)
- ✅ Keep useExplorerState for selection state (appropriate)
- ✅ Keep event-driven UI coordination (appropriate pattern)
- ✅ Keep existing composables that work well (useSidebar, etc.)
- ✅ Don't create single giant store (loses composability)

### Future Considerations
- Virtual scrolling for 100+ tables
- Debounced search input
- Background cache refresh
- IndexedDB for offline support
- Optimistic UI updates
- Performance profiling

---

## Changelog

### 2025-10-05
- Initial refactoring plan created
- Analysis completed on 10+ components
- Identified 9 major improvement areas
- Created 3-phase implementation plan
- Defined success metrics and testing strategy
