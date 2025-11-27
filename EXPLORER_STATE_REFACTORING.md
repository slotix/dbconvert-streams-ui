# Database Explorer State Management Refactoring

## What We Learned (Failed "URL as Source of Truth" Approach)

### Critical Discovery: Vue Router Timing Issue
After attempting to make URL the single source of truth, we discovered a **fundamental problem**:

```javascript
// On page reload with ?db=sakila:
onMounted(async () => {
  await router.isReady()
  console.log(route.query.db)  // ❌ undefined!
  console.log(router.currentRoute.value.query.db)  // ❌ Still undefined!
  console.log(router.currentRoute.value.fullPath)  // ❌ No query params!
})
```

**Root cause:** Vue Router's reactive `route` object and even `router.currentRoute` are NOT populated with query params when the component mounts, even after `router.isReady()`. The router's internal state lags behind the actual browser URL.

**Why fallbacks don't work:**
- `window.location.search` is hacky and defeats the purpose of using Vue Router
- `nextTick()` doesn't wait for router state
- Watchers trigger too late (after initial render shows wrong state)

### Conclusion
**You cannot rely on Vue Router as a synchronous source of truth during component initialization.**

---

## New Architecture: Store-First, URL-Second

### Single Source of Truth: Pinia Store + localStorage

```
┌─────────────────────────────────────────────────────┐
│           SYNCHRONOUS SOURCES OF TRUTH              │
│                                                     │
│  1. Pinia Store (explorerViewState)                │
│     - Current view type                             │
│     - Selected connection/database/table            │
│     - Always accessible synchronously               │
│                                                     │
│  2. localStorage                                    │
│     - Persists store state                          │
│     - Survives page reloads                         │
│     - Restored before component mounts              │
└─────────────────────────────────────────────────────┘
                        ↕
            Two-way sync (reliable)
                        ↕
┌─────────────────────────────────────────────────────┐
│         SECONDARY: URL (For Sharing Only)           │
│                                                     │
│  - Reflects current state                           │
│  - Enables back/forward buttons                     │
│  - Allows sharing URLs                              │
│  - NOT read on initial mount                        │
└─────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Create New Explorer View State Store

**File:** `src/stores/explorerViewState.ts`

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type ViewType =
  | 'connection-details'   // Showing connection info panel
  | 'database-overview'    // Showing database stats/tables list
  | 'table-data'           // Showing table data in pane tabs
  | 'file-browser'         // Showing file explorer
  | null

export const useExplorerViewStateStore = defineStore('explorerViewState', () => {
  // Core navigation state
  const viewType = ref<ViewType>(null)
  const connectionId = ref<string | null>(null)
  const databaseName = ref<string | null>(null)
  const schemaName = ref<string | null>(null)
  const objectType = ref<'table' | 'view' | null>(null)
  const objectName = ref<string | null>(null)
  const filePath = ref<string | null>(null)

  // Computed tree selection (for sidebar highlighting)
  const treeSelection = computed(() => {
    if (!connectionId.value) return null

    switch (viewType.value) {
      case 'connection-details':
        return {
          connectionId: connectionId.value,
          database: undefined,
          type: undefined,
          name: undefined
        }

      case 'database-overview':
        return {
          connectionId: connectionId.value,
          database: databaseName.value || undefined,
          type: undefined,
          name: undefined
        }

      case 'table-data':
        return {
          connectionId: connectionId.value,
          database: databaseName.value || undefined,
          schema: schemaName.value || undefined,
          type: objectType.value || undefined,
          name: objectName.value || undefined
        }

      default:
        return {
          connectionId: connectionId.value,
          database: undefined,
          type: undefined,
          name: undefined
        }
    }
  })

  // Actions: These are called by user interactions
  function selectConnection(connId: string) {
    viewType.value = 'connection-details'
    connectionId.value = connId
    databaseName.value = null
    schemaName.value = null
    objectType.value = null
    objectName.value = null
    filePath.value = null
  }

  function selectDatabase(connId: string, database: string) {
    viewType.value = 'database-overview'
    connectionId.value = connId
    databaseName.value = database
    schemaName.value = null
    objectType.value = null
    objectName.value = null
    filePath.value = null
  }

  function selectTable(
    connId: string,
    database: string,
    type: 'table' | 'view',
    name: string,
    schema?: string
  ) {
    viewType.value = 'table-data'
    connectionId.value = connId
    databaseName.value = database
    schemaName.value = schema || null
    objectType.value = type
    objectName.value = name
    filePath.value = null
  }

  function selectFile(connId: string, path: string) {
    viewType.value = 'file-browser'
    connectionId.value = connId
    filePath.value = path
    databaseName.value = null
  }

  function reset() {
    viewType.value = null
    connectionId.value = null
    databaseName.value = null
    schemaName.value = null
    objectType.value = null
    objectName.value = null
    filePath.value = null
  }

  return {
    // State
    viewType,
    connectionId,
    databaseName,
    schemaName,
    objectType,
    objectName,
    filePath,

    // Computed
    treeSelection,

    // Actions
    selectConnection,
    selectDatabase,
    selectTable,
    selectFile,
    reset
  }
}, {
  persist: {
    key: 'explorer.viewState',
    storage: localStorage,
    paths: [
      'viewType',
      'connectionId',
      'databaseName',
      'schemaName',
      'objectType',
      'objectName',
      'filePath'
    ]
  }
})
```

