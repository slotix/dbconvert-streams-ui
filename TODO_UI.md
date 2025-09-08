# UI Implementation TODO for File Connection Support

## Overview
Backend now supports file connections (CSV, JSON, JSONL, Parquet) using the same API endpoints as database connections. File connections work transparently through existing endpoints with automatic routing based on connection type.

## ✅ Backend Implementation Complete

### Extended API Endpoints
- `GET /connections/{id}/databases` - Lists directories as "databases" for file connections
- `GET /connections/{id}/tables` - Lists files as "tables" for file connections  
- `GET /connections/{id}/tables/{filename}/data` - Reads file data like table data
- All existing database endpoints now support file connections transparently

### File Connection Detection
- `dbengine.IsFileFormatConnection()` detects file connection types
- Automatic routing to file-specific handlers
- Same response format as database connections

## 🎯 UI Implementation Tasks


### 1. Connection Creation/Editing (STORAGE ENDPOINT APPROACH)
- [ ] **Add Files connection type to dropdown**
  - Single "Files" connection type (not per-format)
  - Provider selection: Local / S3 / GCS / Azure
  - Icons available in `/home/dm3/dbconvert/dbconvert-streams-ui/public/images/db-logos` folder
  - Show different form fields for file vs database connections

- [ ] **File connection form fields**
  ```
  Connection Type: Files
  Provider: [Local ▼] [S3] [GCS] [Azure]
  Root Path/Bucket: /path/to/files or bucket-name
  Prefix (optional): folder/subfolder/
  Credentials: [Provider-specific]
  ```

- [ ] **Connection testing**
  - File connections test directory/bucket access instead of DB ping
  - Show appropriate success/error messages
  - Validate permissions for list/read operations

### 2. Connection Cards/List View
- [ ] **Visual distinction for file connections**
  - Show storage provider icon (folder, S3, GCS, Azure)
  - Display provider + path instead of host:port
  - Different connection info display format

- [ ] **Connection card badges**
  - Source/Target role badges (existing)
  - Provider badges (Local, S3, GCS, Azure)
  - Mixed format indicator ("Mixed Files" if folder contains multiple formats)

### 3. Connection Exploration
- [ ] **Folder/Directory listing (as "databases")**
  - Same UI as database listing
  - Show folder icon instead of database icon
  - Handle empty directory case gracefully
  - Root scope "folder" drives navigation

- [ ] **File listing (as "tables")**
  - Same table list UI with format-specific enhancements
  - Show file icons + **format badges** (CSV/JSON/JSONL/Parquet)
  - Display file size, modified date
  - File names appear without extensions (backend removes them)
  - Mixed formats in same folder handled elegantly

- [ ] **File data preview**
  - Reuse existing table data preview components
  - Same pagination, column headers, data rows
  - Format badge visible in preview header
  - Cache inferred schema per file (invalidate on mtime change)

### 4. Stream Configuration
- [ ] **Source selection**
  - Files connections appear in connection dropdown
  - Show provider info in connection description
  - Support selecting files as source tables (any format)
  - Format detected automatically per file

- [ ] **Target selection & format choice**
  - **Pick write format at stream step, not connection step**
  - Output format dropdown: CSV / JSON / JSONL / Parquet
  - Format-specific options (compression, partitioning) in stream config
  - Target path/naming conventions

