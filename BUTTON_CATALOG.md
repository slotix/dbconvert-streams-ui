# Button Catalog & Migration Tracking

**Total buttons found:** 191 `<button>` elements across the application

**Migration Goal:** Unify all action buttons to use `BaseButton` component with standardized variants

---

## Migration Status

### ✅ Completed (Phase 1 & 2)
- [x] `WizardLayout.vue` - All wizard navigation buttons (Back, Test, Next/Create, Cancel)
- [x] `StreamsView.vue` - "New Stream Config" button
- [x] `DatabaseExplorerView.vue` - "New Connection" button  
- [x] `StreamDetailsPanel.vue` - Action buttons (Edit, Clone, Start, Delete)
- [x] `ConnectionDetailsPanel.vue` - Action buttons (Edit, Clone, Delete)
- [x] `ConfirmDialog.vue` - Dialog buttons (Cancel, Confirm/Danger)
- [x] `FolderSelectionModal.vue` - Modal buttons (Cancel, Select Folder)

**Total Migrated:** 7 components, ~20 action buttons

### 🟡 High Priority - Main Action Buttons

#### Stream Components
- [ ] `StreamListItem.vue` (6 buttons) - Icon-only action buttons **(Keep as-is - compact icon layout)**
- [ ] `StreamContextMenu.vue` (6 buttons) - Context menu **(Keep as-is - dropdown menu pattern)**
- [ ] `CardItem.vue` (3 buttons) - Card view action buttons
- [ ] `StreamHistoryTableAGGrid.vue` (3 buttons) - History table actions

#### Connection Components
- [x] `ConnectionDetailsPanel.vue` (6 buttons) - **MIGRATED** ✅
- [ ] `AddConnectionWizard.vue` (6 buttons) - Inherits from WizardLayout ✅
- [ ] `EditConnectionWizard.vue` (3 buttons) - Edit wizard buttons

#### Database Explorer
- [ ] `DatabaseOverviewPanel.vue` (4 buttons) - Database panel actions

### 🔵 Medium Priority - Navigation & Controls

#### Modals & Dialogs
- [x] `ConfirmDialog.vue` - **MIGRATED** ✅
- [x] `FolderSelectionModal.vue` (2 buttons) - **MIGRATED** ✅

#### Context Menus & Dropdowns
- [ ] `ExplorerContextMenu.vue` (22 buttons) - File/folder context menu items **(Keep as-is - dropdown pattern)**
- [ ] `ColumnContextMenu.vue` (10 buttons) - Column operations menu **(Keep as-is - dropdown pattern)**
- [ ] `SchemaComparisonPanel.vue` (3 buttons) - Schema diff controls

#### Navigation & Tabs
- [ ] `PaneNavigationTabs.vue` (5 buttons) - Tab navigation **(Keep as-is - tab pattern)**
- [ ] `ExplorerBreadcrumb.vue` (5 buttons) - Breadcrumb navigation **(Keep as-is - link pattern)**
- [ ] `App.vue` (5 buttons) - App-level navigation **(Keep as-is - main nav)**

### 🟢 Low Priority - Utility & Secondary

#### Logs & Monitoring
- [ ] `LogFilters.vue` (12 buttons) - Log filter controls
- [ ] `LogsPanel.vue` (10 buttons) - Log panel controls
- [ ] `FilterToolbar.vue` (6 buttons) - Filter toolbar buttons
- [ ] `LogRow.vue` (2 buttons) - Per-row actions
- [ ] `MonitorHeader.vue` (2 buttons) - Monitor controls
- [ ] `TableStatsCard.vue` (2 buttons) - Stats card actions

#### Modals & Dialogs
- [ ] `FolderSelectionModal.vue` (7 buttons) - Folder picker modal buttons
- [ ] `ConfirmDialog.vue` (? buttons) - Dialog action buttons (Confirm, Cancel)

