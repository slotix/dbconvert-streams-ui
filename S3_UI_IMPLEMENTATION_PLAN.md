# S3 Support Implementation Plan for UI

## Overview
Add S3/S3-compatible storage support to the DBConvert Streams UI, following the existing file connection pattern. S3 will be treated as a new connection type alongside Files, MySQL, PostgreSQL, and Snowflake.

## Architecture Approach
- **Model S3 after existing "Files" connection type** - reuse proven patterns
- **New connection type**: "S3" (similar to how "Files" is handled)
- **Dedicated parameter component**: `S3ConnectionParams.vue` (like `LocalFilesConnectionParams.vue`)
- **API integration**: Add S3-specific endpoints to `files.ts` API module
- **Session management**: Configure S3 credentials before file operations
- **Credential handling**: Frontend sends credentials to backend; backend handles Vault storage (same as database connections)

## Backend S3 Endpoints (Already Implemented ✅)

From `docs/_S3_USER_GUIDE.md`:

1. **POST** `/api/v1/files/s3/configure` - Configure S3 session with credentials
2. **GET** `/api/v1/files/s3/list` - List objects in S3 bucket
3. **GET** `/api/v1/files/s3/validate` - Validate S3 path and get recommendations
4. **GET** `/api/v1/files/s3/manifest` - Read manifest file
5. **GET** `/api/v1/files/data` - Read file data (already supports `s3://` URIs)
6. **GET** `/api/v1/files/metadata` - Get file metadata (already supports `s3://` URIs)

## Implementation Steps

### 1. **Backend API Integration** (TypeScript) ✅ COMPLETED

**File**: `/src/api/files.ts`

Add S3 API functions:

```typescript
// S3 Configuration
export interface S3ConfigRequest {
  credentialSource: 'aws' | 'static'  // Backend decides on Vault storage
  profileName?: string                 // For backend Vault retrieval only
  endpoint?: string                    // Required for S3-compatible providers
  region: string
  urlStyle?: 'auto' | 'path' | 'virtual'
  useSSL?: boolean
  credentials?: {
    accessKeyId: string
    secretAccessKey: string
    sessionToken?: string
  }
  performance?: {
    threads?: number
    enableFileCache?: boolean
  }
  limits?: {
    maxListObjects?: number
    maxScanBytes?: number
    queryTimeoutS?: number
  }
}

export interface S3ConfigResponse {
  status: string
  message: string
  config: {
    endpoint: string
    region: string
    urlStyle: string
    useSSL: boolean
    threads: number
  }
}

export interface S3ListRequest {
  bucket: string
  prefix?: string
  maxKeys?: number
  continuationToken?: string
}

export interface S3Object {
  key: string
  size: number
  last_modified: string
  etag: string
  storage_class: string
}

export interface S3ListResponse {
  objects: S3Object[]
  bucket: string
  prefix: string
  count: number
  is_truncated: boolean
  next_token: string
  total_size: number
}

export interface S3ValidationResponse {
  valid: boolean
  recommendedMode: 'direct' | 'glob' | 'hive' | 'manifest'
  reason: string
  isHivePartitioned: boolean
  hivePartitions?: string[]
  warnings: string[]
}

export interface S3ManifestResponse {
  manifest: {
    version: string
    files: string[]
    metadata: Record<string, any>
  }
  stats: {
    file_count: number
    s3_files: number
    local_files: number
    version: string
  }
}

// API Functions
export async function configureS3Session(config: S3ConfigRequest): Promise<S3ConfigResponse> {
  try {
    const response = await apiClient.post<S3ConfigResponse>('/files/s3/configure', config, {
      ...withAuthHeaders()
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

export async function listS3Objects(params: S3ListRequest): Promise<S3ListResponse> {
  try {
    const query = new URLSearchParams()
    query.set('bucket', params.bucket)
    if (params.prefix) query.set('prefix', params.prefix)
    if (params.maxKeys) query.set('maxKeys', String(params.maxKeys))
    if (params.continuationToken) query.set('continuationToken', params.continuationToken)

    const response = await apiClient.get<S3ListResponse>(
      `/files/s3/list?${query.toString()}`,
      { ...withAuthHeaders() }
    )
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

export async function validateS3Path(path: string): Promise<S3ValidationResponse> {
  try {
    const response = await apiClient.get<S3ValidationResponse>('/files/s3/validate', {
      params: { path },
      ...withAuthHeaders()
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}

export async function readS3Manifest(path: string): Promise<S3ManifestResponse> {
  try {
    const response = await apiClient.get<S3ManifestResponse>('/files/s3/manifest', {
      params: { path },
      ...withAuthHeaders()
    })
    return response.data
  } catch (error) {
    throw handleApiError(error)
  }
}
```

