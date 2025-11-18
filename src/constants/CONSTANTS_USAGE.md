# Constants Usage Guide

This guide shows how to use the centralized constants in the application.

## Overview

All constants are now centralized in `/src/constants/` directory. This provides:

✅ **Single Source of Truth** - Update values in one place
✅ **Type Safety** - Full TypeScript support
✅ **IntelliSense** - Auto-completion in IDEs
✅ **Easier Maintenance** - Find and update constants quickly
✅ **Prevent Typos** - Use constants instead of string literals

## Import Pattern

You can import from individual files or from the central index:

```typescript
// Import from central index (recommended)
import { DATABASE_TYPES, API_TIMEOUTS, STATUS } from '@/constants'

// Or import from specific files
import { DATABASE_TYPES } from '@/constants/databaseTypes'
import { API_TIMEOUTS } from '@/constants/apiConfig'
```

## Available Constants

### 1. API Configuration (`apiConfig.ts`)

```typescript
import { API_TIMEOUTS, API_RETRY, getOperationTimeout } from '@/constants'

// Use timeout constants
const timeout = API_TIMEOUTS.MEDIUM // 30000ms

// Get operation-specific timeout
const timeout = getOperationTimeout('getTableData') // 30000ms

// Use retry configuration
const maxRetries = API_RETRY.MAX_RETRIES // 3
```

**Before (hardcoded):**

```typescript
axios.get('/api/data', { timeout: 30000 })
```

**After (using constants):**

```typescript
import { API_TIMEOUTS } from '@/constants'
axios.get('/api/data', { timeout: API_TIMEOUTS.MEDIUM })
```

---

### 2. Database Types (`databaseTypes.ts`)

```typescript
import { DATABASE_TYPES, isSQLDatabase, normalizeDatabaseType } from '@/constants'

// Use database type constants
if (connection.type === DATABASE_TYPES.POSTGRESQL) {
  // PostgreSQL-specific logic
}

// Check database category
if (isSQLDatabase(type)) {
  // SQL database logic
}

// Normalize user input
const normalized = normalizeDatabaseType('postgres') // Returns 'PostgreSQL'
```

**Before:**

```typescript
if (connection.type === 'PostgreSQL' || connection.type === 'postgres') {
  // ...
}
```

**After:**

```typescript
import { DATABASE_TYPES, normalizeDatabaseType } from '@/constants'

if (normalizeDatabaseType(connection.type) === DATABASE_TYPES.POSTGRESQL) {
  // ...
}
```

---

### 3. Database Colors (`databaseColors.ts`)

```typescript
import { getDatabaseColors, getDatabaseBgColor } from '@/constants'

// Get complete color scheme
const colors = getDatabaseColors('postgresql')
// Returns: { bg: 'bg-blue-100', ring: 'ring-blue-200/50', text: 'text-blue-600' }

// Get specific color
const bgColor = getDatabaseBgColor('mysql') // 'bg-orange-100'
```

**Before:**

```typescript
// Hardcoded in component
const getColor = (type: string) => {
  if (type === 'postgresql') return 'bg-blue-100'
  if (type === 'mysql') return 'bg-orange-100'
  // ... repeated in multiple files
}
```

**After:**

```typescript
import { getDatabaseBgColor } from '@/constants'

const bgColor = getDatabaseBgColor(connection.type)
```

---

### 4. Unified Status System (`status.ts`)

```typescript
import {
  STATUS,
  isActiveStatus,
  isTerminalStatus,
  getStatusLabel,
  getWorstStatus,
  STOP_STATUS_COLORS
} from '@/constants'

// Check status
if (stream.status === STATUS.RUNNING) {
  // Stream is active
}

// Use helper functions
if (isActiveStatus(stream.status)) {
  // Show stop button
}

if (isTerminalStatus(stream.status)) {
  // Execution has ended
}

// Get UI elements
const label = getStatusLabel(stream.status) // 'Running'

// Compare statuses
const worst = getWorstStatus(STATUS.RUNNING, STATUS.FAILED) // Returns STATUS.FAILED

// Use shared color constants
const iconBg = STOP_STATUS_COLORS.iconBackground // 'bg-gray-100 dark:bg-gray-800'
```

**Before:**

```typescript
if (stream.status === 2) {
  // What does 2 mean?
  // ...
}
```

**After:**

```typescript
import { STATUS, isActiveStatus } from '@/constants'

if (isActiveStatus(stream.status)) {
  // Clear and self-documenting
}
```

---

### 5. File Formats (`fileFormats.ts`)

```typescript
import { SUPPORTED_FILE_FORMATS, getAllSupportedExtensions } from '@/constants'

// Iterate over formats
SUPPORTED_FILE_FORMATS.forEach((format) => {
  console.log(`${format.name}: ${format.extensions.join(', ')}`)
})

// Get all extensions
const extensions = getAllSupportedExtensions()
// Returns: ['.csv', '.csv.gz', '.json', '.json.gz', ...]
```

---

### 6. Service Status (`serviceStatus.ts`)

