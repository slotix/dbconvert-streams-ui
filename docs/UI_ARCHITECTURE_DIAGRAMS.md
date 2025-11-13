# UI Architecture - Visual Diagrams

## 1. Connection Type System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Connection Types                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐   │
│  │ PostgreSQL  │  │  MySQL   │  │Snowflake │  │ Files  │   │
│  └─────────────┘  └──────────┘  └──────────┘  └────────┘   │
│         │               │              │          │         │
│         └───────────────┴──────────────┴──────────┘         │
│                         │                                    │
│                  ┌──────▼──────┐                            │
│                  │  Connection  │                            │
│                  │  Interface   │                            │
│                  └──────────────┘                            │
│                                                              │
│  Fields:                                                     │
│  ├─ id, name, type                                          │
│  ├─ host, port (DB only)          ◄─ Type-specific         │
│  ├─ username, password                                      │
│  ├─ database (DB only)                                      │
│  ├─ file_format (FILES only)      ◄─ csv|json|jsonl|parquet│
│  └─ storage_config (FILES only)   ◄─ provider + uri        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Connection Parameters Component Routing

```
┌──────────────────────────────────┐
│    ConnectionParams.vue          │
│  (Router Component)              │
└──────────────────────┬───────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌─────────────────┐     ┌──────────────────────┐
│  connectionType │     │ connectionType       │
│  === 'files'?   │     │ !== 'files'          │
│      YES        │     │      NO              │
└────────┬────────┘     └──────────┬───────────┘
         │                         │
         │                         │
         ▼                         ▼
┌──────────────────────┐   ┌──────────────────────┐
│LocalFilesConnection  │   │UnifiedConnectionParams│
│     Params.vue       │   │        .vue          │
├──────────────────────┤   ├──────────────────────┤
│• Folder Path input   │   │• Server/Host input   │
│• Auto name from path │   │• Port input          │
│• Apply defaults:     │   │• Username input      │
│  - type='files'      │   │• Password input      │
│  - storage_config:   │   │• Database (optional) │
│    - provider='local'│   │• SSL tab             │
│    - uri=path        │   │• Type-specific hints │
│  - port=0            │   │                      │
│  - user='local'      │   │                      │
│  - pass=''           │   │                      │
└──────────────────────┘   └──────────────────────┘
```

---

## 3. Connection State Management Flow

```
┌─────────────────────────────────────────────────────────┐
│              useConnectionsStore                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  State:                                                  │
│  ├─ connections: Connection[]   (from API)             │
│  ├─ currentConnection: Connection | null               │
│  ├─ sourceConnection: Connection | null                │
│  └─ targetConnection: Connection | null                │
│                                                          │
│  Actions:                                               │
│  ├─ refreshConnections()   ◄─ Always fetch fresh       │
│  ├─ createConnection()                                 │
│  ├─ updateConnection()                                 │
│  ├─ deleteConnection()                                 │
│  ├─ setCurrentConnection()  ◄─ Deep copy pattern      │
│  ├─ getTables()    (DB only)                          │
│  ├─ getDatabases() (DB only)                          │
│  └─ setConnectionType()                                │
│                                                          │
└────────────────┬──────────────────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌─────────────┐    ┌──────────────────┐
│ API Client  │    │  Components      │
├─────────────┤    ├──────────────────┤
│POST /...    │    │LocalFiles...     │
│PUT /...     │    │UnifiedConnection │
│GET /...     │    │FilePreviewList   │
│DELETE /...  │    │ConnectionCard    │
└─────────────┘    └──────────────────┘
```

---

## 4. File Explorer State and Loading

```
┌──────────────────────────────────────────────────────────┐
│            useFileExplorerStore                          │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Keyed by Connection ID:                                │
│  ┌────────────────────────────────────────────────────┐ │
│  │ entriesByConnection                                │ │
│  │   [connectionId]: FileSystemEntry[]                │ │
│  │                                                    │ │
│  │ directoryPathsByConnection                        │ │
│  │   [connectionId]: string                          │ │
│  │                                                    │ │
│  │ selectedPathsByConnection                         │ │
│  │   [connectionId]: string | null                   │ │
│  │                                                    │ │
│  │ loadingByConnection                               │ │
│  │   [connectionId]: boolean                         │ │
│  │                                                    │ │
│  │ errorsByConnection                                │ │
│  │   [connectionId]: string                          │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  Actions:                                               │
│  ├─ loadEntries(connectionId)                           │
│  │   └─ Calls API: GET /fs/list                        │
│  │   └─ Validates path exists                          │
│  │   └─ Filters to files only                          │
│  │                                                       │
│  ├─ loadFileMetadata(fileEntry)                         │
│  │   └─ Calls API: GET /files/meta                     │
│  │   └─ Detects file format                            │
│  │   └─ Parses schema                                  │
│  │                                                       │
│  └─ setSelectedPath(connectionId, path)                │
│      └─ Tracks current file preview                    │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Stream Configuration with Files

```
Stream Target: File Connection
──────────────────────────────

