# UI Stream Configuration Migration - Code Examples

## 1. Type Definition Migration

### Before (Current):
```typescript
// src/types/streamConfig.ts
export interface StreamConfig {
  id?: string
  name: string
  mode: 'cdc' | 'convert'
  description?: string
  created?: number
  reportingInterval?: number
  source: SourceConfig        // Currently SourceConfig is interface with id + tables + options
  target: TargetConfig        // Currently TargetConfig is interface with id + fileFormat + options
  limits?: Limits
  
  // OLD FIELDS (to be removed):
  dataBundleSize?: number
  reportingIntervals?: { source: number; target: number }
  operations?: string[]
  targetFileFormat?: 'csv' | 'json' | 'jsonl' | 'parquet'
  compressionType?: 'uncompressed' | 'gzip' | 'zstd' | 'none'
  tables?: Table[]
  files?: FileEntry[]
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
```

### After (New):
```typescript
// src/types/streamConfig.ts
export interface StreamConfig {
  id?: string
  name: string
  mode: 'cdc' | 'convert'
  description?: string
  created?: number
  reportingInterval?: number
  source: SourceConfig
  target: TargetConfig
  limits?: Limits
  
  // Index signature for future extensions only
  [key: string]: unknown
}

// SourceConfig already properly defined
export interface SourceConfig {
  id: string
  tables?: Table[]
  options?: SourceOptions
}

// TargetConfig already properly defined
export interface TargetConfig {
  id: string
  fileFormat?: 'csv' | 'json' | 'jsonl' | 'parquet'
  subDirectory?: string
  options?: TargetOptions
}
```

## 2. Store Default Migration

### Before (Current):
```typescript
// src/stores/streamConfig.ts
export const defaultStreamConfigOptions: StreamConfig = {
  id: '',
  name: '',
  mode: 'convert',
  dataBundleSize: 500,
  reportingIntervals: { source: 3, target: 3 },
  operations: ['insert', 'update', 'delete'],
  targetFileFormat: undefined,
  compressionType: 'zstd',
  structureOptions: {
    tables: true,
    indexes: true,
    foreignKeys: true
  },
  limits: { numberOfEvents: 0, elapsedTime: 0 },
  tables: [],
  files: []
}
```

### After (New):
```typescript
// src/stores/streamConfig.ts
export const defaultStreamConfigOptions: StreamConfig = {
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
      structureOptions: {
        tables: true,
        indexes: true,
        foreignKeys: true
      },
      performanceConfig: {
        batchSize: 500,
        workerPoolSize: 100,
        channelBuffer: 1000,
        flushIntervalMs: 250
      }
    }
  },
  limits: { numberOfEvents: 0, elapsedTime: 0 }
}
```

## 3. Store Action Migration

### Before (updateTarget):
```typescript
updateTarget(targetId: string) {
  if (this.currentStreamConfig) {
    this.currentStreamConfig.target = targetId  // Sets string ID
    const connectionsStore = useConnectionsStore()
    const connection = connectionsStore.connectionByID(targetId)
    if (connection && connection.type?.toLowerCase().includes('file')) {
      if (!this.currentStreamConfig.targetFileFormat) {
        this.currentStreamConfig.targetFileFormat = 'csv'
      }
    } else {
      delete this.currentStreamConfig.targetFileFormat
    }
  }
}
```

### After (updateTarget):
```typescript
updateTarget(targetId: string) {
  if (this.currentStreamConfig) {
    // Initialize or update target object
    if (!this.currentStreamConfig.target) {
      this.currentStreamConfig.target = {
        id: targetId,
        options: {}
      }
    } else {
      this.currentStreamConfig.target.id = targetId
    }
    
    const connectionsStore = useConnectionsStore()
    const connection = connectionsStore.connectionByID(targetId)
    if (connection && connection.type?.toLowerCase().includes('file')) {
      if (!this.currentStreamConfig.target.fileFormat) {
        this.currentStreamConfig.target.fileFormat = 'csv'
      }
    } else {
      delete this.currentStreamConfig.target.fileFormat
    }
  }
}
```

### Before (updateSource):
```typescript
updateSource(sourceId: string) {
  if (this.currentStreamConfig) {
    this.currentStreamConfig.source = sourceId  // Sets string ID
  }
}
```

