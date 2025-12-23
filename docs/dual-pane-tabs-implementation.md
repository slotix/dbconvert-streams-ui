# Dual Independent Pane Navigation Tabs Implementation Plan

## Overview
Transform the Data Explorer from a single shared tab system into dual independent panes, each with:
- Its own navigation tab bar (replacing the current global ExplorerTabs)
- Its own breadcrumb navigation
- Preview tab (single-click, dashed border) + pinned tabs (explicit pin, solid border)
- Completely independent state management
- Extensible to 3+ panes in the future (e.g., middlePaneTabs)

## Key Architectural Decisions

### 1. **Unified Component Architecture**
Instead of creating separate components for left/right panes, we create **generic, reusable components** that accept a `paneId` prop. This allows:
- Easy addition of third pane (middle, bottom, etc.) without code duplication
- Consistent behavior across all panes
- Simpler maintenance and testing

### 2. **No Backward Compatibility Required**
- Old code (`tabs.ts`, `ExplorerTabs.vue`) will be completely removed after implementation
- Clean slate approach - no migration path needed
- Simplified implementation without legacy support burden

### 3. **Simplified Tab Icons**
- Show only object type icon (table/view/file)
- Remove data/structure view indicator from tabs
- Keep UI cleaner and more focused

## Architecture Design

### Store Structure: `paneTabs.ts`

```typescript
// Core types
export type PaneId = 'left' | 'right' // Extensible: 'middle', 'bottom', etc.

export type PaneTab = {
  id: string
  connectionId: string
  name: string
  tabType: 'database' | 'file'
  pinned: boolean

  // Database-specific
  database?: string
  schema?: string
  type?: 'table' | 'view'
  meta?: SQLTableMeta | SQLViewMeta

  // File-specific
  filePath?: string
  fileEntry?: FileSystemEntry
  fileType?: string
}

export interface PaneState {
  pinnedTabs: PaneTab[]
  previewTab: PaneTab | null
  activePinnedIndex: number | null
}

// Store state
{
  panes: Map<PaneId, PaneState>
  activePane: PaneId
  visiblePanes: Set<PaneId>  // Track which panes are shown
}

// Store actions (all accept paneId as first parameter)
- addTab(paneId: PaneId, tab: PaneTab)
- closeTab(paneId: PaneId, index: number)
- closeOtherTabs(paneId: PaneId, keepIndex: number)
- closeAllTabs(paneId: PaneId)
- activateTab(paneId: PaneId, index: number)
- setPreviewTab(paneId: PaneId, tab: PaneTab | null)
- setActivePane(paneId: PaneId)
- showPane(paneId: PaneId)
- hidePane(paneId: PaneId)
- getPaneState(paneId: PaneId): PaneState
- hasPaneContent(paneId: PaneId): boolean
```

### Component Structure

#### 1. **`PaneNavigationTabs.vue`** (New, Reusable)
Generic tab bar component that works for any pane.