- [ ] **Advanced dataset configuration**
  - Path patterns for file sources (*.csv, year=*/month=*/*.parquet)
  - Rolling/partitioned output options
  - Batch vs streaming write modes

### 5. Format Detection & Metadata
- [ ] **Smart format detection**
  - By extension first: .csv, .json, .jsonl, .parquet
  - Magic bytes fallback: Parquet (PAR1), JSON vs JSONL heuristics
  - CSV delimiter sniffing (comma/semicolon/tab)
  - Cache results, invalidate on mtime change

- [ ] **File metadata display**
  - Use existing `/files/meta` endpoint
  - Show schema information, row counts, format confidence
  - File validation status and warnings
  - Handle ambiguous cases (mixed JSON/JSONL)

### 6. Enhanced File Features (Optional)
- [ ] **File upload interface**
  - Drag & drop file upload to existing connections
  - Automatic format detection on upload

- [ ] **Cloud provider integration**
  - Provider-specific credential forms
  - Credential management (Vault integration)
  - Browse cloud directories with pagination

## 🗂️ STORAGE ENDPOINT MODEL (FINAL APPROACH)

### Core Decision: Model by Storage Location, Not File Format

**Create connections by storage endpoint**: Local filesystem / S3 / GCS / Azure bucket.

**Treat folders as "databases" and files as "tables"**. Show each file with a format badge (CSV/JSON/JSONL/Parquet).

**Pick the write format at the stream step, not at the connection step**.

### Why Not "CSV Connection", "Parquet Connection"?
- ❌ Fails on heterogeneous folders (would need multiple connections to same path)
- ❌ Leaks implementation detail into connection layer (format is file property, not endpoint property)
- ✅ Your backend APIs already route file connections transparently

### UX Specifics

**Connection Form:**
- Type: Files
- Provider: Local / S3 / GCS / Azure  
- Root path / bucket + prefix
- Test = directory access, not DB ping

**Explorer:**
- Root scope "folder"; show folders as databases
- Files listed as tables with CSV/JSON/JSONL/Parquet badges, size, mtime
- Name without extension, icons from `/public/images/db-logos`

**Streams:**
- Source: pick any file(s) regardless of format
- Target: choose output format + options in stream config

### Edge Cases & Guardrails
- **Mixed formats in one folder**: Totally fine—badges + per-file readers handle it
- **Ambiguous .json**: Multi-line objects = JSON; one-per-line = JSONL; warn if mixed
- **Huge files**: Metadata via `/files/meta`; lazy preview reuses table preview
- **Write targets**: Enforce options (compression, partitioning) in stream step

## 🏗️ UNIFIED CONNECTION ARCHITECTURE

### Core Philosophy
Treat "database-in-URL" as an implementation detail, not a UX truth. Make the database context explicit in the stream (table picker) while letting many connections be DB-less at the connection layer—with smart fallbacks per engine.

### 1. Capability Flags System
Store these on the connection after a quick probe:

```typescript
interface ConnectionCapabilities {
  canConnectWithoutDb: boolean    // can we open a session with no database named?
  canListDatabases: boolean       // can we enumerate DBs at the server level?
  requiresWarehouse: boolean      // Snowflake-like nuance
  rootScope: 'server' | 'database' | 'folder'  // drives the explorer root
}
```

**Engine Defaults:**
- **PostgreSQL** (incl. DO Managed, Neon): `canConnectWithoutDb: true`, `canListDatabases: true`, `rootScope: "server"` (fallback to `postgres` DB for metadata)
- **MySQL**: `canConnectWithoutDb: true`, `canListDatabases: true`, `rootScope: "server"`
- **Snowflake**: `canConnectWithoutDb: true`, `requiresWarehouse: recommended`, `canListDatabases: true`, `rootScope: "server"`
- **File systems**: `canConnectWithoutDb: n/a`, `canListDatabases: true` (folders = "databases"), `rootScope: "folder"`

### 2. Connection Form UX (Unified) - ✅ IMPLEMENTED
- **Step 1**: Choose type (DB vs Files)
- **Step 2**: Show fields based on type. **Database field is optional** for all database types
  - **Database field moved to Connection Details section** (not a separate step)
  - Clear UI hint: "Leave blank to browse all databases, or specify one for direct access"
  - **Smart bootstrap database logic**: Provider-specific defaults (Neon→neondb, DO→defaultdb, AWS→postgres, etc.)
  - **No probing/fallbacks**: Single connection attempt with deterministic bootstrap database
  - **Clean error handling**: Auth/network failures don't retry, only show clear error messages
- **Step 3**: Test connection with chosen/bootstrap database

### 3. Explorer Behavior (Predictable) - ✅ UPDATED APPROACH
Use `rootScope` with **no separate database selection step**:
- **"server"** (Postgres/MySQL/Snowflake): **Root always shows database list**
  - If connection has database specified → pre-expand that database as "default" 
  - If connection has no database → show full database list for exploration
  - **Create New Database** button available at database level (moved from connection step)
- **"database"** (rare engines that can't list databases): root shows that one database directly
- **"folder"** (files): root shows folders; files = tables

**Key Changes:**
- ❌ **Remove**: Separate "Database Selection" step from connection wizard
- ✅ **Move**: "Create New Database" functionality to Database Explorer
- ✅ **Always**: Show database list as root level in explorer (when server scope)

### 4. Stream Designer Rules (Always Explicit)
A stream's source/target must record the fully qualified object the user picked in the explorer:
- **DB engines**: `database.schema.table` (or `database.table` for MySQL)
- **Files**: `{mountOrBucket}/{folder}/{file}`

If the connection had no DB in its URL, that's fine: the stream carries the DB context explicitly from the picker.

### 5. Files as "Virtual Databases"
- Treat a mount/bucket as a "connection"
- Top-level folders as "databases"
- Files as "tables"
- Give each file a virtual schema (columns inferred + cached)
- Support mixed folders (csv/jsonl/parquet) by exposing each file as its own table with format badge

### 6. Implementation Checklist - ✅ COMPLETED
- [✅] **Smart bootstrap database selection**: Provider-specific logic (Neon→neondb, DO→defaultdb, etc.)
- [✅] **No complex probing**: Single connection attempt with deterministic bootstrap database
- [✅] **Optional database field**: Clear UI hint, moved to Connection Details (not separate step)
- [✅] **Remove Database Selection step**: Eliminated wizard step, moved create database to explorer
- [✅] **Update Database Explorer**: Shows database list at root level (server scope) with `DatabaseSelectionView`
- [✅] **Move Create Database**: Moved from connection wizard to Database Explorer context
- [✅] **Stream context always explicit**: Ready for explicit database.schema.table selection in streams

## 🎯 **SIMPLIFIED CONNECTION FLOW SUMMARY**

### ✅ **UNIFIED CONNECTION FLOW - FULLY IMPLEMENTED**
1. **Backend**: Smart bootstrap database selection per provider (no probing, no caching)
2. **Frontend**: Database field optional with clear UX hints in connection details form
3. **Connection Wizard**: Simplified from 4 steps to 3 steps (removed database selection step)
4. **Database Explorer**: Root level shows database cards with create database functionality
5. **Navigation Flow**: Connection → Database Selection → Database Metadata with back button
6. **Testing**: Validated with Neon, DigitalOcean, and local PostgreSQL ✅

### 🎯 **NEXT PHASE: FILE CONNECTIONS (Storage Endpoint Model)**
The unified database connection flow is now complete and ready. Next implementation phase:
1. **Add Files connection type**: Single "Files" type with provider selection (Local/S3/GCS/Azure)  
2. **Implement capability flags**: Distinguish DB vs file connections in UI
3. **Folder/File explorer**: Treat folders as "databases", files as "tables" with format badges

### 🚀 **Benefits of This Approach**
- **Cleaner Connection UX**: No confusing database selection step
- **Industry Standard**: Matches DBeaver, pgAdmin, other tools
- **Power User Friendly**: Can still specify database for direct access
- **Explorer Focused**: Database management happens where it belongs
- **Stream Context Clear**: Always explicit database.schema.table selection

## 🔧 Implementation Strategy (Storage Endpoint Model)

### Phase 1: Storage Endpoint Connections
1. Add single "Files" connection type with provider selection
2. Implement capability flags system for DB/file distinction
3. Update connection creation with storage endpoint fields

### Phase 2: Folder/File Explorer Integration
1. Implement "folders as databases, files as tables" navigation
2. Add format detection and badge system
3. Cache file metadata with mtime invalidation

### Phase 3: Stream Format Selection
1. Move write format choice to stream configuration
2. Add format-specific options (compression, partitioning)
3. Support mixed-format source selection

### Phase 4: Cloud & Advanced Features
1. Cloud provider credential management
2. Advanced dataset patterns and options
3. File upload and management features

## 🎨 UI Design Notes

### Connection Card Layout (Storage Endpoint Model)
```
[📁 S3 Icon] My S3 Data Lake              [Source/Target badges]
s3://my-bucket/data/                      [Mixed Files badge]
├── Provider: Amazon S3
└── Files: 47 mixed format tables
```

### File Table List (Mixed Formats)
```
📄 users          [CSV]  │ 15,432 rows │ Modified 1 hour ago
📄 products       [CSV]  │ 8,291 rows  │ Modified 2 hours ago
📊 analytics      [PRQT] │ 1.2M rows   │ Modified 1 day ago
🔶 events         [JSONL]│ 892K rows   │ Modified 3 hours ago
📋 config         [JSON] │ 1 object    │ Modified 1 week ago
```

### Connection Form (Storage Endpoint Model)
```
Connection Type: [Files ▼]
Name: [My File Storage    ]
Provider: [Local ▼] [S3] [GCS] [Azure]
Root Path: [/path/to/files  ] [Browse]
Prefix: [optional/subfolder/]

□ Advanced Options
  Credentials: [Provider-specific]
  Region: [us-east-1] (for cloud providers)
```

## 🔄 Testing Scenarios (Storage Endpoint Model)

1. **Create Files connection** → Should create and test storage access successfully
2. **Browse folders** → Should show directories as "databases" 
3. **Browse files** → Should show files as "tables" with format badges
4. **Mixed format handling** → Should handle CSV/JSON/JSONL/Parquet in same folder
5. **Preview file data** → Should show paginated data with format-specific handling
6. **Create stream with format choice** → Should allow selecting any source file(s) and choosing target format in stream config

## 🔑 Key Benefits of Storage Endpoint Model

- **Handles Heterogeneous Data**: Mixed file formats in same folder/bucket
- **Consistent UX**: Same workflow for databases and files (folders=databases, files=tables)
- **Flexible Format Selection**: Choose output format at stream level, not connection level
- **Cloud-Native**: Natural fit for S3/GCS/Azure bucket structures
- **Scalable**: Single connection per storage location, not per file type
- **Future-Proof**: Supports advanced features like dataset patterns and partitioning

## 📝 Implementation Notes

- **Reuse existing components** where possible (table lists, data previews)
- **Keep same navigation flow** (connection → database → table → data)
- **Add visual indicators** to distinguish file from database connections
- **File paths** are stored in `Connection.Path` field (backend ready)
- **File formats** auto-detected from connection type and file extension
- **Capability flags** drive UI behavior, not hardcoded type assumptions
- **Database context** moves from connection-level to stream-level where it matters