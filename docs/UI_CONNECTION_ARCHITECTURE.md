# DBConvert Streams UI - Connection and File Handling Architecture

## Summary

The UI codebase defines a flexible connection system that supports both traditional database connections and file-based connections. File connections are treated as first-class citizens with dedicated components and state management.

---

## 1. Connection Type Definition

### Core Connection Interface
**Location**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/types/connections.ts`

```typescript
export interface Connection {
  id: string | ''
  name: string
  type: string                    // 'PostgreSQL', 'MySQL', 'Snowflake', 'files'
  host: string                    // Not used for file connections
  port: number                    // Not used for file connections
  username: string                // Set to 'local' for file connections
  password: string                // Empty for file connections
  databasesInfo: DatabaseInfo[]
  database: string                // Not used for file connections
  created?: number
  ssl?: SSLConfig
  cloud_provider?: string
  status?: string
  file_format?: FileFormat        // FILE CONNECTIONS: csv, json, jsonl, parquet
  storage_config?: StorageConfig  // FILE CONNECTIONS: Storage provider and URI
}

export type FileFormat = 'csv' | 'json' | 'jsonl' | 'parquet'

export interface StorageConfig {
  provider: StorageProvider       // 'local', 's3', 'gcs', 'azure', 'sftp', 'ftp'
  uri: string                     // Local path or cloud URI (e.g., s3://bucket/prefix)
  region?: string
  endpoint?: string
  credentials_ref?: string
  credentials?: StorageCredentials
  options?: Record<string, string>
}

export type StorageProvider = 'local' | 's3' | 'gcs' | 'azure' | 'sftp' | 'ftp'

export interface SSLConfig {
  mode: string
  ca?: string
  client_cert?: string
  client_key?: string
}
```

**Key Design Pattern**:
- File connections use `storage_config.uri` for folder path or cloud URI
- Connection type is 'files'
- File format specified separately in `file_format` field
- Storage provider specifies WHERE files are stored (local, S3, etc.)
- Database credentials are set to defaults (username='local', password='')
- Type detection: exact match `type === 'files'`

---

## 2. Database Types and Filtering

### Available Database Types
**Location**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/stores/connections.ts` (lines 27-33)

```typescript
dbTypes: [
  { id: 0, type: 'All', logo: '/images/db-logos/all.svg' },
  { id: 1, type: 'PostgreSQL', logo: '/images/db-logos/postgresql.svg' },
  { id: 2, type: 'MySQL', logo: '/images/db-logos/mysql.svg' },
  { id: 3, type: 'Snowflake', logo: '/images/db-logos/snowflake.svg' },
  { id: 4, type: 'Files', logo: '/images/db-logos/local-files.svg' }
]
```

The 'Files' connection type is treated identically to database types.

---

## 3. Connection Parameters Configuration

### Unified Connection Params (Database Connections)
**Location**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/components/connection/params/UnifiedConnectionParams.vue`

Handles all database connection types with:
- Server/Host field
- Port field (with type-specific defaults)
- Username field
- Password field with visibility toggle
- Database field (optional)
- Connection type-specific placeholder hints

### Local Files Connection Params
**Location**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/components/connection/params/LocalFilesConnectionParams.vue`

Handles file connections with:
- **Folder Path field**: Required path to directory containing data files
- **Connection Name auto-generation**: `Files-{folderName}`
- **Default values applied**:
  - `type`: 'files' (lowercase)
  - `storage_config.provider`: 'local'
  - `storage_config.uri`: folder path from user input
  - `port`: 0 (not used)
  - `username`: 'local'
  - `password`: '' (empty)
  - `database`: '' (not used)

**Supported File Formats**:
- CSV (.csv, .csv.gz, .csv.zst)
- JSON (.json, .json.gz, .json.zst)
- JSONL (.jsonl, .jsonl.gz, .jsonl.zst)
- Parquet (.parquet)
- Mixed formats in the same folder allowed
- Compression: gzip (.gz) and zstd (.zst) supported