```vue
<template>
  <div class="mb-2" :data-pane-id="paneId">
    <div class="flex items-center gap-1">
      <!-- Preview tab (dashed border) -->
      <button
        v-if="currentPreview"
        class="px-2 py-1 text-xs rounded border border-dashed border-gray-300
               bg-white text-gray-600 italic transition hover:border-gray-400"
        @click="$emit('activate-preview')"
      >
        {{ currentPreview.name }} (Preview)
      </button>

      <!-- Pinned tabs (solid border) -->
      <button
        v-for="(tab, i) in pinnedTabs"
        :key="tab.id"
        :class="[
          'group flex items-center gap-2 rounded border bg-white px-2 py-1 text-xs',
          isActive(i)
            ? 'border-slate-400 ring-1 ring-slate-400 bg-gray-50'
            : 'border-gray-300 hover:bg-gray-50'
        ]"
        @click="$emit('activate-tab', i)"
        @contextmenu.prevent="showContextMenu($event, i)"
      >
        <!-- Object type icon only (no data/structure indicator) -->
        <component :is="getObjectIcon(tab)" class="h-4 w-4 text-slate-500" />
        <span class="truncate font-medium text-gray-900">{{ tab.name }}</span>
        <X
          class="h-4 w-4 text-gray-500 hover:text-gray-700 cursor-pointer"
          @click.stop="$emit('close-tab', i)"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Eye, File, Sheet, X } from 'lucide-vue-next'
import { usePaneTabsStore } from '@/stores/paneTabs'
import type { PaneId } from '@/stores/paneTabs'

const props = defineProps<{
  paneId: PaneId
  isActive: boolean  // Visual indicator for active pane
}>()

const emit = defineEmits<{
  'activate-preview': []
  'activate-tab': [index: number]
  'close-tab': [index: number]
}>()

const store = usePaneTabsStore()
const paneState = computed(() => store.getPaneState(props.paneId))
const pinnedTabs = computed(() => paneState.value.pinnedTabs)
const currentPreview = computed(() => paneState.value.previewTab)

function isActive(index: number) {
  return paneState.value.activePinnedIndex === index
}

function getObjectIcon(tab: PaneTab) {
  if (tab.tabType === 'file') return File
  return tab.type === 'view' ? Eye : Sheet
}

function showContextMenu(event: MouseEvent, index: number) {
  // Show context menu: Close, Close Others, Close All
}
</script>
```

**Props:**
- `paneId: PaneId` - Which pane this tab bar belongs to
- `isActive: boolean` - Whether this is the currently active pane

**Emits:**
- `activate-preview` - User clicked preview tab
- `activate-tab: [index]` - User clicked pinned tab
- `close-tab: [index]` - User closed a tab

#### 2. **`PaneBreadcrumb.vue`** (New, Reusable)
Generic breadcrumb component that works for any pane.

```vue
<template>
  <div class="mb-3 px-2" :data-pane-id="paneId">
    <ExplorerBreadcrumb
      v-if="breadcrumbData.database"
      :database="breadcrumbData.database"
      :schema="breadcrumbData.schema"
      :type="breadcrumbData.type"
      :name="breadcrumbData.name"
      :objects="breadcrumbData.objects"
      @navigate="$emit('navigate', $event)"
      @pick-name="$emit('pick-name', $event)"
    />
    <div v-else-if="breadcrumbData.filePath" class="text-sm text-gray-600">
      <span class="text-gray-500">File:</span>
      <span class="font-medium text-gray-900 ml-1">{{ breadcrumbData.fileName }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ExplorerBreadcrumb from '@/components/database/ExplorerBreadcrumb.vue'
import { usePaneTabsStore } from '@/stores/paneTabs'
import type { PaneId } from '@/stores/paneTabs'

const props = defineProps<{
  paneId: PaneId
  // Additional props for breadcrumb data from active tab
}>()

const emit = defineEmits<{
  navigate: [payload: { level: string }]
  'pick-name': [payload: { name: string, type: string, schema?: string }]
}>()
</script>
```

#### 3. **`ExplorerSplitPane.vue`** (Modified)
Updated to support multiple panes with tab bars and breadcrumbs.

```vue
<template>
  <!-- Left pane (always visible) -->
  <div
    :class="[
      'pane',
      isLeftActive ? 'pane-active' : 'pane-inactive'
    ]"
    @mousedown="$emit('set-active-pane', 'left')"
  >
    <slot name="left-tabs" />
    <slot name="left-breadcrumb" />
    <slot name="left-content" />
  </div>

  <!-- Divider (only when right pane visible) -->
  <div v-if="hasRightPane" class="divider" />

  <!-- Right pane (conditional) -->
  <div
    v-if="hasRightPane"
    :class="[
      'pane',
      isRightActive ? 'pane-active' : 'pane-inactive'
    ]"
    @mousedown="$emit('set-active-pane', 'right')"
  >
    <slot name="right-tabs" />
    <slot name="right-breadcrumb" />
    <slot name="right-content" />

    <!-- Close right pane button -->
    <button
      class="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded"
      @click="$emit('close-right-pane')"
    >
      <XMarkIcon class="h-4 w-4" />
    </button>
  </div>
</template>

<style scoped>
.pane {
  position: relative;
  border: 2px solid transparent;
  border-radius: 4px;
  transition: border-color 0.2s;
}

.pane-active {
  border-color: #64748b; /* slate-500 */
}

.pane-inactive {
  border-color: #e5e7eb; /* gray-200 */
}
</style>
```

