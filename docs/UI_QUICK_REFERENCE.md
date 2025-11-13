# UI Codebase - Quick Reference Guide

## Key File Locations

### Types & Interfaces
- **Connection types**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/types/connections.ts`
- **File types**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/types/files.ts`
- **Stream config types**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/types/streamConfig.ts`

### State Management (Stores)
- **Connections**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/stores/connections.ts`
- **File Explorer**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/stores/fileExplorer.ts`
- **Stream Config**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/stores/streamConfig.ts`

### API Clients
- **Connections API**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/api/connections.ts`
- **Files API**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/api/files.ts`
- **File System API**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/api/fileSystem.ts`

### Components
- **Connection Params Router**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/components/connection/params/ConnectionParams.vue`
- **Database Params**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/components/connection/params/UnifiedConnectionParams.vue`
- **File Params**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/components/connection/params/LocalFilesConnectionParams.vue`
- **File Preview**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/components/stream/wizard/FilePreviewList.vue`
- **File Data View**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/components/files/FileDataView.vue`

---

## Core Connection Interface

```typescript
interface Connection {
  id: string
  name: string
  type: string                   // 'postgresql', 'mysql', 'snowflake', 'files'
  host: string
  port: number
  username: string
  password: string
  database: string
  databasesInfo: DatabaseInfo[]
  created?: number
  ssl?: SSLConfig
  cloud_provider?: string
  status?: string
  file_format?: FileFormat       // FOR FILES: csv, json, jsonl, parquet
  storage_config?: StorageConfig // FOR FILES: provider + uri
}

type FileFormat = 'csv' | 'json' | 'jsonl' | 'parquet'

interface StorageConfig {
  provider: 'local' | 's3' | 'gcs' | 'azure' | 'sftp' | 'ftp'
  uri: string                    // Local path or cloud URI
  region?: string
  endpoint?: string
  credentials?: StorageCredentials
}
```

---

## Detecting File Connections

### In TypeScript Components
```typescript
// Exact match
if (connectionType?.toLowerCase() === 'files') { }
```

---

## File Connection Properties

| Property | Value | Notes |
|----------|-------|-------|
| `type` | 'files' | Case-insensitive |
| `storage_config.provider` | 'local' | Or 's3', 'gcs', 'azure', etc. |
| `storage_config.uri` | '/home/user/data' | Required, folder path or cloud URI |
| `file_format` | 'csv' | Optional: csv, json, jsonl, parquet |
| `port` | 0 | Unused |
| `username` | 'local' | Default |
| `password` | '' | Empty string |
| `database` | '' | Unused |
| `host` | '' | Unused |

---

## Creating a File Connection

```typescript
// Initialize
const newConnection = {
  id: '',
  name: '',
  type: 'files',
  host: '',
  port: 0,
  username: 'local',
  password: '',
  database: '',
  storage_config: {
    provider: 'local',
    uri: '/path/to/folder'
  },
  file_format: 'csv',  // Optional
  databasesInfo: []
}

// Store action
await connectionStore.createConnection()
```

---

## Loading Files from a File Connection

```typescript
// In component or store
const fileExplorer = useFileExplorerStore()

// Load directory listing
await fileExplorer.loadEntries(connectionId)

// Get entries
const files = fileExplorer.getEntries(connectionId)

// Load metadata for a file
const metadata = await fileExplorer.loadFileMetadata(fileEntry)
```

---

## Stream Configuration with Files

### Source as Files
```typescript
const streamConfig = {
  source: 'file-connection-id',
  target: 'database-connection-id',
  files: [
    { name: 'data.csv', path: '/path/data.csv', selected: true }
  ]
  // NO tables field
}
```

### Target as Files
```typescript
const streamConfig = {
  source: 'database-connection-id',
  target: 'file-connection-id',
  targetFileFormat: 'csv',           // csv | json | jsonl | parquet
  compressionType: 'zstd',           // uncompressed | gzip | zstd
  tables: [
    { name: 'my_table', selected: true }
  ]
  // NO files field
}
```

---

## API Endpoints for Files

### File System Operations
```
GET /fs/list?path=/folder&connectionType=files
POST /fs/writable
GET /fs/roots
```

### File Data Operations
```
GET /files/meta?path=/file.csv&format=csv&stats=true
GET /files/data?path=/file.csv&format=csv&limit=100&offset=0
GET /files/count?path=/file.csv&format=csv
```

### File Formats Supported
- CSV
- JSON
- JSONL
- Parquet

---

## Type Detection Patterns

### File Explorer Store
```typescript
// Detects file connections
function isFilesConnectionType(connId: string | null | undefined): boolean {
  if (!connId) return false
  const connectionsStore = useConnectionsStore()
  const conn = connectionsStore.connections.find((c) => c.id === connId)
  return (conn?.type || '').toLowerCase().includes('file')
}
```

### Stream Config Store
```typescript
// Auto-detects and sets format
updateTarget(targetId: string) {
  const connection = connectionsStore.connectionByID(targetId)
  if (connection && connection.type?.toLowerCase().includes('file')) {
    if (!this.currentStreamConfig.targetFileFormat) {
      this.currentStreamConfig.targetFileFormat = 'csv'
    }
  } else {
    delete this.currentStreamConfig.targetFileFormat
  }
}
```

---

## Important Considerations

1. **File Connections Skip Database Operations**
   - No getDatabases() call
   - No getTables() call
   - No getMetadata() call
   - Files are listed via fileExplorer store

2. **Deep Copy Pattern**
   - Always use deep copy for currentConnection: `JSON.parse(JSON.stringify(...))`
   - Prevents Vue reactivity issues

3. **Connection Names Auto-Generate**
   - Files: `Files-{folderName}`
   - Databases: `{type}-{host}-{username}`

4. **Stream Names Auto-Generate**
   - Format: `{sourceType}_to_{targetType}_{count}_tables`
   - Examples: `mysql_to_csv_5_tables`, `postgresql_to_parquet_10_tables`

5. **File Format Support**
   - CSV, JSON, JSONL support standard delimiters
   - Parquet supports .zst and .gz compression
   - Backend filters unsupported formats per connectionType

---

## Component Routing Decision Tree

```
ConnectionParams.vue
  └─ Is connectionType 'files'?
      ├─ YES → LocalFilesConnectionParams
      │         (folder path input)
      └─ NO  → Tabs: Direct/SSL
              ├─ Direct → UnifiedConnectionParams
              │           (host/port/user/pass/db)
              └─ SSL → SSLParams
                       (SSL certificate options)
```

---

## Useful Composables & Utilities

### useDatabaseCapabilities
- Gets default port for database type
- Gets connection defaults (username, etc.)

### normalizeConnectionType
- Converts connection type strings
- Handles case normalization

### getFileFormat
- Detects file format from filename
- Returns: 'csv' | 'json' | 'jsonl' | 'parquet'

---

## Testing Connections

```typescript
// For new connections (no ID)
await api.testConnection()  // Uses currentConnection

// For existing connections (has ID)
await api.pingConnectionById(connectionId)

// Both work for file and database connections
```