#### Settings & Data Views
- [ ] `TableList.vue` (4 buttons) - Table list actions
- [ ] `AGGridDataView.vue` (3 buttons) - Data grid controls
- [ ] `AGGridFileDataView.vue` (2 buttons) - File grid controls
- [ ] `DatabaseDiagramD3.vue` (5 buttons) - Diagram controls
- [ ] `Pagination.vue` (2 buttons) - Pagination controls

#### Forms & Inputs
- [ ] `DatabaseTypeStep.vue` (2 buttons) - Database type selection cards
- [ ] `CertificateInput.vue` (2 buttons) - Certificate upload buttons
- [ ] `ConnectionTreeSelector.vue` (3 buttons) - Tree node expand/collapse
- [ ] `UnifiedConnectionParams.vue` (1 button) - Parameter controls
- [ ] `ConnectionParams.vue` (1 button) - Connection param controls
- [ ] `ApiKeyInput.vue` (1 button) - API key reveal/hide
- [ ] `FilePreviewList.vue` (1 button) - File preview controls

---

## Button Classification Guide

### When to Use BaseButton

**✅ USE BaseButton for:**
- **Primary Actions:** Create, Save, Start, Submit, Confirm
- **Secondary Actions:** Cancel, Back, Edit, Clone  
- **Danger Actions:** Delete, Remove, Stop (destructive)
- **Ghost Actions:** Close, Dismiss, View Details (subtle)

**❌ DON'T use BaseButton for:**
- Tab navigation buttons (use teal accent for active state)
- Icon-only utility buttons (copy, reveal, collapse)
- Dropdown/menu items (special styling)
- Context menu items (may need custom styling)
- Link-style navigation (e.g., breadcrumbs)
- Pagination controls (specialized component)

### Variant Mapping

| Old Style                         | New Variant | Use Case                          |
| --------------------------------- | ----------- | --------------------------------- |
| `bg-teal-600`, gradient teal      | `primary`   | Main action (Create, Start, Save) |
| `bg-white border-gray-300`        | `secondary` | Supporting action (Cancel, Back)  |
| `text-red-600 border-red-300`     | `danger`    | Destructive (Delete, Remove)      |
| `text-gray-600 hover:bg-gray-100` | `ghost`     | Tertiary (Close, View)            |

---

## Migration Process

For each component:

1. **Add import:** `import BaseButton from '@/components/base/BaseButton.vue'`
2. **Identify button purpose:** Primary, Secondary, Danger, or Ghost?
3. **Replace with BaseButton:**
   ```vue
   <!-- Before -->
   <button class="px-3 py-1.5 bg-teal-600 text-white...">Create</button>
   
   <!-- After -->
   <BaseButton variant="primary">Create</BaseButton>
   ```
4. **Preserve logic:** Keep `:disabled`, `@click`, `v-if`, `v-tooltip` exactly as-is
5. **Test functionality:** Verify disabled states, click handlers, conditional rendering

---

## Next Steps

1. ✅ Complete Phase 1 (High-visibility action buttons) - **DONE**
2. ✅ Complete Phase 2 (Dialogs & Connection panels) - **DONE**
3. 🚧 Phase 3: Remaining action buttons (CardItem, DatabaseOverviewPanel, etc.)
4. 📋 Phase 4: Document exceptions (icon buttons, context menus, tabs kept as-is)

---

## Notes

- **Icon-only buttons** (StreamListItem, navigation icons) kept as-is - compact layout requires special styling
- **Context menus** kept as-is - dropdown pattern with full-width left-aligned items
- **Tab buttons** kept as-is - design system specifies teal accent for active tabs
- **Breadcrumb navigation** kept as-is - link-style, not action buttons
- **"Explore" buttons** in StreamDetailsPanel use intentional teal branding for feature navigation
- **BaseButton supports loading state** - use `:loading="true"` prop instead of manual spinner

---

## Summary

**Migrated:** 7 components, ~20 action buttons  
**Identified as exceptions:** ~60 buttons (icons, context menus, tabs, navigation)  
**Remaining to migrate:** ~25 high-priority action buttons  
**Total cataloged:** 191 button elements

The design system is being applied systematically with clear guidelines on when to use BaseButton vs. when to keep custom styling for specialized UI patterns.
