# Editable Stream Configuration JSON - Implementation Plan

## Overview
Enable users to directly edit stream configuration JSON as an alternative to the multi-step wizard interface, with full validation and state synchronization.

---

## User Answers to Key Questions

1. **Editing running streams:** Allow editing anytime - user can't start a new stream while one is running anyway
2. **Format JSON button:** Yes, include it
3. **Revert button:** Yes, include it
4. **Validation:** Apply same validation rules as wizard
5. **Error handling:** Handle 404 on save gracefully (no polling for deleted streams)

---

## 1. Feature Requirements

### 1.1 Edit Mode Toggle
- Add "Edit" button next to "Copy" button in read-only mode
- Toggle between read-only JSON display and editable Monaco Editor
- Show different button sets for each mode:
  - **Read-only:** `[Copy] [Edit]`
  - **Edit mode:** `[Revert] [Format JSON] [Cancel] [Save]`

### 1.2 Stream State Validation
- ~~Check if stream is running before allowing edit mode~~ (SIMPLIFIED: allow editing anytime)
- Saved changes will apply on next stream start
- Handle 404 gracefully if stream is deleted while editing

### 1.3 Monaco Editor Integration
- Full-featured JSON editor with:
  - Syntax highlighting (dark theme matching app)
  - Real-time validation
  - Error indicators with inline messages
  - Auto-formatting capability
  - Line numbers
  - Minimap for large configs
  - Auto-expand height (min: 400px, max: 800px, scrollable)

### 1.4 Validation Rules
Must match wizard validation rules exactly:

#### Required Fields
- `id` (string, UUID)
- `name` (string, non-empty)
- `mode` (enum: "convert", "stream")
- `source` (object)
- `target` (object)

#### Source Object
- `id` (string, valid connection ID)
- `database` (string, non-empty)
- `tables` (array, at least one table)
  - Each table: `name` (required), `query` (optional)

#### Target Object
- `id` (string, valid connection ID)
- `spec` (object, varies by target type)
  - For file targets:
    - `files` (object)
      - `outputDirectory` (string, valid path)
      - `fileFormat` (enum: "csv", "jsonl", "parquet")
      - `compression` (enum: "zstd", "gzip", "none")

#### Options Object (optional)
- `compressionType` (string)
- `useDuckDBWriter` (boolean)
- `dataBundleSize` (number, > 0)
- `reportingIntervalSec` (number, >= 1)
- `maxRowsToTransfer` (number, >= 0)
- `maxExecutionTimeSec` (number, >= 0)

#### Immutable Fields
- `id` - Cannot be changed
- `created` - Cannot be changed
- `reportingIntervalSec` - Cannot be changed (system-managed)

### 1.5 Error Handling
- JSON syntax errors (Monaco built-in)
- Schema validation errors (custom validator)
- API errors on save
- Display errors:
  - Inline in Monaco Editor (red squiggles)
  - Summary panel below editor with error list
  - Toast notifications for API errors

---

## 2. Component Architecture

### 2.1 New Components

#### `StreamConfigJsonEditor.vue`
Monaco Editor wrapper component

**Props:**
- `modelValue: object` - Stream configuration object
- `readonly: boolean` - Toggle edit mode
- `height: string` - Editor height (default: "600px")

**Emits:**
- `update:modelValue` - When JSON changes
- `validation-change` - When validation state changes

**Features:**
- JSON schema validation
- Auto-formatting
- Error display
- Dirty state tracking

#### `StreamConfigValidator.ts`
Validation utility module

**Exports:**
- `validateStreamConfig(config: any): ValidationResult`
- `interface ValidationResult { valid: boolean; errors: ValidationError[] }`
- `interface ValidationError { path: string; message: string; line?: number }`

**Validation Functions:**
- `validateRequiredFields()`
- `validateSource()`
- `validateTarget()`
- `validateTables()`
- `validateOptions()`
- `validateConnectionIds()` - Check IDs exist in connections store

### 2.2 Modified Components

#### `StreamConfigurationTab.vue`
Update existing configuration tab