### After (updateSource):
```typescript
updateSource(sourceId: string) {
  if (this.currentStreamConfig) {
    // Initialize or update source object
    if (!this.currentStreamConfig.source) {
      this.currentStreamConfig.source = {
        id: sourceId,
        tables: [],
        options: {}
      }
    } else {
      this.currentStreamConfig.source.id = sourceId
    }
  }
}
```

## 4. Component Computed Property Migration

### Before (StreamSettings.vue):
```typescript
const targetFileFormat = computed({
  get: () => currentStreamConfig.targetFileFormat || undefined,
  set: (value) => {
    currentStreamConfig.targetFileFormat = value
  }
})

const compressionType = computed({
  get: () => currentStreamConfig.compressionType || 'zstd',
  set: (value) => {
    currentStreamConfig.compressionType = value
  }
})

const dataBundleSize = computed<number>({
  get: () => currentStreamConfig.dataBundleSize ?? defaultStreamConfigOptions.dataBundleSize,
  set: (newValue) => {
    const clampedValue = Math.min(Math.max(newValue, 10), 1000)
    currentStreamConfig.dataBundleSize = clampedValue
  }
})
```

### After (StreamSettings.vue):
```typescript
const targetFileFormat = computed({
  get: () => currentStreamConfig.target?.fileFormat || undefined,
  set: (value) => {
    if (currentStreamConfig.target) {
      currentStreamConfig.target.fileFormat = value
    }
  }
})

const compressionType = computed({
  get: () => currentStreamConfig.target?.options?.compressionType || 'zstd',
  set: (value) => {
    if (currentStreamConfig.target?.options) {
      currentStreamConfig.target.options.compressionType = value
    }
  }
})

const dataBundleSize = computed<number>({
  get: () =>
    currentStreamConfig.source?.options?.dataBundleSize ?? 
    defaultStreamConfigOptions.source.options?.dataBundleSize ?? 
    500,
  set: (newValue) => {
    const clampedValue = Math.min(Math.max(newValue, 10), 1000)
    if (currentStreamConfig.source?.options) {
      currentStreamConfig.source.options.dataBundleSize = clampedValue
    }
  }
})

const reportingInterval = computed<number>({
  get: () =>
    currentStreamConfig.reportingInterval ??
    defaultStreamConfigOptions.reportingInterval ??
    3,
  set: (value) => {
    currentStreamConfig.reportingInterval = value
  }
})
```

## 5. Component Display Migration

### Before (StreamDetailsPanel.vue):
```typescript
const sourceDisplay = computed(() => {
  if (!props.sourceConnectionId) return 'Not selected'
  const conn = connectionsStore.connectionByID(props.sourceConnectionId)
  if (!conn) return props.sourceConnectionId
  let display = conn.name
  if (props.sourceDatabase) display += ` / ${props.sourceDatabase}`
  return display
})

const targetDisplay = computed(() => {
  if (!props.targetConnectionId) return 'Not selected'
  const conn = connectionsStore.connectionByID(props.targetConnectionId)
  if (!conn) return props.targetConnectionId
  let display = conn.name
  if (props.targetDatabase) display += ` / ${props.targetDatabase}`
  if (conn.type?.toLowerCase().includes('file')) {
    const format = currentStreamConfig.value?.targetFileFormat
    if (format) {
      display += ` • ${format.toUpperCase()}`
    }
  }
  return display
})
```

### After (StreamDetailsPanel.vue):
```typescript
const sourceDisplay = computed(() => {
  const sourceId = stream.source?.id
  if (!sourceId) return 'Not selected'
  const conn = connectionsStore.connectionByID(sourceId)
  if (!conn) return sourceId
  let display = conn.name
  if (props.sourceDatabase) display += ` / ${props.sourceDatabase}`
  return display
})

const targetDisplay = computed(() => {
  const targetId = stream.target?.id
  if (!targetId) return 'Not selected'
  const conn = connectionsStore.connectionByID(targetId)
  if (!conn) return targetId
  let display = conn.name
  if (props.targetDatabase) display += ` / ${props.targetDatabase}`
  if (conn.type?.toLowerCase().includes('file')) {
    const format = stream.target?.fileFormat
    if (format) {
      display += ` • ${format.toUpperCase()}`
    }
  }
  return display
})
```

## 6. isFileTarget Computation Migration