┌─────────────────────────────────────────────┐
│    updateTarget(targetId)                   │
│    in useStreamsStore                       │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │                     │
        │ Is file type?       │
        │ type.includes      │
        │  ('file')          │
        │                     │
        └──┬────────────┬────┘
           │ YES        │ NO
           │            │
      ┌────▼───┐   ┌────▼────┐
      │ SET:   │   │ DELETE:  │
      │• target│   │targetFile│
      │FileFor │   │Format    │
      │mat=    │   │          │
      │'csv'   │   │          │
      └────┬───┘   └────┬─────┘
           │            │
           │            └────────┬───────┐
           │                     │       │
           ▼                     ▼       ▼
      ┌──────────┐      ┌──────────┐  ┌─────┐
      │csv/json  │      │Database  │  │Done │
      │/jsonl/   │      │Target    │  └─────┘
      │parquet   │      │          │
      └──────────┘      └──────────┘


Stream Source: File Connection
──────────────────────────────

┌─────────────────────────────────────────────┐
│ When source is file connection:             │
├─────────────────────────────────────────────┤
│                                             │
│ 1. Load files via fileExplorer store        │
│    └─ Get entries for connectionId          │
│                                             │
│ 2. User selects files via FilePreviewList   │
│    └─ Shows file list                       │
│    └─ Allows selection                      │
│                                             │
│ 3. Populate StreamConfig.files[]            │
│    [{                                       │
│      name: 'data.csv',                      │
│      path: '/path/data.csv',                │
│      selected: true                         │
│    }]                                       │
│    └─ No tables field                       │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 6. Connection Detection Logic

```
┌────────────────────────────────────────────────┐
│   File Connection Detection Pattern            │
├────────────────────────────────────────────────┤
│                                                │
│  const connection = {                         │
│    type: 'files'                              │
│  }                                            │
│                                                │
│  // Detection: Exact match                   │
│  if (type?.toLowerCase() === 'files') {      │
│    // This IS a file connection              │
│  }                                            │
│                                                │
│  File format is specified separately:         │
│  - connection.file_format (optional)          │
│  - streamConfig.targetFileFormat (for target) │
│                                                │
└────────────────────────────────────────────────┘
```

---

## 7. API Endpoint Hierarchy