#### 4. **`DatabaseExplorerView.vue`** (Modified)
Main view orchestrating the dual pane system.

Key changes:
- Replace `useTabsStore()` with `usePaneTabsStore()`
- Handle pane activation
- Render two instances of `PaneNavigationTabs` and `PaneBreadcrumb`
- Update all tab operations to specify pane

```typescript
// Example handler changes
function handleOpenFromTree(payload: {
  connectionId: string
  database: string
  schema?: string
  type: 'table' | 'view'
  name: string
  meta: SQLTableMeta | SQLViewMeta
  targetPane?: PaneId  // NEW: which pane to open in
}) {
  const paneId = payload.targetPane || 'left'

  // Show right pane if needed
  if (paneId === 'right') {
    paneTabsStore.showPane('right')
  }

  // Add tab to specified pane
  paneTabsStore.addTab(paneId, {
    id: generateTabId(payload),
    connectionId: payload.connectionId,
    database: payload.database,
    schema: payload.schema,
    name: payload.name,
    type: payload.type,
    meta: payload.meta,
    tabType: 'database',
    pinned: false  // Start as preview
  })

  // Set as active pane
  paneTabsStore.setActivePane(paneId)
}
```

#### 5. **`ExplorerSidebarConnections.vue`** (Modified)
Add context menu to open in specific pane.

```vue
<!-- Context menu additions -->
<div class="context-menu-item" @click="openInPane(item, 'left')">
  Open in Left Pane
</div>
<div class="context-menu-item" @click="openInPane(item, 'right')">
  Open in Right Pane
</div>
```

**Interaction patterns:**
- **Single-click**: Select item (no tab opened)
- **Double-click**: Open in left pane as preview
- **Ctrl+Click**: Open in right pane as preview
- **Context menu**: Choose pane explicitly

## Implementation Phases

### Phase 1: Core Dual Pane System (Essential)

#### Step 1: Create Store
**File:** `src/stores/paneTabs.ts`
- Define types: `PaneId`, `PaneTab`, `PaneState`
- Implement all store actions
- Add helper methods: `hasPaneContent()`, `getPaneState()`, etc.

#### Step 2: Create Reusable Components
**Files:**
- `src/components/explorer/PaneNavigationTabs.vue`
- `src/components/explorer/PaneBreadcrumb.vue`

Features:
- Generic `paneId` prop
- Tab rendering (preview + pinned)
- Context menu (Close, Close Others, Close All)
- Active pane visual indicator

#### Step 3: Update ExplorerSplitPane
**File:** `src/components/explorer/ExplorerSplitPane.vue`
- Add named slots: `left-tabs`, `left-breadcrumb`, `left-content`
- Add named slots: `right-tabs`, `right-breadcrumb`, `right-content`
- Add pane active/inactive styling
- Add close right pane button

#### Step 4: Update ExplorerContentArea
**File:** `src/components/explorer/ExplorerContentArea.vue`
- Pass tab bars to split pane slots
- Pass breadcrumbs to split pane slots
- Remove global breadcrumb (now per-pane)

#### Step 5: Update DatabaseExplorerView
**File:** `src/views/DatabaseExplorerView.vue`
- Replace `useTabsStore()` with `usePaneTabsStore()`
- Update all handlers to accept `targetPane` parameter
- Handle pane activation on user interaction
- Manage right pane visibility based on content