### Connection Params Wrapper
**Location**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/components/connection/params/ConnectionParams.vue`

Routes to appropriate component:
- If `connectionType === 'files'` → LocalFilesConnectionParams
- Otherwise → UnifiedConnectionParams (with SSL tab)

---

## 4. Connection State Management

### Connections Store
**Location**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/stores/connections.ts`

```typescript
interface State {
  dbTypes: DbType[]
  connections: Connection[]
  currentConnection: Connection | null
  sourceConnection: Connection | null
  targetConnection: Connection | null
  currentFilter: string
  isLoadingConnections: boolean
  isUpdatingConnection: boolean
  isTestingConnection: boolean
  isLoadingDatabases: boolean
}

// Key Actions
- refreshConnections()        // Fetches from API (always fresh from Consul)
- setCurrentConnection(id)    // Deep copy to avoid reactivity issues
- createConnection()          // Creates and initializes databasesInfo as []
- updateConnection()          // Updates existing connection
- getTables(connectionId)     // Gets tables for database
- getDatabases(connectionId)  // Gets databases list
- supportsMultiSchema()       // PostgreSQL, SQL Server, Oracle only
- initializeNewConnection()   // Sets up empty connection object
- setConnectionType(dbType)   // Normalizes to lowercase
```

**Important Notes**:
- Connections are always fetched fresh from API (no localStorage caching)
- Deep copy pattern prevents reactivity issues with current connection
- For new connections, `databasesInfo` is initialized as empty array
- File connections skip database/table operations

---

## 5. File Handling and Exploration

### File Explorer Store
**Location**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/stores/fileExplorer.ts`

State organized by connection ID:
```typescript
entriesByConnection: Record<string, FileSystemEntry[]>
directoryPathsByConnection: Record<string, string>
errorsByConnection: Record<string, string>
selectedPathsByConnection: Record<string, string | null>
loadingByConnection: Record<string, boolean>

// Key Methods
loadEntries(connectionId)      // Lists files in connection path
loadFileMetadata()             // Gets metadata (schema, stats) for file
setSelectedPath(connectionId)  // Tracks selected file for preview
isFilesConnectionType()        // Helper to detect 'files' connections
```

**Key Features**:
- Checks if connection type exactly matches 'files' (case-insensitive)
- Uses `storage_config.uri` for folder path
- Validates path exists before listing
- Filters directory entries to only files
- Returns error message if path not configured
- Loads file metadata with optional stats computation

### File System API
**Location**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/api/fileSystem.ts`

```typescript
listDirectory(path?, connectionType?)    // Lists directory contents
checkWritable(path)                      // Validates writable permission
getRoots()                               // Gets common root directories

// Passes connectionType to backend for format filtering
```

**API Endpoints**:
- `GET /fs/list` - List directory with optional connection type filtering
- `POST /fs/writable` - Check if path is writable
- `GET /fs/roots` - Get common root directories

### Files API
**Location**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/api/files.ts`

```typescript
getFileMetadata(path, format, stats?)    // Get file schema and metadata
getFileData(path, format, params)        // Get file contents with filtering
getFileExactCount(path, format)          // Get exact row count

// Query parameters supported
- limit, offset
- skipCount (for fast preview)
- order_by, order_dir
- where (SQL filter conditions)
```

**API Endpoints**:
- `GET /files/meta` - File metadata with schema and optional stats
- `GET /files/data` - File data with pagination and filtering
- `GET /files/count` - Exact row count for file

---

## 6. File Types and Metadata

### File Type Detection
**Location**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/types/files.ts`