### Phase 2: Two-Way URL Sync (OUTSIDE Component Mount)

**File:** `src/composables/useExplorerUrlSync.ts`

```typescript
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useExplorerViewStateStore } from '@/stores/explorerViewState'

/**
 * Syncs explorer view state with URL (two-way)
 * CRITICAL: This runs in a watcher, NOT in onMounted
 * So it doesn't suffer from Vue Router timing issues
 */
export function useExplorerUrlSync() {
  const route = useRoute()
  const router = useRouter()
  const viewState = useExplorerViewStateStore()

  // 1. Store → URL (when user navigates via UI)
  watch(
    () => ({
      viewType: viewState.viewType,
      connectionId: viewState.connectionId,
      database: viewState.databaseName,
      schema: viewState.schemaName,
      type: viewState.objectType,
      name: viewState.objectName,
      file: viewState.filePath
    }),
    (state) => {
      if (!state.connectionId) return

      const query: Record<string, string> = {}

      switch (state.viewType) {
        case 'connection-details':
          query.details = 'true'
          break

        case 'database-overview':
          if (state.database) query.db = state.database
          break

        case 'table-data':
          if (state.database) query.db = state.database
          if (state.schema) query.schema = state.schema
          if (state.type) query.type = state.type
          if (state.name) query.name = state.name
          break

        case 'file-browser':
          if (state.file) query.file = state.file
          break
      }

      // Only update if different from current URL
      const currentQuery = JSON.stringify(route.query)
      const newQuery = JSON.stringify(query)

      if (currentQuery !== newQuery) {
        router.replace({
          path: `/explorer/${state.connectionId}`,
          query
        })
      }
    },
    { deep: true }
  )

  // 2. URL → Store (when user uses back/forward buttons or shares URL)
  watch(
    () => route.query,
    (query) => {
      const connId = route.params.id as string
      if (!connId) return

      // Parse URL and update store
      if (query.details === 'true') {
        viewState.selectConnection(connId)
      } else if (query.file) {
        viewState.selectFile(connId, query.file as string)
      } else if (query.db && query.type && query.name) {
        viewState.selectTable(
          connId,
          query.db as string,
          query.type as 'table' | 'view',
          query.name as string,
          query.schema as string | undefined
        )
      } else if (query.db) {
        viewState.selectDatabase(connId, query.db as string)
      } else {
        // Default to connection details if no query params
        viewState.selectConnection(connId)
      }
    },
    { immediate: false }  // CRITICAL: Don't run immediately
  )
}
```