**New State:**
```typescript
const isEditMode = ref(false)
const editedConfig = ref<StreamConfig | null>(null)
const isDirty = ref(false)
const validationErrors = ref<ValidationError[]>([])
const isStreamRunning = computed(() => /* check stream status */)
```

**New Methods:**
```typescript
function enterEditMode()
function exitEditMode()
function handleSave()
function handleCancel()
function handleRevert()
function handleFormat()
function checkUnsavedChanges()
```

**Layout Changes:**
- Replace read-only `<pre>` with conditional rendering
- Show Monaco editor when `isEditMode === true`
- Update button layout based on mode
- Add validation error summary section
- Add "Stream must be stopped" warning

---

## 3. State Management

### 3.1 New Store Actions

#### `stores/streams.ts` (create if doesn't exist)

```typescript
interface StreamsState {
  streams: StreamConfig[]
  currentStream: StreamConfig | null
  loading: boolean
  error: string | null
}

// Actions
async fetchStreams()
async fetchStreamById(id: string)
async updateStreamConfig(id: string, config: StreamConfig)
async deleteStream(id: string)
```

### 3.2 Store Integration
- Update `streamConfig.ts` store if it manages individual stream state
- Ensure reactivity between stores
- Handle optimistic updates with rollback on error

---

## 4. API Integration

### 4.1 Endpoints

#### Update Stream Configuration
```
PUT /api/v1/streams/:id
Headers: { 'X-API-Key': apiKey }
Body: StreamConfig (JSON)
Response: Updated StreamConfig
```

### 4.2 API Client Updates

**File:** `src/api/streams.ts`

Add/verify methods:
```typescript
export async function updateStream(
  id: string,
  config: StreamConfig
): Promise<StreamConfig>

export async function getStreamStatus(
  id: string
): Promise<{ status: string; isRunning: boolean }>
```

---

## 5. User Experience Flow

### 5.1 Edit Flow

1. User views stream configuration (read-only JSON)
2. User clicks "Edit" button
   - Check if stream is running
   - If running: Show error notification, prevent edit
   - If stopped: Enter edit mode
3. Monaco editor loads with current configuration
4. User edits JSON
   - Real-time syntax validation
   - Schema validation on change (debounced 500ms)
   - Show errors inline and in summary
5. User clicks one of:
   - **Revert:** Restore to last saved version
   - **Format JSON:** Prettify with 2-space indent
   - **Cancel:** Exit edit mode (warn if dirty)
   - **Save:** Validate + API call + update store
6. On successful save:
   - Exit edit mode
   - Show success toast
   - Refresh stream data
7. On save error:
   - Stay in edit mode
   - Show error toast with details
   - Keep user's edits

### 5.2 Visual States

#### Read-only Mode
- Gray border
- Syntax-highlighted JSON (using existing highlightjs)
- Buttons: `[Copy] [Edit]`

#### Edit Mode
- Teal-500 border (indicating active editing)
- Monaco editor with dark theme
- Header: "Editing Configuration" with unsaved indicator (*)
- Buttons: `[Revert] [Format JSON] [Cancel] [Save]`
- Validation errors section below editor (if errors exist)

#### Stream Running State
- ~~"Edit" button disabled~~ (SIMPLIFIED: always allow editing)
- Info text: "Changes will apply on next stream start"

---

## 6. Validation Implementation

### 6.1 Client-Side Schema

Create JSON schema for stream configuration:

**File:** `src/schemas/streamConfigSchema.ts`

```typescript
export const streamConfigSchema = {
  type: 'object',
  required: ['id', 'name', 'mode', 'source', 'target'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', minLength: 1 },
    mode: { type: 'string', enum: ['convert', 'stream'] },
    source: { /* ... */ },
    target: { /* ... */ },
    options: { /* ... */ }
  }
}
```

### 6.2 Validation Triggers

- **On change:** Debounced validation (500ms after last keystroke)
- **On format:** Immediate validation
- **On save:** Full validation before API call
- **On blur:** Optional validation

### 6.3 Error Display