### Before (StreamConfigurationStep.vue):
```typescript
const isFileTarget = computed(() => {
  const target = currentStreamConfig.target  // String ID
  if (!target) return false
  if (target.startsWith('/') || target.startsWith('file://')) return true
  const conn = connectionsStore.connectionByID(target)
  return conn?.type?.toLowerCase() === 'files'
})
```

### After (StreamConfigurationStep.vue):
```typescript
const isFileTarget = computed(() => {
  const targetId = currentStreamConfig.target?.id
  if (!targetId) return false
  // Check if it's a file path or file connection
  if (targetId.startsWith('/') || targetId.startsWith('file://')) return true
  const conn = connectionsStore.connectionByID(targetId)
  return conn?.type?.toLowerCase() === 'files'
})
```

## 7. Wizard loadFromStreamConfig Migration

### Before (useStreamWizard.ts):
```typescript
function loadFromStreamConfig(config: any) {
  selection.value.sourceConnectionId = config.source || null
  selection.value.targetConnectionId = config.target || null
  selection.value.sourceDatabase = config.sourceDatabase || null
  selection.value.targetDatabase = config.targetDatabase || null
  
  if (config.structureOptions) {
    createTables.value = config.structureOptions.tables ?? true
    createIndexes.value = config.structureOptions.indexes ?? true
    createForeignKeys.value = config.structureOptions.foreignKeys ?? true
  }
  
  copyData.value = !config.skipData
}
```

### After (useStreamWizard.ts):
```typescript
function loadFromStreamConfig(config: any) {
  selection.value.sourceConnectionId = config.source?.id || null
  selection.value.targetConnectionId = config.target?.id || null
  selection.value.sourceDatabase = config.sourceDatabase || null
  selection.value.targetDatabase = config.targetDatabase || null
  selection.value.sourceSchema = config.sourceSchema || null
  selection.value.targetSchema = config.targetSchema || null
  selection.value.targetPath = config.targetPath || null
  
  // Structure options moved to target.options
  if (config.target?.options?.structureOptions) {
    createTables.value = config.target.options.structureOptions.tables ?? true
    createIndexes.value = config.target.options.structureOptions.indexes ?? true
    createForeignKeys.value = config.target.options.structureOptions.foreignKeys ?? true
  }
  
  // skipData moved to target.options
  copyData.value = !config.target?.options?.skipData
}
```

## 8. FileOutputSummary Display Migration

### Before (FileOutputSummary.vue):
```typescript
const compressionLabel = computed(() => (props.stream.compressionType || 'zstd').toUpperCase())

const compressionBadgeClass = computed(() => {
  const base = 'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset '
  if (props.stream.compressionType === 'zstd') {
    return `${base}bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-500/30`
  }
  if (props.stream.compressionType === 'gzip') {
    return `${base}bg-yellow-50 text-yellow-700 ring-yellow-600/20 dark:bg-yellow-900/30 dark:text-yellow-300 dark:ring-yellow-500/30`
  }
  return `${base}bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-900/30 dark:text-gray-300 dark:ring-gray-600/30`
})
```

### After (FileOutputSummary.vue):
```typescript
const compressionLabel = computed(() =>
  (props.stream.target?.options?.compressionType || 'zstd').toUpperCase()
)

const compressionBadgeClass = computed(() => {
  const base = 'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset '
  const compression = props.stream.target?.options?.compressionType
  if (compression === 'zstd') {
    return `${base}bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-500/30`
  }
  if (compression === 'gzip') {
    return `${base}bg-yellow-50 text-yellow-700 ring-yellow-600/20 dark:bg-yellow-900/30 dark:text-yellow-300 dark:ring-yellow-500/30`
  }
  return `${base}bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-900/30 dark:text-gray-300 dark:ring-gray-600/30`
})
```

## Key Migration Patterns

1. **String ID to Object**: `config.source` (string) → `config.source.id` (object with id property)
2. **Top-level to Nested**: `config.dataBundleSize` → `config.source.options.dataBundleSize`
3. **File Options**: `config.targetFileFormat` → `config.target.fileFormat`
4. **Output Options**: `config.compressionType` → `config.target.options.compressionType`
5. **Structure Options**: `config.structureOptions` → `config.target.options.structureOptions`
6. **Reporting**: `config.reportingIntervals` → `config.reportingInterval` (single value)
7. **Operations**: `config.operations` → `config.source.options.operations`
8. **Tables**: `config.tables` → `config.source.tables`

