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

### 0. Modal to Wizard Conversion (NEW PRIORITY)
- [x] **Convert modal dialogs to in-page wizard interface**
  - [x] Create wizard component structure (WizardLayout.vue)
  - [x] Create step components (DatabaseTypeStep, ConnectionDetailsStep, ReviewStep)
  - [x] Convert Add connection flow to wizard (AddConnectionWizard.vue)
  - [x] Convert Edit connection flow to wizard (EditConnectionWizard.vue)
  - [x] Add routing for wizard pages (/connections/add, /connections/edit/:id)
  - [x] Update navigation in connection cards/table to use routing
  - [x] Remove modal dependencies from ConnectionsView.vue
  - [ ] **Testing and refinement needed**
    - Test add connection wizard flow
    - Test edit connection wizard flow
    - Verify all existing functionality is preserved
    - Fix any navigation or state management issues

### 1. Connection Creation/Editing
- [ ] **Add file connection types to dropdown**
  - Add: CSV, JSON, JSONL, Parquet options
  icons are available in the `/home/dm3/dbconvert/dbconvert-streams-ui/public/images/db-logos` folder
  - Show different form fields for file vs database connections

- [ ] **File connection form fields**
  ```
  Database connections: Host, Port, Username, Password, Database
  File connections: Path/Location, Provider (Local, S3, GCS, Azure)
  ```

- [ ] **Connection testing**
  - File connections test directory access instead of DB ping
  - Show appropriate success/error messages

### 2. Connection Cards/List View
- [ ] **Visual distinction for file connections**
  - Add file format icons 
  icons are available in the `/home/dm3/dbconvert/dbconvert-streams-ui/public/images/db-logos` folder
  - Show "Local File" or cloud provider instead of host:port
  - Different connection info display format

- [ ] **Connection card badges**
  - Source/Target role badges (existing)
  - Format badges (CSV, JSON, etc.)
  - Provider badges (Local, S3, GCS, Azure)

### 3. Connection Exploration
- [ ] **Database/Directory listing**
  - Same UI as database listing
  - Show folder icon instead of database icon
  - Handle empty directory case gracefully

- [ ] **Table/File listing**
  - Same table list UI
  - Show file icons based on format
  - Display file size, modified date (optional)
  - File names appear without extensions (backend removes them)

- [ ] **File data preview**
  - Reuse existing table data preview components
  - Same pagination, column headers, data rows
  - Add "Format: CSV/JSON/JSONL/Parquet" indicator

### 4. Stream Configuration
- [ ] **Source/Target selection**
  - File connections appear in connection dropdown
  - Show file format in connection name/description
  - Support selecting files as source tables

- [ ] **Dataset configuration (future)**
  - Path patterns for file sources (*.csv, year=*/month=*/*.parquet)
  - File write options for targets (compression, partitioning)

### 5. Enhanced File Features (Optional)
- [ ] **File metadata display**
  - Use existing `/files/meta` endpoint
  - Show schema information, row counts
  - File validation status

- [ ] **File upload interface**
  - Drag & drop file upload
  - Automatic connection creation for uploaded files

- [ ] **Cloud provider integration**
  - S3/GCS/Azure connection forms
  - Credential management (Vault integration)
  - Browse cloud directories

## 🔧 Implementation Strategy

### Phase 1: Basic File Support (Minimal Changes)
1. Add file connection types to connection creation form
2. Update connection cards to show file icons/info
3. Test with existing table/database exploration UI

### Phase 2: Enhanced File UX
1. Add file-specific metadata and validation
2. Improve visual distinction between file and database connections
3. Add file upload capabilities

### Phase 3: Advanced Features
1. Cloud provider support (S3, GCS, Azure)
2. Advanced dataset configuration (patterns, options)
3. File format conversion streams

## 🎨 UI Design Notes

### Connection Card Layout
```
[📄 CSV Icon] Connection Name              [Source/Target badges]
file:///path/to/files                     [CSV badge]
├── Modified: 2 hours ago
└── Files: 12 tables
```

### File Table List
```
📄 users.csv          │ 15,432 rows │ Modified 1 hour ago
📄 products.csv       │ 8,291 rows  │ Modified 2 hours ago
📊 analytics.parquet  │ 1.2M rows   │ Modified 1 day ago
```

### Connection Form
```
Connection Type: [CSV ▼]
Name: [My CSV Files    ]
Path: [/path/to/files  ] [Browse]

□ Advanced Options
  Provider: [Local ▼] [S3] [GCS] [Azure]
  Credentials: [None ▼]
```

## 🔄 Testing Scenarios

1. **Create file connection** → Should create and test successfully
2. **Browse databases** → Should show directories or default database
3. **Browse tables** → Should show files as tables (without extensions)
4. **Preview file data** → Should show paginated data like database tables
5. **Create stream** → Should allow selecting files as source/target

## 📝 Notes

- **Reuse existing components** where possible (table lists, data previews)
- **Keep same navigation flow** (connection → database → table → data)
- **Add visual indicators** to distinguish file from database connections
- **File paths** are stored in `Connection.Path` field (backend ready)
- **File formats** auto-detected from connection type and file extension