#### Monaco Inline Errors
```typescript
monaco.editor.setModelMarkers(model, 'streamConfig', markers)
// markers: { startLineNumber, endLineNumber, message, severity }
```

#### Error Summary Panel
```vue
<div v-if="validationErrors.length" class="error-summary">
  <h4>Validation Errors ({{ validationErrors.length }})</h4>
  <ul>
    <li v-for="error in validationErrors" @click="jumpToError(error)">
      {{ error.path }}: {{ error.message }}
    </li>
  </ul>
</div>
```

---

## 7. Dirty State & Unsaved Changes

### 7.1 Dirty Detection
```typescript
const originalConfig = ref<string>('')
const currentConfig = ref<string>('')

const isDirty = computed(() => {
  return originalConfig.value !== currentConfig.value
})
```

### 7.2 Unsaved Changes Warning

**On Cancel:**
```typescript
function handleCancel() {
  if (isDirty.value) {
    if (confirm('Discard unsaved changes?')) {
      exitEditMode()
    }
  } else {
    exitEditMode()
  }
}
```

**On Route Leave:**
```typescript
onBeforeRouteLeave((to, from, next) => {
  if (isEditMode.value && isDirty.value) {
    const answer = confirm('You have unsaved changes. Leave anyway?')
    next(answer)
  } else {
    next()
  }
})
```

---

## 8. Monaco Editor Configuration

### 8.1 Editor Options

```typescript
{
  theme: 'vs-dark',
  language: 'json',
  automaticLayout: true,
  minimap: { enabled: true },
  scrollBeyondLastLine: false,
  fontSize: 13,
  lineNumbers: 'on',
  folding: true,
  formatOnPaste: true,
  formatOnType: true,
  tabSize: 2,
  insertSpaces: true,
  wordWrap: 'on',
  readOnly: !isEditMode.value
}
```

### 8.2 Monaco Integration Points

- Use existing `src/components/monaco/MonacoEditor.vue`
- Enhance with JSON schema validation
- Add custom validation markers
- Implement format command

---

## 9. Implementation Steps & Order

### Phase 1: Foundation (Steps 1-3)
1. **Create validation module**
   - `src/utils/StreamConfigValidator.ts`
   - Implement validation functions
   - Write unit tests

2. **Create/enhance streams store**
   - `src/stores/streams.ts`
   - Add `updateStreamConfig()` action
   - Add error handling

3. **Verify/add API method**
   - `src/api/streams.ts`
   - Ensure `updateStream()` exists
   - Test with backend

### Phase 2: Editor Component (Steps 4-5)
4. **Enhance Monaco Editor component**
   - Add JSON schema support
   - Add validation marker integration
   - Add format command
   - Test standalone

5. **Create StreamConfigJsonEditor wrapper**
   - Wrap Monaco with validation logic
   - Add error display
   - Add dirty state tracking
   - Test with sample configs

### Phase 3: Integration (Steps 6-7)
6. **Modify StreamConfigurationTab.vue**
   - Add edit mode state
   - Add button layout for both modes
   - Add stream status check
   - Integrate editor component

7. **Add unsaved changes protection**
   - Implement beforeunload warning
   - Implement route guard
   - Add cancel confirmation

### Phase 4: Polish & Testing (Steps 8-9)
8. **Add visual polish**
   - Edit mode borders and indicators
   - Loading states
   - Success/error notifications
   - Disabled states for running streams

9. **Comprehensive testing**
   - Test all validation rules
   - Test with invalid JSON
   - Test with running/stopped streams
   - Test unsaved changes warnings
   - Test round-trip: wizard → JSON → save → refresh
   - Test concurrent edits scenario

---

## 10. Edge Cases & Error Scenarios

### 10.1 Stream State
- ~~**Stream starts while editing:**~~ (SIMPLIFIED: allow editing anytime)
- **Stream deleted while editing:** Handle 404 on save, show error, redirect to streams list

### 10.2 Validation Failures
- **Invalid connection ID:** Show error "Connection not found: {id}"
- **Malformed table query:** Show error "Invalid SQL syntax in table query"
- **Missing required fields:** Show error "Required field missing: {field}"