#### Step 6: Update Sidebar
**File:** `src/components/database/ExplorerSidebarConnections.vue`
- Add context menu: "Open in Left Pane" / "Open in Right Pane"
- Implement Ctrl+Click to open in right pane
- Default double-click opens in left pane

### Phase 2: Enhanced Features (Important)

#### Step 7: Tab Context Menu
Implement full context menu for tabs:
- **Close**: Close specific tab
- **Close Others**: Close all other tabs in pane
- **Close All**: Close all tabs in pane

#### Step 8: Keyboard Shortcuts
- `Ctrl+Tab` / `Ctrl+Shift+Tab`: Cycle tabs within active pane
- `Ctrl+W`: Close active tab in active pane
- `Ctrl+Shift+W`: Close all tabs in active pane
- `Ctrl+1`: Activate left pane
- `Ctrl+2`: Activate right pane

#### Step 9: Pane Lifecycle Management
- Right pane auto-hides when all tabs closed
- Smooth transitions for pane appearance/disappearance
- Prevent closing left pane (always visible)

### Phase 3: Cleanup (Essential)

#### Step 10: Remove Dead Code
**Delete files:**
- `src/components/explorer/ExplorerTabs.vue` ❌
- `src/stores/tabs.ts` ❌
- `src/stores/splitView.ts` ❌ (if fully replaced)

**Update files:**
- Remove imports of deleted files
- Remove any fallback logic for old store
- Clean up unused props/emits

#### Step 11: State Persistence
- Persist pinned tabs per pane to localStorage
- Persist active pane
- Persist visible panes set
- Restore on page reload

#### Step 12: Documentation & Testing
- Update component documentation
- Add inline code comments
- Test all tab operations
- Test pane switching
- Test keyboard shortcuts
- Test state persistence

## File Changes Summary

### New Files
- ✅ `src/stores/paneTabs.ts` - Unified pane tab management
- ✅ `src/components/explorer/PaneNavigationTabs.vue` - Generic tab bar
- ✅ `src/components/explorer/PaneBreadcrumb.vue` - Generic breadcrumb wrapper
- ✅ `docs/dual-pane-tabs-implementation.md` - This document

### Modified Files
- 🔧 `src/components/explorer/ExplorerSplitPane.vue` - Add slots for tabs/breadcrumbs
- 🔧 `src/components/explorer/ExplorerContentArea.vue` - Integrate dual panes
- 🔧 `src/views/DatabaseExplorerView.vue` - Use new store, handle panes
- 🔧 `src/components/database/ExplorerSidebarConnections.vue` - Add context menu
- 🔧 `src/components/database/tree/ObjectList.vue` - Context menu support

### Deleted Files (After Implementation)
- ❌ `src/components/explorer/ExplorerTabs.vue` - Replaced by PaneNavigationTabs
- ❌ `src/stores/tabs.ts` - Replaced by paneTabs
- ❌ `src/stores/splitView.ts` - Merged into paneTabs (if applicable)

## Success Criteria

### Must Have ✅
- ✅ Two independent tab bars (left and right panes)
- ✅ Two independent breadcrumbs (left and right panes)
- ✅ Preview tab (dashed border) + pinned tabs (solid border) per pane
- ✅ Right pane appears when content added, disappears when all tabs closed
- ✅ Active pane has visual indicator (border highlight)
- ✅ Context menu on tabs: Close, Close Others, Close All
- ✅ Tree context menu: Open in Left/Right Pane
- ✅ Ctrl+Click opens in right pane
- ✅ Tab icons show only object type (no data/structure indicator)
- ✅ All old dead code removed

### Nice to Have 🎯
- 🎯 Keyboard shortcuts (Ctrl+Tab, Ctrl+W, etc.)
- 🎯 State persistence across page reloads
- 🎯 Smooth transitions for pane show/hide
- 🎯 Close right pane button