```typescript
import { SERVICE_STATUS, isServiceHealthy, getServiceStatusColor } from '@/constants'

// Check health
if (isServiceHealthy(service.status)) {
  // Service is operational
}

// Get UI color
const color = getServiceStatusColor(SERVICE_STATUS.PASSING) // 'text-green-600'
```

---

### 7. View Types (`viewTypes.ts`)

```typescript
import { VIEW_TYPES, getViewType } from '@/constants'

// Use view type constant
const currentView = VIEW_TYPES.CARDS

// Parse from string with fallback
const viewType = getViewType(localStorage.getItem('view')) // Falls back to 'cards'
```

**Before:**

```typescript
const view = localStorage.getItem('view') || 'cards'
if (view === 'table') {
  // Typo risk: 'tables', 'Table', etc.
  // ...
}
```

**After:**

```typescript
import { VIEW_TYPES, getViewType } from '@/constants'

const view = getViewType(localStorage.getItem('view'))
if (view === VIEW_TYPES.TABLE) {
  // Type-safe, no typos
}
```

---

### 8. Storage Keys (`storageKeys.ts`)

```typescript
import { STORAGE_KEYS, getStorageValue, setStorageValue } from '@/constants'

// Get from localStorage with type safety
const apiKey = getStorageValue(STORAGE_KEYS.API_KEY, '')

// Set to localStorage
setStorageValue(STORAGE_KEYS.API_KEY, newKey)
```

**Before:**

```typescript
localStorage.getItem('dbconvert-api-key') // Easy to mistype
```

**After:**

```typescript
import { STORAGE_KEYS, getStorageValue } from '@/constants'

getStorageValue(STORAGE_KEYS.API_KEY, '') // Auto-completion, no typos
```

---

### 9. API Headers (`apiHeaders.ts`)

```typescript
import { API_HEADERS, CONTENT_TYPES } from '@/constants'

// Set headers
const headers = {
  [API_HEADERS.API_KEY]: apiKey,
  [HTTP_HEADERS.CONTENT_TYPE]: CONTENT_TYPES.JSON
}
```

**Before:**

```typescript
headers: { 'X-API-Key': apiKey } // Repeated 50+ times
```

**After:**

```typescript
import { API_HEADERS } from '@/constants'

headers: { [API_HEADERS.API_KEY]: apiKey } // Centralized
```

---

### 10. Network (`network.ts`)

```typescript
import { isLocalhost, COMMON_PORTS } from '@/constants'

// Check if host is localhost
if (isLocalhost(connection.host)) {
  // Show local connection notice
}

// Use standard ports
const defaultPort = COMMON_PORTS.POSTGRESQL // 5432
```

---

### 11. Notifications (`notificationTypes.ts`)

```typescript
import { NOTIFICATION_TYPES, getNotificationDuration, getNotificationColors } from '@/constants'

// Show notification
showNotification({
  type: NOTIFICATION_TYPES.SUCCESS,
  message: 'Connection created',
  duration: getNotificationDuration(NOTIFICATION_TYPES.SUCCESS) // 3000ms
})

// Get UI colors
const colors = getNotificationColors(NOTIFICATION_TYPES.ERROR)
// Returns: { bg: 'bg-red-50', border: 'border-red-200', ... }
```

---

## Migration Strategy

When refactoring existing code to use constants:

1. **Find duplicates:** Search for hardcoded strings/numbers
2. **Import constant:** Add import from `@/constants`
3. **Replace usage:** Replace hardcoded value with constant
4. **Test:** Verify functionality hasn't changed
5. **Delete old code:** Remove hardcoded helper functions if they exist

### Example Migration

**Before:**

```typescript
// In component A
if (status === 'passing') {
  return 'text-green-600'
}

// In component B
if (status === 'passing') {
  return 'text-green-600'
}

// In component C
const isHealthy = status === 'passing'
```

**After:**

```typescript
// All components
import { SERVICE_STATUS, isServiceHealthy, getServiceStatusColor } from '@/constants'

if (isServiceHealthy(status)) {
  return getServiceStatusColor(SERVICE_STATUS.PASSING)
}
```

---

## Best Practices

1. **Always use constants** instead of hardcoded strings/numbers
2. **Import from central index** (`@/constants`) for convenience
3. **Use helper functions** when available (e.g., `isStreamRunning()`)
4. **Add TSDoc comments** when creating new constants
5. **Use `as const`** for type safety with literal types
6. **Group related constants** in the same file

---

## Adding New Constants

When adding new constants:

1. Create file in `/src/constants/` (e.g., `myFeature.ts`)
2. Define constants with `as const` for type safety
3. Export types and helper functions
4. Add export to `/src/constants/index.ts`
5. Document usage in this file

Example:

```typescript
// src/constants/myFeature.ts
export const MY_FEATURE = {
  OPTION_A: 'optionA',
  OPTION_B: 'optionB'
} as const

export type MyFeatureOption = (typeof MY_FEATURE)[keyof typeof MY_FEATURE]

// src/constants/index.ts
export * from './myFeature'
```

---

## IDE Integration

Enable auto-imports in VSCode:

```json
// .vscode/settings.json
{
  "typescript.preferences.autoImportFileExcludePatterns": ["!@/constants"]
}
```

This allows you to type constant names and auto-import them from `@/constants`.
