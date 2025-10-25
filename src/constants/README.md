# Constants Directory

This directory contains all centralized constants used throughout the application. Following the DRY (Don't Repeat Yourself) principle, all hardcoded values should be defined here as single sources of truth.

## Directory Structure

```
constants/
├── index.ts                    # Central export point
├── README.md                   # This file
├── apiConfig.ts               # API timeouts, retry settings
├── apiHeaders.ts              # HTTP header names
├── databaseTypes.ts           # Database type identifiers
├── databaseColors.ts          # Database UI color schemes
├── fileFormats.ts             # Supported file formats
├── network.ts                 # Network/localhost constants
├── notificationTypes.ts       # Toast notification types
├── serviceStatus.ts           # Service health status values
├── storageKeys.ts             # localStorage/sessionStorage keys
├── streamStatus.ts            # Stream lifecycle statuses
└── viewTypes.ts               # UI view modes (cards/table)
```

## Quick Start

### Import from Central Index (Recommended)

```typescript
import { DATABASE_TYPES, API_TIMEOUTS, STREAM_STATUS } from '@/constants'
```

### Or Import from Specific Files

```typescript
import { DATABASE_TYPES } from '@/constants/databaseTypes'
import { API_TIMEOUTS } from '@/constants/apiConfig'
```

## Files Overview

### `apiConfig.ts`

API request configuration including timeouts and retry logic.

**Constants:**

- `DEFAULT_API_TIMEOUT` - Default timeout (5 minutes)
- `API_TIMEOUTS` - Timeout categories (SHORT, MEDIUM, LONG, etc.)
- `API_RETRY` - Retry configuration (max retries, delays)
- `HEALTH_CHECK` - Health check settings
- `SSE_CONFIG` - Server-Sent Events configuration
- `OPERATION_TIMEOUTS` - Operation-specific timeout mappings

**Helper Functions:**

- `getOperationTimeout(operation)` - Get timeout for specific operation

---

### `apiHeaders.ts`

HTTP header name constants.

**Constants:**

- `API_HEADERS` - Custom API headers (X-API-Key, X-Cache, etc.)
- `HTTP_HEADERS` - Standard HTTP headers (Content-Type, Authorization)
- `CONTENT_TYPES` - Common content type values (JSON, FormData, etc.)

---

### `databaseTypes.ts`

Database type identifiers and categorization.

**Constants:**

- `DATABASE_TYPES` - All supported database types
- `DATABASE_TYPE_ALIASES` - Alternative names mapping
- `SQL_DATABASES` - List of SQL databases
- `NOSQL_DATABASES` - List of NoSQL databases
- `FILE_BASED_CONNECTIONS` - File-based connection types

**Helper Functions:**

- `isSQLDatabase(type)` - Check if database is SQL-based
- `isNoSQLDatabase(type)` - Check if database is NoSQL
- `isFileBasedConnection(type)` - Check if connection is file-based
- `normalizeDatabaseType(type)` - Normalize to standard name
- `getDatabaseDisplayName(type)` - Get display name

---

### `databaseColors.ts`

Tailwind CSS color schemes for database types.

**Constants:**

- `DATABASE_COLORS` - Color scheme per database type
- `DEFAULT_DATABASE_COLOR` - Fallback color scheme

**Helper Functions:**

- `getDatabaseColors(type)` - Get complete color scheme
- `getDatabaseBgColor(type)` - Get background color class
- `getDatabaseRingColor(type)` - Get ring/border color class
- `getDatabaseTextColor(type)` - Get text color class

---

### `fileFormats.ts`

Supported file formats for data streaming.

**Constants:**

- `SUPPORTED_FILE_FORMATS` - Array of supported formats with metadata

**Helper Functions:**

- `getFormatExtensions(formatName)` - Get extensions for format
- `getAllSupportedExtensions()` - Get all extensions as flat array

---

### `network.ts`

Network-related constants and utilities.

**Constants:**

- `LOCALHOST_ADDRESSES` - Localhost identifier strings
- `COMMON_PORTS` - Standard database ports
- `PROTOCOLS` - Protocol types (HTTP, HTTPS, WS, WSS)

**Helper Functions:**

- `isLocalhost(host)` - Check if host is localhost
- `getHostDisplayName(host)` - Get display name for host
- `isLocalUrl(url)` - Check if URL is local

---

### `notificationTypes.ts`

Toast notification types and styling.

**Constants:**

- `NOTIFICATION_TYPES` - Notification severity types
- `NOTIFICATION_DURATION` - Duration presets

**Helper Functions:**

- `getNotificationDuration(type)` - Get default duration
- `getNotificationIcon(type)` - Get icon name
- `getNotificationColors(type)` - Get CSS color classes

---

### `serviceStatus.ts`

Backend service health status values.

**Constants:**

- `SERVICE_STATUS` - Health status values (PASSING, CRITICAL, etc.)
- `SERVICE_STATUS_LABELS` - Human-readable labels

**Helper Functions:**

- `isServiceHealthy(status)` - Check if service is healthy
- `isServiceDown(status)` - Check if service is down
- `isServiceStatusUnknown(status)` - Check if status is unknown
- `getServiceStatusLabel(status)` - Get display label
- `getServiceStatusColor(status)` - Get CSS color class
- `getServiceStatusBadgeColor(status)` - Get badge color class
- `getServiceStatusIcon(status)` - Get icon name

---

### `storageKeys.ts`

localStorage and sessionStorage key names.

**Constants:**

- `STORAGE_KEYS` - LocalStorage keys (API_KEY, VIEW_TYPE, etc.)
- `SESSION_KEYS` - SessionStorage keys

**Helper Functions:**

- `getStorageValue<T>(key, defaultValue)` - Get typed value
- `setStorageValue<T>(key, value)` - Set value with error handling
- `removeStorageValue(key)` - Remove value safely

---

### `streamStatus.ts`

Stream lifecycle status values.

**Constants:**

- `STREAM_STATUS` - Stream status enum (RUNNING, FINISHED, etc.)
- `STREAM_STATUS_LABELS` - Human-readable labels
- `STREAM_STATUS_CATEGORIES` - Status groupings

**Helper Functions:**

- `isStreamRunning(status)` - Check if actively running
- `isStreamCompleted(status)` - Check if completed successfully
- `isStreamFailed(status)` - Check if failed
- `isStreamStopped(status)` - Check if stopped/paused
- `isStreamPending(status)` - Check if pending
- `getStreamStatusLabel(status)` - Get display label
- `getStreamStatusColor(status)` - Get CSS color class
- `getStreamStatusBadgeColor(status)` - Get badge color class

---

### `viewTypes.ts`

UI view mode constants (cards vs table).

**Constants:**

- `VIEW_TYPES` - Available view types (CARDS, TABLE)
- `DEFAULT_VIEW_TYPE` - Default view mode

**Helper Functions:**

- `isValidViewType(type)` - Type guard for view types
- `getViewType(type)` - Get view type with fallback

---

## Benefits of Using Constants

### 1. **Single Source of Truth**

Update values in one place instead of hunting through multiple files.

### 2. **Type Safety**

TypeScript catches typos and provides auto-completion.

```typescript
// ❌ Easy to mistype
if (status === 'runing') {
}

// ✅ Type-safe
if (status === STREAM_STATUS.RUNNING) {
}
```

### 3. **Better Refactoring**

Find all usages instantly with "Find References" in your IDE.

### 4. **Self-Documenting Code**

Constants provide clear, descriptive names.

```typescript
// ❌ What does 2 mean?
if (stream.status === 2) {
}

// ✅ Clear and obvious
if (stream.status === STREAM_STATUS.RUNNING) {
}
```

### 5. **Easier Maintenance**

Add new values or update existing ones in one place.

## Best Practices

### 1. Always Use Constants

```typescript
// ❌ Bad - hardcoded magic number
setTimeout(() => {}, 30000)

// ✅ Good - named constant
import { API_TIMEOUTS } from '@/constants'
setTimeout(() => {}, API_TIMEOUTS.MEDIUM)
```

### 2. Use Helper Functions

```typescript
// ❌ Bad - repeated logic
if (status === 0 || status === 1) {
  // is pending
}

// ✅ Good - helper function
import { isStreamPending } from '@/constants'
if (isStreamPending(status)) {
  // is pending
}
```

### 3. Leverage Type Safety

```typescript
// ✅ TypeScript enforces correct values
const validStatus: StreamStatus = STREAM_STATUS.RUNNING // ✓
const invalidStatus: StreamStatus = 'invalid' // ✗ Type error
```

### 4. Use as const for Literals

```typescript
// ✅ Ensures literal types
export const MY_CONST = {
  VALUE: 'myValue'
} as const

type MyType = typeof MY_CONST.VALUE // Literal type 'myValue', not string
```

## Adding New Constants

1. **Identify Repeated Values**

   - Look for the same string/number used 2+ times
   - Check if it's configuration that might change

2. **Create or Update File**

   - Add to existing file if related
   - Create new file for new category

3. **Follow Naming Convention**

   - Use SCREAMING_SNAKE_CASE for constants
   - Use camelCase for helper functions
   - Add TSDoc comments

4. **Export from Index**

   - Add export to `index.ts`

5. **Update Documentation**
   - Add entry to this README
   - Add usage examples to CONSTANTS_USAGE.md

### Example

```typescript
// src/constants/myFeature.ts

/**
 * My Feature Constants
 * Description of what these constants are for
 */

/**
 * Main configuration object
 */
export const MY_FEATURE_CONFIG = {
  /** Description of option A */
  OPTION_A: 'optionA',
  /** Description of option B */
  OPTION_B: 'optionB'
} as const

/**
 * Type for feature options
 */
export type MyFeatureOption = (typeof MY_FEATURE_CONFIG)[keyof typeof MY_FEATURE_CONFIG]

/**
 * Check if option is valid
 */
export function isValidOption(option: string): option is MyFeatureOption {
  return Object.values(MY_FEATURE_CONFIG).includes(option as MyFeatureOption)
}
```

Then add to `index.ts`:

```typescript
export * from './myFeature'
```

## Migration Guide

See [CONSTANTS_USAGE.md](../../CONSTANTS_USAGE.md) for detailed migration examples and usage patterns.

## Related Files

- [CONSTANTS_USAGE.md](../../CONSTANTS_USAGE.md) - Usage examples and migration guide
- [UNSUPPORTED_FILES.md](../../UNSUPPORTED_FILES.md) - File format handling documentation