### 10.3 API Failures
- **Network error:** Show retry option
- **Permission denied:** Show error with explanation
- **Conflict (409):** Show error "Configuration modified by another user"

### 10.4 Data Consistency
- **Edited config conflicts with wizard:** Warn user, prefer JSON editor version
- **Backend returns different config:** Show diff, ask user to review

---

## 11. Testing Strategy

### 11.1 Unit Tests (Vitest)

**Test Files:**
- `StreamConfigValidator.test.ts`
  - Test all validation rules
  - Test edge cases (empty arrays, null values, etc.)
  - Test error message formatting

- `StreamConfigJsonEditor.test.ts`
  - Test dirty state tracking
  - Test validation integration
  - Test format functionality

### 11.2 E2E Tests (Playwright)

**Test Scenarios:**
- Edit and save valid configuration
- Attempt to edit running stream (should fail)
- Edit with invalid JSON (should show errors)
- Edit with missing required fields (should show errors)
- Cancel with unsaved changes (should warn)
- Revert to last saved
- Format JSON

**Test File:** `tests/e2e/stream-config-editing.spec.ts`

---

## 12. File Structure Summary

```
src/
├── components/
│   ├── monaco/
│   │   └── MonacoEditor.vue (enhance)
│   └── stream/
│       ├── StreamConfigurationTab.vue (modify - add edit mode)
│       └── StreamConfigJsonEditor.vue (new - wrapper with validation)
│
├── stores/
│   └── streams.ts (create - stream CRUD operations)
│
├── api/
│   └── streams.ts (verify/add updateStream method)
│
├── utils/
│   └── StreamConfigValidator.ts (new - validation logic)
│
├── schemas/
│   └── streamConfigSchema.ts (new - JSON schema)
│
└── __tests__/
    └── unit/
        ├── StreamConfigValidator.test.ts (new)
        └── StreamConfigJsonEditor.test.ts (new)

tests/
└── e2e/
    └── stream-config-editing.spec.ts (new)
```

---

## 13. Dependencies

### Required Packages (Already Installed)
- `monaco-editor` - Already in use for SQL editor
- `monaco-editor-webpack-plugin` or Vite equivalent
- JSON schema validator (may need to add)

### Potential New Dependencies
- `ajv` (JSON schema validator) - if not already present
- Or use built-in Monaco JSON validation

---

## 14. Accessibility

- Keyboard navigation in Monaco editor (built-in)
- ARIA labels for buttons
- Error announcements for screen readers
- Focus management when entering/exiting edit mode

---

## 15. Performance Considerations

- Debounce validation (500ms)
- Lazy-load Monaco editor (only when edit mode activated)
- Dispose Monaco instance when exiting edit mode
- Limit editor height with scroll for large configs

---

## 16. Future Enhancements (Out of Scope)

- Diff view showing changes before save
- Version history / rollback functionality
- Multi-stream bulk editing
- Export/import stream configurations
- Template library for common configurations

---

## 17. Success Criteria

✅ Users can edit stream configuration JSON when stream is stopped
✅ Validation matches wizard rules exactly
✅ Real-time validation feedback in editor
✅ Unsaved changes are protected with warnings
✅ Format JSON button works correctly
✅ Revert restores last saved configuration
✅ API updates persist correctly
✅ Error messages are clear and actionable
✅ No data loss during editing flow
✅ E2E tests pass for all scenarios

---

## 18. Timeline Estimate

**Phase 1 (Foundation):** ~2-3 hours
**Phase 2 (Editor Component):** ~3-4 hours
**Phase 3 (Integration):** ~2-3 hours
**Phase 4 (Polish & Testing):** ~2-3 hours

**Total:** ~9-13 hours of development time

---

## Notes

- Ensure MongoDB editor component patterns are consistent with SQL editor
- Maintain dark theme consistency throughout
- Follow existing Tailwind/Headless UI patterns
- Reuse notification system (Vue Toastification)
- Follow existing error handling patterns in stores