### Phase 3: Refactor Controller to Use Store

**File:** `src/composables/useDatabaseExplorerController.ts`

```typescript
// Remove all URL reading logic from onMounted
// Remove showConnectionDetails ref
// Remove treeSelection computed (use store's instead)

export function useDatabaseExplorerController(options) {
  const viewState = useExplorerViewStateStore()

  // REMOVE: const showConnectionDetails = ref(...)
  // USE INSTEAD:
  const showConnectionDetails = computed(() => viewState.viewType === 'connection-details')

  // REMOVE: Complex treeSelection computed
  // USE INSTEAD:
  const treeSelection = viewState.treeSelection

  // Update navigation handlers to use store
  function handleSelectConnection(payload: { connectionId: string }) {
    viewState.selectConnection(payload.connectionId)
    // Store update triggers URL update automatically
    // No need to call router.push here
  }

  function handleSelectDatabase(payload: { connectionId: string; database: string }) {
    viewState.selectDatabase(payload.connectionId, payload.database)
    // Store update triggers URL update automatically
  }

  function handleOpenFromTree(payload) {
    viewState.selectTable(
      payload.connectionId,
      payload.database,
      payload.type,
      payload.name,
      payload.schema
    )
    // Store update triggers URL update automatically
  }

  // onMounted: Just restore from store (synchronous, reliable)
  onMounted(async () => {
    // Store is already populated from localStorage
    // URL sync watcher will update URL to match store

    // If no state in store at all, default to connection details
    if (!viewState.viewType && explorerState.currentConnectionId.value) {
      viewState.selectConnection(explorerState.currentConnectionId.value)
    }
  })
}
```

### Phase 4: Update View to Use Store

**File:** `src/views/DatabaseExplorerView.vue`

```typescript
<script setup>
import { useExplorerViewStateStore } from '@/stores/explorerViewState'
import { useExplorerUrlSync } from '@/composables/useExplorerUrlSync'

const viewState = useExplorerViewStateStore()

// Set up two-way URL sync
useExplorerUrlSync()

// Pass store's computed to controller
const controller = useDatabaseExplorerController({
  // ... other options
  treeSelection: viewState.treeSelection,
  showConnectionDetails: computed(() => viewState.viewType === 'connection-details')
})
</script>
```

---

## Benefits of This Architecture

### ✅ Solves All Timing Issues
- Store loads synchronously from localStorage before any component mounts
- No waiting for Vue Router to parse URL
- No race conditions between watchers

### ✅ Clean Data Flow
```
User Action → Store Update → localStorage Persist
                    ↓
              URL Update (watcher)
```

### ✅ Back/Forward Buttons Work
```
Browser Back → URL Changes → Watcher Updates Store → UI Updates
```

### ✅ Page Reload Works Perfectly
```
1. Page loads
2. Pinia hydrates from localStorage (instant)
3. Component mounts with correct state
4. URL sync watcher updates URL to match store
```

### ✅ URL Sharing Works
```
1. User opens shared URL with ?db=sakila
2. Component mounts
3. URL→Store watcher reads query params
4. Store updates
5. UI reflects correct state
```

---

## Migration Steps

### Step 1: Create Store (No Breaking Changes)
- [ ] Create `src/stores/explorerViewState.ts`
- [ ] Add pinia-plugin-persistedstate if not already installed
- [ ] Write unit tests for store actions

### Step 2: Create URL Sync (Parallel to Existing Code)
- [ ] Create `src/composables/useExplorerUrlSync.ts`
- [ ] Test in isolation that Store↔URL sync works