```typescript
export interface FileMetadata {
  path: string
  format: FileFormat                    // 'csv', 'json', 'jsonl', 'parquet'
  size: number
  rowCount: number
  columnCount: number
  columns: FileColumnMetadata[]
  formatInfo?: Record<string, unknown>
  csvDialect?: CSVFormatDetails        // CSV-specific configuration
  jsonStructure?: JSONStructureInfo    // JSON structure analysis
  warnings?: string[]
}

export interface FileColumnMetadata {
  name: string
  type: string                         // Inferred data type
  nullable: boolean
  confidence?: number                  // Type inference confidence
}

export interface CSVFormatDetails {
  delimiter: string
  quote: string
  escape: string
  hasHeader: boolean
  lineTerminator: string
  skipBlankLines: boolean
}

export interface JSONStructureInfo {
  rootType: string                     // 'object' | 'array'
  isHomogeneous: boolean
  pathStats?: Record<string, JSONStructurePathStats>
  arrayInfo?: {
    elementCount: number
    elementType?: string
    isHomogeneous: boolean
    maxDepth: number
  }
}

export interface FileDataResponse {
  data: Array<Record<string, unknown>>
  schema: FileSchemaField[]
  total: number
  warnings?: string[]
}
```

---

## 7. Stream Configuration with File Connections

### Stream Config Types
**Location**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/types/streamConfig.ts`

```typescript
export interface StreamConfig {
  id: string
  name: string
  source?: string                      // Connection ID
  target?: string                      // Connection ID
  sourceDatabase?: string
  targetDatabase?: string
  created?: number
  mode: 'cdc' | 'convert'
  dataBundleSize: number
  reportingIntervals: { source: number; target: number }
  operations?: string[]                // ['insert', 'update', 'delete'] for CDC
  targetFileFormat?: 'csv' | 'json' | 'jsonl' | 'parquet'  // For file targets
  compressionType?: 'uncompressed' | 'gzip' | 'zstd'
  structureOptions?: {
    tables?: boolean
    indexes?: boolean
    foreignKeys?: boolean
  }
  skipData?: boolean
  useDuckDBWriter?: boolean            // Use DuckDB Appender for file writers
  limits: { numberOfEvents: number; elapsedTime: number }
  tables?: Table[]                     // For database sources
  files?: FileEntry[]                  // For file sources
  [key: string]: any
}

export interface FileEntry {
  name: string
  path: string
  size?: number
  selected: boolean
}
```

### Stream Config Store
**Location**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/stores/streamConfig.ts` (lines 166-184)

```typescript
// When target is a file connection:
updateTarget(targetId: string) {
  const connectionsStore = useConnectionsStore()
  const connection = connectionsStore.connectionByID(targetId)
  if (connection && connection.type?.toLowerCase().includes('file')) {
    // Auto-set default file format
    if (!this.currentStreamConfig.targetFileFormat) {
      this.currentStreamConfig.targetFileFormat = 'csv'
    }
  } else {
    // Remove file format for non-file targets
    delete this.currentStreamConfig.targetFileFormat
  }
}
```

**Stream Name Generation** (lines 323-357):
- Detects if target is file connection: `targetType.includes('file')`
- For file targets: Uses format (e.g., 'parquet', 'csv')
- For database targets: Uses connection type
- Format: `{sourceType}_to_{targetType}_{count}_tables`
- Examples: `postgresql_to_csv_14_tables`, `mysql_to_snowflake_5_tables`

---

## 8. File-Specific Components

### FilePreviewList
**Location**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/components/stream/wizard/FilePreviewList.vue`

Displays list of files from a file connection for stream configuration.

### FileDataView & AGGridFileDataView
**Location**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/components/files/`

Display file contents with:
- Column headers and data
- Pagination support
- Sorting and filtering
- AG Grid integration for large datasets

