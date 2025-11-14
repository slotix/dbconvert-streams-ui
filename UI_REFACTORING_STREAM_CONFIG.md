# DBConvert Streams UI - Stream Configuration Refactoring Summary

## Overview
The UI codebase currently uses an old stream configuration structure that needs to be refactored to align with the backend's new structure. The old structure mixes stream-level and target-specific configuration together, while the new structure separates concerns into `source`, `target`, and stream-level properties.

## Current Structure (OLD - What Exists in UI)

The UI's `StreamConfig` type currently has:
- **Top-level fields**: `id`, `name`, `mode`, `description`, `created`, `reportingInterval`, `limits`
- **File/Output fields at stream level**: `targetFileFormat`, `compressionType`, `useDuckDBWriter`, `subDirectory`
- **Legacy fields**: `tables`, `files` (for compatibility)
- **Nested in targetOptions**: `parquetConfig`, `csvConfig`, `snowflakeConfig`, `s3UploadConfig`, `performanceConfig`

## Target Structure (NEW - Backend Aligned)

Per the refactoring documented in the backend:

```typescript
export interface StreamConfig {
  id?: string
  name: string
  mode: 'cdc' | 'convert'
  description?: string
  created?: number
  reportingInterval?: number  // Unified reporting interval
  source: SourceConfig        // Contains id, tables, options
  target: TargetConfig        // Contains id, fileFormat, subDirectory, options
  limits?: Limits
}

export interface SourceConfig {
  id: string
  tables?: Table[]
  options?: SourceOptions
}

export interface TargetConfig {
  id: string
  fileFormat?: 'csv' | 'json' | 'jsonl' | 'parquet'
  subDirectory?: string
  options?: TargetOptions
}

export interface TargetOptions {
  stagingDirectory?: string
  compressionType?: 'uncompressed' | 'gzip' | 'zstd' | 'none'
  workerPoolSize?: number
  structureOptions?: { tables, indexes, foreignKeys }
  skipData?: boolean
  useDuckDBWriter?: boolean
  parquetConfig?: ParquetConfig
  csvConfig?: CSVConfig
  snowflakeConfig?: SnowflakeConfig
  s3UploadConfig?: S3UploadConfig
  performanceConfig?: PerformanceConfig
}
```

## Key Changes Required

### 1. Type Definition Changes
**File**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/types/streamConfig.ts`

**Changes**:
- Add `SourceConfig` and `TargetConfig` types (already partially defined)
- Move `targetFileFormat` from root to `TargetConfig.fileFormat`
- Move `compressionType` from root to `TargetConfig.options.compressionType`
- Move `useDuckDBWriter` from root to `TargetConfig.options.useDuckDBWriter`
- Replace `dataBundleSize` with `source.options.dataBundleSize` and `target.options.performanceConfig.batchSize`
- Replace `reportingIntervals` object with single `reportingInterval` number
- Replace `operations` array with `source.options.operations`
- Replace `source`/`target` string IDs with `source: SourceConfig` and `target: TargetConfig`
- Move `tables` from root to `source.tables`
- Move `structureOptions` from root to `target.options.structureOptions`

### 2. Store Updates
**File**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/stores/streamConfig.ts`

**Changes**:
- Update `defaultStreamConfigOptions` to match new structure
- Update `omitDefaults()` function to handle nested structure
- Update `setCurrentStream()` to handle new source/target objects
- Update `updateSource()` to set source object (currently sets string)
- Update `updateTarget()` to set target object and file format in correct location
- Update `generateDefaultStreamConfigName()` to read `source.id` and `target.id`
- Update `prepareStreamData()` to ensure proper nesting

### 3. Component Updates

#### Stream Settings (`/src/components/settings/StreamSettings.vue`)
- Update `targetFileFormat` getter/setter to use `currentStreamConfig.target.fileFormat`
- Update `compressionType` to use `currentStreamConfig.target.options.compressionType`
- Update `useDuckDBWriter` to use `currentStreamConfig.target.options.useDuckDBWriter`
- Update `dataBundleSize` to use correct path in source/target options
- Update `reportingIntervalsSource` and `reportingIntervalsTarget` to handle unified `reportingInterval`

#### File Output Summary (`/src/components/stream/configuration/FileOutputSummary.vue`)
- Update references to `stream.targetFileFormat` → `stream.target.fileFormat`
- Update references to `stream.compressionType` → `stream.target.options.compressionType`

#### Stream Configuration Step (`/src/components/stream/wizard/steps/StreamConfigurationStep.vue`)
- Update `isFileTarget` computed property to check `target.id`
- Update `targetFileFormat` computed property to use `target.fileFormat`
- Update `compressionType` computed property path

#### Stream Comparison (`/src/components/stream/StreamCompareView.vue`)
- Review and update field references for new structure

#### Stream Details Panel (`/src/components/stream/StreamDetailsPanel.vue`)
- Update display logic to read from new structure
- Update `sourceDisplay` to use `stream.source.id` and `stream.sourceDatabase`
- Update `targetDisplay` to use `stream.target.id`

#### Stream Configuration View (`/src/components/stream/StreamConfigurationView.vue`)
- Update file format display to use `stream.target.fileFormat`
- Update compression display to use `stream.target.options.compressionType`
- Update table count computation to use `stream.source.tables`

#### Stream Name Field (`/src/components/stream/wizard/StreamNameField.vue`)
- Update to read `source.id` and `target.id` instead of string IDs

#### Operations Component (`/src/components/settings/Operations.vue`)
- This component reads CDC operations - verify it works with new `source.options.operations`

#### Table List (`/src/components/settings/TableList.vue`)
- Update to read tables from `currentStreamConfig.source.tables`