```
┌────────────────────────────────────────────────────────┐
│            Backend API Endpoints                       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  /connections                                         │
│  ├─ GET  /            (list all)                      │
│  ├─ POST /            (create)                        │
│  │                                                    │
│  ├─ GET  /{id}        (get single)                    │
│  ├─ PUT  /{id}        (update)                        │
│  ├─ POST /{id}/ping   (test - works for FILES)       │
│  ├─ PUT  /{id}/clone  (clone)                        │
│  │                                                    │
│  ├─ GET  /{id}/databases        (DB only)           │
│  ├─ POST /{id}/databases        (DB only)           │
│  └─ GET  /{id}/databases/.../tables (DB only)       │
│                                                        │
│  /fs (File System)                                    │
│  ├─ GET  /list        (list directory)              │
│  ├─ POST /writable    (check writable)              │
│  └─ GET  /roots       (get root dirs)               │
│                                                        │
│  /files (File Operations)                            │
│  ├─ GET  /meta        (metadata + schema)           │
│  ├─ GET  /data        (file contents)               │
│  └─ GET  /count       (exact row count)             │
│                                                        │
│  /stream-configs                                      │
│  ├─ GET  /            (list configs)                │
│  ├─ POST /            (create)                      │
│  ├─ PUT  /{id}/clone  (clone)                      │
│  └─ ...                                              │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 8. File Metadata Structure

```
┌──────────────────────────────────────┐
│         FileMetadata                 │
├──────────────────────────────────────┤
│                                      │
│  path: string                        │
│  format: 'csv'|'json'|'jsonl'|      │
│          'parquet'                   │
│  size: number                        │
│  rowCount: number                    │
│  columnCount: number                 │
│                                      │
│  columns: FileColumnMetadata[]       │
│  ├─ name: string                    │
│  ├─ type: string (inferred)         │
│  ├─ nullable: boolean               │
│  └─ confidence?: number             │
│                                      │
│  formatInfo?: {...}                  │
│  csvDialect?: {                      │
│    ├─ delimiter: string             │
│    ├─ quote: string                 │
│    ├─ escape: string                │
│    ├─ hasHeader: boolean            │
│    ├─ lineTerminator: string        │
│    └─ skipBlankLines: boolean       │
│  }                                   │
│                                      │
│  jsonStructure?: {                   │
│    ├─ rootType: 'object'|'array'   │
│    ├─ isHomogeneous: boolean        │
│    ├─ pathStats?: {[path]: {        │
│    │   jsonPath: string             │
│    │   occurrences: number          │
│    │   type: string                 │
│    │   isRequired: boolean           │
│    │ }}                             │
│    └─ arrayInfo?: {...}             │
│  }                                   │
│                                      │
│  warnings?: string[]                 │
│                                      │
└──────────────────────────────────────┘
```

---

## 9. Stream Configuration Structure

```
┌─────────────────────────────────────────────┐
│        StreamConfig (Simplified)             │
├─────────────────────────────────────────────┤
│                                             │
│  id: string                                 │
│  name: string                               │
│  source: string (connection ID)             │
│  target: string (connection ID)             │
│  mode: 'cdc' | 'convert'                   │
│                                             │
│  // For DB source:                         │
│  tables?: Table[] {                        │
│    name: string                            │
│    selected: boolean                       │
│  }                                         │
│                                             │
│  // For file source:                       │
│  files?: FileEntry[] {                     │
│    name: string                            │
│    path: string                            │
│    selected: boolean                       │
│  }                                         │
│                                             │
│  // For file target:                       │
│  targetFileFormat?: 'csv'|'json'|          │
│                    'jsonl'|'parquet'       │
│  compressionType?: 'uncompressed'|         │
│                   'gzip'|'zstd'            │
│                                             │
│  // Other:                                 │
│  dataBundleSize: number                    │
│  reportingIntervals: {source, target}      │
│  useDuckDBWriter?: boolean                 │
│  skipData?: boolean                        │
│  limits: {numberOfEvents, elapsedTime}     │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 10. Complete Connection Lifecycle

```
1. CREATE CONNECTION
   ┌────────────────────────────┐
   │ User selects 'Files'       │
   └──────────┬─────────────────┘
              │
   ┌──────────▼────────────────────┐
   │ LocalFilesConnectionParams    │
   │ shows folder path input       │
   └──────────┬────────────────────┘
              │
   ┌──────────▼────────────────────┐
   │ Defaults applied:             │
   │ - type='files'                │
   │ - port=0                      │
   │ - username='local'            │
   │ - password=''                 │
   │ - name auto-gen from path     │
   └──────────┬────────────────────┘
              │
   ┌──────────▼────────────────────┐
   │ API: POST /connections        │
   │ Saves to Consul               │
   └──────────┬────────────────────┘
              │
   ┌──────────▼────────────────────┐
   │ Returns id, stores in UI      │
   │ Connection ready to use       │
   └────────────────────────────────┘


2. USE IN STREAM (as source)
   ┌────────────────────────────┐
   │ Select file connection      │
   └──────────┬─────────────────┘
              │
   ┌──────────▼──────────────────────┐
   │ fileExplorer.loadEntries()      │
   │ Lists files from path           │
   └──────────┬──────────────────────┘
              │
   ┌──────────▼──────────────────────┐
   │ FilePreviewList shows files    │
   └──────────┬──────────────────────┘
              │
   ┌──────────▼──────────────────────┐
   │ User selects files             │
   └──────────┬──────────────────────┘
              │
   ┌──────────▼──────────────────────┐
   │ StreamConfig.files populated   │
   │ [FileEntry, FileEntry, ...]   │
   └────────────────────────────────┘


3. USE IN STREAM (as target)
   ┌────────────────────────────┐
   │ Select file connection      │
   └──────────┬─────────────────┘
              │
   ┌──────────▼──────────────────┐
   │ updateTarget() detects file │
   │ Sets targetFileFormat='csv' │
   └──────────┬──────────────────┘
              │
   ┌──────────▼──────────────────┐
   │ User configures:            │
   │ - format (csv/json/parquet) │
   │ - compression (gzip/zstd)   │
   └──────────┬──────────────────┘
              │
   ┌──────────▼──────────────────┐
   │ Stream configured & ready   │
   │ to execute                  │
   └────────────────────────────┘
```