### FileOutputSummary
**Location**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/components/stream/configuration/FileOutputSummary.vue`

Shows output configuration for file-based streams.

---

## 9. Connection Detection and Routing

### Type Detection Pattern
Throughout the codebase, file connections are detected using:
```typescript
// Exact match
connectionType?.toLowerCase() === 'files'
```

### Component Routing Example
**ConnectionParams.vue** (lines 59-61):
```typescript
const isLocalFiles = computed(() => {
  return props.connectionType?.toLowerCase() === 'files'
})
```

---

## 10. API Integration Points

### Connection API
**Location**: `/home/dm3/dbconvert/dbconvert-streams-ui/src/api/connections.ts`

All connection operations:
- `getConnections()` - Fetches all connections from API
- `createConnection(json)` - Creates new connection
- `updateConnection()` - Updates current connection
- `deleteConnection(id)` - Deletes connection
- `cloneConnection(id)` - Clones existing connection
- `testConnection()` - Tests connection (works for files too)
- `pingConnectionById(id)` - Pings existing connection

**For Database-Specific Operations** (not applicable to file connections):
- `getDatabases(id)` - Lists databases
- `createDatabase(name, id)` - Creates database
- `createSchema(name, id, dbName)` - Creates schema
- `getTables(id, database)` - Lists tables
- `getMetadata(id, database)` - Gets table metadata
- `getTableData(connectionId, database, tableName, params)` - Gets table contents

**For File Connections**: These database operations skip, as files don't have databases/tables.

---

## 11. Key Design Patterns

### 1. Type-Based Routing
```typescript
// In components:
if (connection.type?.toLowerCase() === 'files') {
  // Handle as file connection
  // Use storage_config.uri field
} else {
  // Handle as database connection
  // Use host/port/database fields
}
```

### 2. Unified Connection Object
- Same `Connection` interface for all types
- Type-specific fields (storage_config vs host/port/database) used conditionally
- All connections stored in single array

### 3. Default Values for File Connections
```typescript
// Applied in LocalFilesConnectionParams
connection.type = 'files'
connection.storage_config = {
  provider: 'local',
  uri: '/path/to/folder'  // User-provided
}
connection.port = 0
connection.username = 'local'
connection.password = ''
connection.database = ''
```

### 4. Auto-Generation
- Connection names: `Files-{folderName}`
- Stream names: `{sourceType}_to_{targetType}_{count}_tables`
- File format defaults: 'csv' for new file targets

### 5. Store Organization for Files
- File explorer store organized by connection ID
- Maintains separate state for each connection
- Lazy loading of file metadata

### 6. API Separation
- Generic file operations: `/files/` endpoints
- File system operations: `/fs/` endpoints
- Connection-specific operations: `/connections/` endpoints

---

## 12. Configuration UI Workflow

### Creating a File Connection
1. User selects 'Files' from database type list
2. `ConnectionParams.vue` detects type and shows `LocalFilesConnectionParams`
3. User enters folder path via `FolderSelector` component
4. Connection name auto-generates as `Files-{folderName}`
5. Store applies defaults (port=0, username='local', password='')
6. API creates connection with `path` field populated

### Using File Connection as Source
1. Stream wizard selects file connection as source
2. File explorer loads files from connection path
3. User selects files via `FilePreviewList`
4. `FileEntry` items populated with path and metadata
5. Stream config includes `files` array instead of `tables`

### Using File Connection as Target
1. Stream wizard selects file connection as target
2. `updateTarget()` detects file type and auto-sets `targetFileFormat='csv'`
3. User can change format: csv | json | jsonl | parquet
4. Optional compression: uncompressed | gzip | zstd

---

## Summary Table: Connection vs File Connections

| Aspect | Database | File |
|--------|----------|------|
| **Type Field** | 'postgresql', 'mysql', 'snowflake' | 'files' |
| **Location** | host + port + database | storage_config.uri |
| **Storage Provider** | N/A | storage_config.provider (local, s3, etc.) |
| **File Format** | N/A | file_format (csv, json, jsonl, parquet) |
| **Credentials** | username + password | 'local' + empty |
| **Component** | UnifiedConnectionParams + SSLParams | LocalFilesConnectionParams |
| **Database Ops** | getDatabases, getTables, etc. | N/A |
| **File Ops** | N/A | listDirectory, getFileMetadata, etc. |
| **Stream Source** | Tables list | Files list |
| **Stream Target** | Database | File format + compression |
| **Discovery** | type === 'postgresql' | type === 'files' |