ℹ️ Persisted AG Grid filter/sort state now lives only as long as the tab stays open. Closing a tab (or preview) clears its stored filters so reopening that object starts from a clean slate, while browser reloads still restore the state for tabs that remained open.

### Future Enhancements 🚀 (Out of Scope)
- Drag-and-drop tab reordering within pane
- Drag-and-drop tabs between panes
- Third pane (middle) support
- Vertical split option
- Tab groups/colors

## Design Principles

1. **Reusability**: Single component works for any pane (left, right, future middle)
2. **Independence**: Each pane manages its own state completely independently
3. **Extensibility**: Easy to add third pane without major refactoring
4. **Cleanliness**: Remove all old code, no backward compatibility needed
5. **Simplicity**: Tab icons show only essential info (object type)

## Benefits of This Approach

### 1. Scalability
Adding a third pane (middle, bottom, etc.) requires:
- Add `'middle'` to `PaneId` type
- Initialize pane state in store
- Render another `<PaneNavigationTabs paneId="middle" />` and `<PaneBreadcrumb paneId="middle" />`
- No component changes needed!

### 2. Maintainability
- Single source of truth for tab behavior
- Bug fixes apply to all panes automatically
- Consistent UX across all panes

### 3. Testability
- Test one component, covers all panes
- Easier to write unit tests
- Simpler integration tests

### 4. Performance
- No code duplication
- Smaller bundle size
- Vue can reuse component instances efficiently

## Implementation Status

### ✅ Phase 1: Core System (COMPLETED)
1. ✅ Created `paneTabs.ts` store with dual pane state management
2. ✅ Created `PaneNavigationTabs.vue` reusable component with context menu
3. ✅ Created `PaneBreadcrumb.vue` reusable component
4. ✅ Updated `ExplorerSplitPane.vue` with tab/breadcrumb slots and pane borders
5. ✅ Updated `ExplorerContentArea.vue` to integrate dual panes
6. ✅ Updated `DatabaseExplorerView.vue` to use new paneTabs store

### ✅ Phase 2: Enhanced Features (COMPLETED)
- ✅ Tab context menu in `PaneNavigationTabs.vue`: Close, Close Others, Close All
- ✅ Context menu in `ExplorerContextMenu.vue`: "Open in Right Pane" options
- ✅ Sidebar already supports `openInRightSplit` parameter
- ✅ Pane lifecycle: Right pane auto-show/hide based on content
- ✅ Active pane visual indicator: Border highlight (slate-500 active, gray-200 inactive)

### ✅ Phase 3: Cleanup (COMPLETED)
- ✅ Deleted old files: `ExplorerTabs.vue`, `tabs.ts`, `splitView.ts`
- ✅ Fixed TypeScript errors in DatabaseExplorerView.vue
- ✅ Removed unused imports

### 🚧 Optional Enhancements (Not Required for MVP)
- ⏳ **Keyboard shortcuts**: Ctrl+Tab, Ctrl+W, Ctrl+1/2 for pane switching
- ✅ **State persistence**: localStorage for tabs/panes across page reloads
- ⏳ **Drag and drop**: Reorder tabs within pane or move between panes
- ⏳ **Comprehensive testing**: Unit and integration tests

### Ready for Testing ✅
The core dual pane tab system is now fully implemented and ready for user testing.

## Questions & Decisions Log

**Q: Why not separate left/right components?**
A: Reusable generic component is more maintainable and enables easy addition of 3rd pane.

**Q: Should we keep backward compatibility?**
A: No - clean slate approach, remove all old code after implementation.

**Q: What icons should tabs show?**
A: Only object type icon (table/view/file). Remove data/structure view indicator for cleaner UI.

**Q: How should breadcrumbs behave?**
A: Both visible when split view active. Each independently navigable within its pane.

**Q: When should right pane appear/disappear?**
A: Appears when first tab added. Disappears when all tabs (preview + pinned) closed.

**Q: How to indicate active pane?**
A: Subtle border highlight - active gets slate-500 border, inactive gets gray-200.