### 2. **Type Definitions** (TypeScript) ✅ COMPLETED

**File**: `/src/types/connections.ts`

Extend the `Connection` interface to support S3 fields:

```typescript
export interface Connection {
  id: string | ''
  name: string
  type: string
  host: string
  port: number
  username: string
  password: string
  databasesInfo: DatabaseInfo[]
  database: string
  created?: number
  ssl?: SSLConfig
  cloud_provider?: string
  status?: string
  path?: string                   // For file connections

  // S3-specific fields
  s3Config?: {
    credentialSource: 'aws' | 'static'
    endpoint?: string
    region: string
    urlStyle?: 'auto' | 'path' | 'virtual'
    useSSL?: boolean
    bucket?: string               // Optional: Scope connection to specific bucket
    prefix?: string               // Optional: Scope connection to specific prefix
    // Credentials stored as username/password fields (backend handles Vault)
  }
}
```

### 3. **Connection Store Updates** ✅ COMPLETED

**File**: `/src/stores/connections.ts`

```typescript
dbTypes: [
  { id: 0, type: 'All', logo: '/images/db-logos/all.svg' },
  { id: 1, type: 'PostgreSQL', logo: '/images/db-logos/postgresql.svg' },
  { id: 2, type: 'MySQL', logo: '/images/db-logos/mysql.svg' },
  { id: 3, type: 'Snowflake', logo: '/images/db-logos/snowflake.svg' },
  { id: 4, type: 'Files', logo: '/images/db-logos/local-files.svg' },
  { id: 5, type: 'S3', logo: '/images/db-logos/s3.svg' }  // NEW
]
```

**Note**: Add S3 logo file: `/public/images/db-logos/s3.svg`

### 4. **UI Components** ✅ COMPLETED

#### A. New Component: `S3ConnectionParams.vue` ✅ COMPLETED

**Location**: `/src/components/connection/params/S3ConnectionParams.vue`

**Form Fields**:

```
┌─────────────────────────────────────────────────────────────┐
│ Connection ID (if editing)                                  │
├─────────────────────────────────────────────────────────────┤
│ Connection Name                                             │
├─────────────────────────────────────────────────────────────┤
│ S3 Configuration                                            │
│                                                             │
│  Provider Preset:                                           │
│    ○ AWS S3                                                 │
│    ○ MinIO                                                  │
│    ○ DigitalOcean Spaces                                    │
│    ○ Wasabi                                                 │
│    ○ Ceph RADOS Gateway                                     │
│    ○ Custom                                                 │
│                                                             │
│  Credential Source:                                         │
│    ○ AWS Default Chain (IAM roles, env vars)               │
│    ○ Static Credentials                                     │
│                                                             │
│  [If Static Credentials selected:]                          │
│    Access Key ID: _____________________________            │
│    Secret Access Key: _________________________            │
│    Session Token (optional): ___________________           │
│                                                             │
│  Region: _____________ (auto-filled by preset)             │
│  Endpoint: ____________ (auto-filled by preset)            │
│                                                             │
│  Advanced Settings (collapsed by default):                 │
│    URL Style: [Auto ▼] (Auto/Path/Virtual-hosted)          │
│    Use SSL: [✓] (toggle)                                   │
│    Thread Count: [8]                                        │
│                                                             │
│  Optional Scope:                                            │
│    Bucket (optional): ___________________                  │
│    Prefix (optional): ___________________                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ ℹ️ Supported File Formats                                   │
│   Parquet, CSV, JSON, JSONL (with .gz/.zst compression)    │
│                                                             │
│   Supported Providers: AWS S3, MinIO, DigitalOcean Spaces, │
│   Wasabi, Ceph, and any S3-compatible storage              │
└─────────────────────────────────────────────────────────────┘
```

**Provider Preset Behavior**:

When user selects a preset, auto-fill fields:

```typescript
const providerPresets = {
  'AWS S3': {
    endpoint: '',  // Empty for AWS S3
    region: 'us-east-1',
    urlStyle: 'auto',
    useSSL: true
  },
  'MinIO': {
    endpoint: 'localhost:9000',
    region: 'us-east-1',
    urlStyle: 'path',
    useSSL: false
  },
  'DigitalOcean Spaces': {
    endpoint: 'nyc3.digitaloceanspaces.com',
    region: 'nyc3',
    urlStyle: 'path',
    useSSL: true
  },
  'Wasabi': {
    endpoint: 's3.wasabisys.com',
    region: 'us-east-1',
    urlStyle: 'path',
    useSSL: true
  },
  'Ceph RADOS Gateway': {
    endpoint: 'ceph-rgw.example.com:7480',
    region: 'default',
    urlStyle: 'path',
    useSSL: false
  },
  'Custom': {
    endpoint: '',
    region: '',
    urlStyle: 'auto',
    useSSL: true
  }
}
```

**Connection Name Auto-generation**:
- Pattern: `S3-{Provider}-{Bucket}` or `S3-{Provider}-{Region}`
- Example: `S3-AWS-my-data-bucket` or `S3-MinIO-us-east-1`

**Data Mapping** (to `Connection` interface):
```typescript
// Map S3 fields to Connection interface
connection.type = 's3'
connection.name = buildConnectionName()

// Store credentials in standard fields (backend handles Vault)
if (credentialSource === 'static') {
  connection.username = accessKeyId
  connection.password = secretAccessKey
} else {
  connection.username = 'aws-default'  // Marker for AWS default chain
  connection.password = ''
}

// S3-specific config
connection.s3Config = {
  credentialSource,
  endpoint,
  region,
  urlStyle,
  useSSL,
  bucket,
  prefix
}

// Session token stored separately (if needed)
connection.s3Config.sessionToken = sessionToken

// Not used for S3
connection.host = endpoint || 's3.amazonaws.com'
connection.port = 443
connection.database = bucket || ''
connection.path = prefix || ''
```

#### B. Update `ConnectionParams.vue` ✅ COMPLETED

**File**: `/src/components/connection/params/ConnectionParams.vue`

Add S3 detection and routing:

```vue
<script setup lang="ts">
import S3ConnectionParams from './S3ConnectionParams.vue'

// Check if this is an S3 connection
const isS3 = computed(() => {
  return props.connectionType?.toLowerCase() === 's3'
})

// Check if this is a Files connection
const isLocalFiles = computed(() => {
  return props.connectionType?.toLowerCase() === 'files'
})
</script>

<template>
  <!-- S3 - No tabs needed -->
  <div v-if="isS3" class="container mx-auto w-full">
    <S3ConnectionParams :connectionType="props.connectionType" :logo="props.logo" />
  </div>

  <!-- Local Files - No tabs needed -->
  <div v-else-if="isLocalFiles" class="container mx-auto w-full">
    <LocalFilesConnectionParams :connectionType="props.connectionType" :logo="props.logo" />
  </div>

  <!-- Database connections - Show tabs -->
  <div v-else>
    <!-- existing database tabs code -->
  </div>
</template>
```

#### C. New Component: `S3Browser.vue` (Optional, Future Enhancement)

**Location**: `/src/components/files/S3Browser.vue`

This component would provide S3-specific browsing features:
- Bucket/prefix tree navigation
- File listing with pagination
- Path validation indicator
- Reading mode recommendations

**Note**: For MVP, we can reuse the existing file browser and just ensure it works with `s3://` URIs.

### 5. **File Explorer Store Enhancement** ✅ COMPLETED

**File**: `/src/stores/fileExplorer.ts`

Add S3 session configuration state:

```typescript
export const useFileExplorerStore = defineStore('fileExplorer', {
  state: () => ({
    // existing state...

    // S3 session configuration
    s3SessionConfigured: false,
    s3CurrentConnection: null as Connection | null,
  }),

  actions: {
    async configureS3Session(connection: Connection) {
      if (connection.type.toLowerCase() !== 's3') {
        return
      }

      const config: S3ConfigRequest = {
        credentialSource: connection.s3Config?.credentialSource || 'static',
        region: connection.s3Config?.region || 'us-east-1',
        endpoint: connection.s3Config?.endpoint,
        urlStyle: connection.s3Config?.urlStyle || 'auto',
        useSSL: connection.s3Config?.useSSL !== false,
        credentials: connection.username !== 'aws-default' ? {
          accessKeyId: connection.username,
          secretAccessKey: connection.password,
          sessionToken: connection.s3Config?.sessionToken
        } : undefined
      }

      await configureS3Session(config)
      this.s3SessionConfigured = true
      this.s3CurrentConnection = connection
    },

    async loadS3Files(bucket: string, prefix?: string) {
      const result = await listS3Objects({ bucket, prefix, maxKeys: 1000 })

      // Convert S3 objects to FileSystemEntry format
      const entries: FileSystemEntry[] = result.objects.map(obj => ({
        name: obj.key.split('/').pop() || obj.key,
        path: `s3://${bucket}/${obj.key}`,
        type: obj.key.endsWith('/') ? 'directory' : 'file',
        size: obj.size,
        mod_time: obj.last_modified,
        is_dir: obj.key.endsWith('/')
      }))

      return entries
    }
  }
})
```

### 6. **Connection Workflow Updates**

#### Before accessing S3 files:

```typescript
// In ExplorerSidebarConnections or similar component
async function handleSelectConnection(connectionId: string) {
  const connection = connectionsStore.getConnectionById(connectionId)

  if (connection?.type.toLowerCase() === 's3') {
    // Configure S3 session before browsing
    await fileExplorerStore.configureS3Session(connection)
  }

  // Continue with normal connection selection
  explorerState.currentConnectionId.value = connectionId
}
```

#### When reading S3 files:

The existing `getFileData()` and `getFileMetadata()` functions already support `s3://` URIs, so no changes needed. The backend will use the configured S3 session automatically.

## Testing Strategy

### 1. Local Testing with MinIO

```bash
# Start MinIO (from tests/s3-reader)
cd tests/s3-reader
make up

# MinIO Console: http://localhost:9001
# Username: minioadmin
# Password: minioadmin
```

**Test Case**: Create S3 connection with MinIO preset
- Provider: MinIO
- Endpoint: `localhost:9000`
- Region: `us-east-1`
- URL Style: Path
- Use SSL: No
- Access Key: `minioadmin`
- Secret Access Key: `minioadmin`
- Bucket: `test-bucket`

**Expected**: Connection saved, can browse `test-bucket`, can read sample files

### 2. AWS S3 Testing (if credentials available)

**Test Case**: Create S3 connection with AWS Default Chain
- Provider: AWS S3
- Credential Source: AWS Default Chain
- Region: `us-east-1`

**Expected**: Connection uses IAM role, no credentials stored

### 3. File Format Testing

Test reading all supported formats:
- Parquet: `s3://test-bucket/data/sample.parquet`
- CSV: `s3://test-bucket/data/sample.csv`
- JSON: `s3://test-bucket/data/sample.json`
- JSONL: `s3://test-bucket/data/sample.jsonl`
- Compressed: `s3://test-bucket/data/sample.csv.gz`

### 4. Manifest Testing

Upload manifest file and test manifest-driven reading:
```json
{
  "version": "1.0",
  "files": [
    "s3://test-bucket/data/file1.parquet",
    "s3://test-bucket/data/file2.parquet"
  ]
}
```

## User Workflow

### Create S3 Connection

1. User clicks **"New Connection"** button
2. Selects **"S3"** from connection type dropdown
3. Selects provider preset (e.g., "MinIO" or "AWS S3")
4. Form auto-fills with preset values
5. User enters credentials:
   - For AWS: Can choose "AWS Default Chain" (no credentials)
   - For others: Enters Access Key ID and Secret Access Key
6. (Optional) Enters bucket name to scope connection
7. Clicks **"Test Connection"** to validate
8. Clicks **"Save"** to store connection

### Browse S3 Files

1. User opens S3 connection in explorer sidebar
2. Backend configures S3 session automatically
3. User sees bucket/prefix tree (if scoped) or bucket list
4. User navigates folders, sees file list
5. User clicks file to preview data
6. Data loads using existing file viewer components

### Use in Streams (Future)

1. User creates new stream
2. Selects S3 connection as source
3. Specifies path: `s3://bucket/path/*.parquet`
4. For large datasets, can upload manifest file
5. Stream processes data from S3

## Design Decisions

### Why separate S3 from Files?