#### Structure Data Step (`/src/components/stream/wizard/steps/StructureDataStep.vue`)
- Verify structure options mapping to new location

#### Dual Tree Selector (`/src/components/stream/wizard/DualTreeSelector.vue`)
- Verify it correctly handles source/target selection

#### Source Target Selection Step (`/src/components/stream/wizard/steps/SourceTargetSelectionStep.vue`)
- Verify prop passing with `sourceDatabase`, `targetDatabase`

### 4. Composable Updates

#### `useStreamWizard.ts`
- Update `loadFromStreamConfig()` to extract values from new structure:
  - `source.id` instead of `source` string
  - `target.id` instead of `target` string
  - `source.tables` instead of `tables`
  - `target.options.structureOptions` instead of `structureOptions`

#### `useStreamExplorerNavigation.ts`
- Update to check `target.id` for file type detection

### 5. API Layer
**File**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/api/streams.ts`

**Note**: The API layer should work as-is since it uses generic JSON. However, ensure that when creating streams, the payload is correctly structured with the new format.

### 6. Default Configuration
**Current** (`defaultStreamConfigOptions` in store):
```typescript
{
  id: '',
  name: '',
  mode: 'convert',
  dataBundleSize: 500,
  reportingIntervals: { source: 3, target: 3 },
  operations: ['insert', 'update', 'delete'],
  targetFileFormat: undefined,
  compressionType: 'zstd',
  structureOptions: {...},
  limits: { numberOfEvents: 0, elapsedTime: 0 },
  tables: [],
  files: []
}
```

**New** (aligned with backend):
```typescript
{
  id: '',
  name: '',
  mode: 'convert',
  reportingInterval: 3,
  source: {
    id: '',
    tables: [],
    options: {
      dataBundleSize: 500,
      operations: ['insert', 'update', 'delete']
    }
  },
  target: {
    id: '',
    fileFormat: undefined,
    subDirectory: '',
    options: {
      compressionType: 'zstd',
      useDuckDBWriter: false,
      structureOptions: { tables: true, indexes: true, foreignKeys: true },
      performanceConfig: { batchSize: 500 }
    }
  },
  limits: { numberOfEvents: 0, elapsedTime: 0 }
}
```

## Files Needing Updates

### Critical (Type & Core Logic)
1. `/src/types/streamConfig.ts` - Type definitions
2. `/src/stores/streamConfig.ts` - State management and defaults

### High Priority (Primary Components)
3. `/src/components/settings/StreamSettings.vue` - Settings form
4. `/src/components/stream/configuration/FileOutputSummary.vue` - File output display
5. `/src/components/stream/wizard/steps/StreamConfigurationStep.vue` - Wizard step

### Medium Priority (Display & Navigation)
6. `/src/components/stream/StreamDetailsPanel.vue` - Details display
7. `/src/components/stream/StreamConfigurationView.vue` - Config view
8. `/src/components/stream/StreamCompareView.vue` - Comparison view
9. `/src/components/stream/wizard/StreamNameField.vue` - Name generation

### Lower Priority (Supporting Components)
10. `/src/components/settings/Operations.vue` - CDC operations
11. `/src/components/settings/TableList.vue` - Table list display
12. `/src/components/stream/wizard/steps/SourceTargetSelectionStep.vue` - Selection step
13. `/src/components/stream/wizard/steps/StructureDataStep.vue` - Structure options
14. `/src/components/stream/wizard/DualTreeSelector.vue` - Tree selector

### Composables
15. `/src/composables/useStreamWizard.ts` - Wizard state management
16. `/src/composables/useStreamExplorerNavigation.ts` - Navigation logic

## Migration Strategy

### Phase 1: Update Types & Defaults
1. Update `streamConfig.ts` type definitions
2. Update `streamConfig.ts` store defaults
3. Update `omitDefaults()` function

### Phase 2: Update Store Logic
1. Update all computed properties and getters
2. Update action methods
3. Update `generateDefaultStreamConfigName()` to read from new structure

### Phase 3: Update Core Components
1. Update StreamSettings component
2. Update wizard step components
3. Update display components

### Phase 4: Update Composables & Utils
1. Update `useStreamWizard.ts`
2. Update `useStreamExplorerNavigation.ts`
3. Update any other composables

### Phase 5: Testing & Validation
1. Test stream creation (new stream flow)
2. Test stream editing (edit stream flow)
3. Test stream display (all detail views)
4. Test data binding (ensure updates propagate)
5. Test API integration (ensure payloads are correct)

## Breaking Changes for Users

None expected - this is an internal refactoring. The API payloads sent to the backend will change to match the new structure, which is what the backend now expects.

## Testing Checklist

- [ ] Create a new stream with file output (CSV, Parquet, JSONL)
- [ ] Create a new stream with database target
- [ ] Edit existing stream configuration
- [ ] Verify stream details display correctly
- [ ] Verify JSON view shows correct structure
- [ ] Test CDC mode operations selection
- [ ] Test file format and compression selection
- [ ] Test DuckDB writer toggle
- [ ] Test reporting interval settings
- [ ] Test bundle size settings
- [ ] Test clone stream functionality
- [ ] Verify API payloads match expected structure

## Notes

- The `operations` field should only be present/used in CDC mode
- File format is only relevant for file-type targets
- Optional metadata fields (`sourceDatabase`, `targetDatabase`, `sourceSchema`, `targetSchema`, `targetPath`) live at the root of the config so wizard selections persist across sessions, but they do not influence stream execution
- The `reportingInterval` may need to be split back into source/target at the API level, but UI can show them separately