### Step 3: Refactor Controller (One Function at a Time)
- [ ] Replace `handleSelectConnection` to use store
- [ ] Replace `handleSelectDatabase` to use store
- [ ] Replace `handleOpenFromTree` to use store
- [ ] Remove old URL reading logic from onMounted
- [ ] Remove showConnectionDetails ref, use computed from store
- [ ] Remove treeSelection computed, use store's

### Step 4: Remove Dead Code
- [ ] Remove large URL sync watcher (lines ~583-680)
- [ ] Remove route.query watchers
- [ ] Remove duplicated state refs
- [ ] Clean up explorerState.ts

### Step 5: Testing
- [ ] Click connection → Connection Details shown, persists on reload
- [ ] Click database → Database Overview shown, persists on reload
- [ ] Click table → Table data shown, persists on reload
- [ ] Browser back/forward buttons work
- [ ] Shared URLs work
- [ ] localStorage survives multiple reloads

---

## Why This Works vs. Original Plan

| Approach | Issue | Solution |
|----------|-------|----------|
| **Original: URL as Source** | `route.query` unavailable on mount | ❌ Requires fallbacks, hacks |
| **New: Store as Source** | Store loads from localStorage synchronously | ✅ Always available on mount |
| **Original: URL drives state** | Timing issues, race conditions | ❌ Fighting Vue Router lifecycle |
| **New: Store drives URL** | Watchers run after mount | ✅ No timing issues |
| **Original: Multiple sources** | Conflicts between URL/tabs/refs | ❌ Complex reconciliation |
| **New: Single source** | Store is the only source | ✅ Simple, predictable |

---

## Code to Delete After Migration

1. ❌ All URL reading logic in `onMounted`
2. ❌ `showConnectionDetails` ref (use store's viewType instead)
3. ❌ Complex `treeSelection` computed (use store's)
4. ❌ URL sync watcher in controller
5. ❌ URL sync watcher in useExplorerState
6. ❌ Duplicated state refs (selectedDatabase, etc.)
7. ❌ window.location.search fallback code
8. ❌ router.isReady() await code
9. ❌ nextTick() workarounds

---

## Final Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     User Interactions                        │
│  (Click connection, click database, click table, etc.)       │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ↓
┌──────────────────────────────────────────────────────────────┐
│              Event Handlers in Controller                    │
│  handleSelectConnection(), handleSelectDatabase(), etc.      │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ↓ (call store action)
┌──────────────────────────────────────────────────────────────┐
│           explorerViewState Store (Pinia)                    │
│                                                              │
│  - selectConnection(id)                                      │
│  - selectDatabase(id, db)                                    │
│  - selectTable(id, db, type, name)                           │
│                                                              │
│  State: viewType, connectionId, databaseName, etc.           │
└───────┬──────────────────────────────────────────┬───────────┘
        │                                          │
        │ (persist)                                │ (watch)
        ↓                                          ↓
┌──────────────────┐                    ┌──────────────────────┐
│  localStorage    │                    │   URL Sync Watcher   │
│                  │                    │                      │
│  Survives reload │                    │  Updates router.push │
└──────────────────┘                    └──────────────────────┘
                                                   │
                                                   ↓
                                        ┌──────────────────────┐
                                        │    Browser URL       │
                                        │                      │
                                        │  ?db=sakila          │
                                        │  (for sharing)       │
                                        └──────────────────────┘
```

---

## Success Criteria

After migration, this should JUST WORK:

1. **Hard reload on `?db=sakila`**
   - ✅ Store loads `{viewType: 'database-overview', databaseName: 'sakila'}` from localStorage
   - ✅ Component renders Database Overview immediately
   - ✅ URL watcher eventually syncs URL to match store

2. **Navigate via UI**
   - ✅ Click database → Store updates → URL updates → localStorage persists

3. **Browser back button**
   - ✅ URL changes → URL watcher updates store → UI updates

4. **Share URL with friend**
   - ✅ Friend opens URL → URL watcher reads query → Updates store → UI correct

**No timing issues. No fallbacks. No hacks. Just clean, predictable state management.**