1. **Different credential/auth model**: S3 requires access keys, regions, endpoints
2. **Network-based vs local**: S3 is remote storage, Files is local filesystem
3. **Session configuration**: S3 needs session setup before operations
4. **Different browsing UX**: Buckets/prefixes vs folders/directories
5. **Provider-specific settings**: URL style, endpoints vary by provider

### Credential Security

- **Static credentials**: Stored in `username`/`password` fields, backend stores in Vault if configured
- **AWS Default Chain**: No credentials stored, backend uses AWS SDK credential chain
- **Session tokens**: Stored in `s3Config.sessionToken`, handled by backend
- **Frontend**: Just collects and sends credentials, doesn't manage Vault

### Why reuse username/password fields?

Following the existing pattern:
- Database connections use `username`/`password` fields
- Backend handles Vault storage transparently
- Frontend doesn't need Vault-specific logic
- S3 Access Key ID → `username`
- S3 Secret Access Key → `password`

### Provider Presets

Simplify configuration with provider templates:
- **AWS S3**: Empty endpoint, region required
- **MinIO**: Custom endpoint, path-style URLs
- **DigitalOcean Spaces**: Regional endpoints, path-style
- **Others**: Similar patterns

Presets eliminate user errors and configuration complexity.

## Files to Create/Modify

### New Files (~3 files) ✅ ALL COMPLETED

1. ✅ `/src/components/connection/params/S3ConnectionParams.vue` (~300-400 lines)
2. ✅ `/src/types/s3.ts` (~100 lines - S3-specific types)
3. ✅ `/public/images/db-logos/s3.svg` (logo file)

### Modified Files (~5 files) ✅ ALL COMPLETED

1. ✅ `/src/api/files.ts` - Add S3 API functions (+200 lines)
2. ✅ `/src/stores/connections.ts` - Add S3 type to dbTypes array (+1 line)
3. ✅ `/src/components/connection/params/ConnectionParams.vue` - Add S3 routing (+10 lines)
4. ✅ `/src/types/connections.ts` - Extend Connection interface (+15 lines)
5. ✅ `/src/stores/fileExplorer.ts` - Add S3 session management (+50 lines)

### Optional Enhancement Files (Future)

1. `/src/components/files/S3Browser.vue` - S3-specific file browser
2. `/src/composables/useS3Browser.ts` - S3 browsing logic

## Estimated Effort

| Task | Time |
|------|------|
| Backend API integration (files.ts) | 2-3 hours |
| Type definitions (s3.ts, connections.ts) | 1 hour |
| S3ConnectionParams component | 4-5 hours |
| Connection store updates | 30 minutes |
| ConnectionParams routing | 30 minutes |
| File explorer store S3 support | 2 hours |
| Testing with MinIO | 2 hours |
| Testing with AWS S3 | 1 hour |
| Bug fixes and polish | 2-3 hours |
| **Total** | **15-18 hours** |

## Dependencies

- ✅ Backend S3 endpoints implemented (v1.8)
- ✅ MinIO test environment available (`tests/s3-reader`)
- ✅ S3 user guide documentation
- ✅ Backend handles Vault storage for credentials
- ⚠️ AWS S3 credentials for testing (optional)
- ⚠️ S3 logo SVG file needed

## Implementation Status

### Completed Tasks ✅

1. ✅ Created type definitions (`s3.ts`, extended `connections.ts`)
2. ✅ Added S3 API functions to `files.ts`
3. ✅ Updated connection store to add S3 type
4. ✅ Created `S3ConnectionParams.vue` component
5. ✅ Updated `ConnectionParams.vue` routing
6. ✅ Updated file explorer store for S3 session management
7. ✅ Added S3 logo file

### Next Steps

1. ⏳ Test with MinIO
2. ⏳ Test with AWS S3 (if available)
3. ⏳ Polish UI and error handling
4. ⏳ Add comprehensive error messages and validation

## References

- Backend S3 User Guide: `/home/dm3/dbconvert/dbconvert-stream/docs/_S3_USER_GUIDE.md`
- Backend S3 Spec: `/home/dm3/dbconvert/dbconvert-stream/docs/TODO:s3_reading_spec.md`
- S3 Tests: `/home/dm3/dbconvert/dbconvert-stream/tests/s3-reader/`
- UI Architecture: `/home/dm3/dbconvert/dbconvert-stream/UI_CONNECTION_ARCHITECTURE.md`
