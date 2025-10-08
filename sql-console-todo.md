# SQL Console Implementation Plan - SSE Approach (REVISED)

## Overview
Implement SQL query logging using the **existing SSE (Server-Sent Events) infrastructure** to stream SQL queries in real-time, similar to how application logs currently work.

## Why SSE is Better ✅

### Current Polling Approach (Original Plan)
❌ Frontend polls `/sql-queries` endpoint every N seconds
❌ Higher latency - queries appear after poll interval
❌ More HTTP requests - wastes bandwidth
❌ Not real-time

### SSE Streaming Approach (Revised Plan)
✅ Real-time streaming - queries appear instantly
✅ Single persistent connection - efficient
✅ Reuses existing `/logs/stream` infrastructure
✅ Already implemented and working for app logs
✅ Frontend already has EventSource consumer

---

## Existing SSE Infrastructure Analysis

### Backend Components (Already Working)
```
1. SSEWriteSyncer (internal/logging/encoders.go)
   - Manages client connections
   - Broadcasts to all connected clients
   - Non-blocking writes

2. /logs/stream endpoint (cmd/stream-api/log.go)
   - Handles SSE connections
   - Sends heartbeats
   - Manages client lifecycle

3. NATS log forwarding (cmd/stream-api/log.go:setupLogForwarding)
   - Subscribes to logs.> from all components
   - Enhances with metadata
   - Forwards to SSE clients
```

### Frontend Components (Already Working)
```
src/components/common/SystemLogs.vue
  - Connects to /logs/stream via EventSource
  - Parses incoming log events
  - Displays with filtering (all, error, info, etc.)
```

---

## Phase 1: Backend SQL Query Logging via SSE

### 1.1 Create SQL Query Logger
**File**: `internal/sqllog/sqllog.go` (new)

```go
package sqllog

import (
    "time"
    "github.com/goccy/go-json"
)

type QueryType string

const (
    QueryTypeSelect QueryType = "SELECT"
    QueryTypeCount  QueryType = "COUNT"
    QueryTypeInsert QueryType = "INSERT"
    QueryTypeUpdate QueryType = "UPDATE"
    QueryTypeDelete QueryType = "DELETE"
)

type SQLQueryLog struct {
    Level        string    `json:"level"`        // "sql" - for frontend filtering
    Logger       string    `json:"logger"`       // "sql" or "database"
    Timestamp    string    `json:"timestamp"`    // ISO 8601 format
    Message      string    `json:"message"`      // Human-readable summary
    Query        string    `json:"query"`        // Full SQL query
    QueryType    QueryType `json:"queryType"`    // SELECT, COUNT, etc.
    Database     string    `json:"database"`
    Table        string    `json:"table,omitempty"`
    Schema       string    `json:"schema,omitempty"`
    DurationMs   int64     `json:"durationMs"`
    RowCount     int       `json:"rowCount"`
    ConnectionID string    `json:"connectionId"`
    Error        string    `json:"error,omitempty"`
}

// Format as JSON for SSE streaming
func (sql *SQLQueryLog) ToJSON() ([]byte, error) {
    return json.Marshal(sql)
}

// Helper to create from query execution
func NewQueryLog(query, database, table, schema, connID string, duration time.Duration, rowCount int, err error) *SQLQueryLog {
    log := &SQLQueryLog{
        Level:        "sql",
        Logger:       "database",
        Timestamp:    time.Now().Format(time.RFC3339),
        Query:        query,
        Database:     database,
        Table:        table,
        Schema:       schema,
        DurationMs:   duration.Milliseconds(),
        RowCount:     rowCount,
        ConnectionID: connID,
    }

    // Determine query type from SQL
    if len(query) > 6 {
        switch query[:6] {
        case "SELECT":
            log.QueryType = QueryTypeSelect
            log.Message = "Executed SELECT query"
        case "INSERT":
            log.QueryType = QueryTypeInsert
            log.Message = "Executed INSERT query"
        case "UPDATE":
            log.QueryType = QueryTypeUpdate
            log.Message = "Executed UPDATE query"
        case "DELETE":
            log.QueryType = QueryTypeDelete
            log.Message = "Executed DELETE query"
        }
    }

    if err != nil {
        log.Error = err.Error()
        log.Message = "Query failed: " + err.Error()
    }

    return log
}
```

### 1.2 Integrate into Connection.GetTableData
**File**: `internal/dbengine/connection.go`

```go
import (
    "github.com/slotix/dbconvert-stream/internal/sqllog"
)

// Add field to Connection struct
type Connection struct {
    // ... existing fields
    SSEWriter *logging.SSEWriteSyncer  // Inject SSE writer for SQL logging
}

func (c *Connection) GetTableData(schema, tableName string, limit, offset int, orderBy, orderDir, whereClause string) (*TableData, error) {
    startTime := time.Now()

    // ... existing code to build query ...

    // Build the final query string
    query := fmt.Sprintf("SELECT %s FROM %s", columnList, qualifiedTableName)

    if whereClause != "" {
        query += fmt.Sprintf(" WHERE %s", whereClause)
    }

    if orderBy != "" && len(orderColumns) > 0 {
        // ... order by logic ...
        query += fmt.Sprintf(" ORDER BY %s", strings.Join(orderParts, ", "))
    }

    query += fmt.Sprintf(" LIMIT %d OFFSET %d", limit, offset)

    c.Engine.Log.Sugar().Debugf("GetTableData query: %s", query)

    // Execute query
    rows, err := c.Engine.Query(query)
    duration := time.Since(startTime)

    // Log SQL query to SSE if writer is available
    if c.SSEWriter != nil {
        sqlLog := sqllog.NewQueryLog(
            query,
            c.Database,
            tableName,
            schema,
            c.ID,
            duration,
            len(rows),
            err,
        )

        if jsonData, jsonErr := sqlLog.ToJSON(); jsonErr == nil {
            c.SSEWriter.Write(jsonData)
        }
    }

    if err != nil {
        c.Engine.Log.Sugar().Errorf("GetTableData query failed: %v (query: %s)", err, query)
        return nil, err
    }

    // ... rest of existing code ...
}
```

### 1.3 Pass SSEWriter to Connections
**File**: `cmd/stream-api/connectionHandlers.go`

```go
func (s *server) getTableDataHandler(w http.ResponseWriter, r *http.Request) {
    // ... existing code to get connection ...

    conn := s.configStore.FindConnectionByID(userData.GetUserID(), id)
    if conn == nil {
        errs.HandleNotFoundError(w, errs.NewNotFoundError("connection", id))
        return
    }
    defer conn.Close()

    // Inject SSE writer for SQL logging
    conn.SSEWriter = s.sseWriter

    // ... rest of existing code ...
}
```

### 1.4 Also Log COUNT Queries
**File**: `internal/dbengine/connection.go`

```go
func (c *Connection) GetFilteredRowCount(schema, tableName, whereClause string) (int64, error) {
    startTime := time.Now()

    // ... existing code to build count query ...

    query := fmt.Sprintf("SELECT COUNT(*) as count FROM %s WHERE %s", qualifiedTableName, whereClause)

    c.Engine.Log.Sugar().Debugf("GetFilteredRowCount query: %s", query)
    results, err := c.Engine.Query(query)
    duration := time.Since(startTime)

    // Log to SSE
    if c.SSEWriter != nil {
        rowCount := 0
        if err == nil && len(results) > 0 {
            if count, ok := results[0]["count"]; ok {
                if c, e := convertToInt64(count); e == nil {
                    rowCount = int(c)
                }
            }
        }

        sqlLog := sqllog.NewQueryLog(
            query,
            c.Database,
            tableName,
            schema,
            c.ID,
            duration,
            rowCount,
            err,
        )
        sqlLog.QueryType = sqllog.QueryTypeCount
        sqlLog.Message = "Executed COUNT query"

        if jsonData, jsonErr := sqlLog.ToJSON(); jsonErr == nil {
            c.SSEWriter.Write(jsonData)
        }
    }

    // ... rest of existing code ...
}
```

---

## Phase 2: Frontend Integration

### 2.1 Update SystemLogs to Handle SQL Events
**File**: `src/components/common/SystemLogs.vue`

The component already receives all events from `/logs/stream`. We just need to:

1. **Detect SQL log entries** (by checking `logger === 'sql'` or `level === 'sql'`)
2. **Add "SQL" filter tab** alongside existing filters
3. **Format SQL entries differently** (syntax highlighting, metadata display)

```vue
<script setup lang="ts">
// Add SQL-specific filtering
const filterTypes = ['all', 'sql', 'error & warning', 'progress & stats', 'info']

// Check if log entry is SQL
function isSQLLog(log: LogEntry): boolean {
  return log.logger === 'database' || log.level === 'sql'
}

// Filter logs based on selected type
const filteredLogs = computed(() => {
  if (selectedFilter.value === 'sql') {
    return logs.value.filter(isSQLLog)
  }
  // ... existing filters ...
})
</script>

<template>
  <!-- Add SQL tab -->
  <div class="tabs">
    <button @click="selectedFilter = 'all'">All</button>
    <button @click="selectedFilter = 'sql'">
      SQL <span v-if="sqlCount > 0">({{ sqlCount }})</span>
    </button>
    <!-- ... existing tabs ... -->
  </div>

  <!-- Display SQL logs with special formatting -->
  <div v-for="log in filteredLogs" :key="log.id">
    <div v-if="isSQLLog(log)" class="sql-log-entry">
      <div class="sql-meta">
        <span class="timestamp">{{ log.timestamp }}</span>
        <span class="duration">⏱ {{ log.durationMs }}ms</span>
        <span class="rows">📊 {{ log.rowCount }} rows</span>
        <span class="database">🗄 {{ log.database }}.{{ log.table }}</span>
      </div>
      <div class="sql-query">
        <code>{{ log.query }}</code>
      </div>
      <button @click="copyQuery(log.query)">Copy</button>
    </div>
    <!-- ... existing log display ... -->
  </div>
</template>
```

### 2.2 Add SQL Syntax Highlighting (Optional Enhancement)
Use a library like `highlight.js` (already in package.json!):

```typescript
import hljs from 'highlight.js/lib/core'
import sql from 'highlight.js/lib/languages/sql'

hljs.registerLanguage('sql', sql)

function highlightSQL(query: string): string {
  return hljs.highlight(query, { language: 'sql' }).value
}
```

---

## Phase 3: Testing

### 3.1 Backend Testing
```bash
# Terminal 1: Start backend
cd cmd/stream-api && go run .

# Terminal 2: Connect to SSE stream
curl -N http://localhost:8020/logs/stream

# Terminal 3: Trigger SQL query
curl "http://localhost:8020/api/v1/connections/{id}/databases/sakila/tables/actor/data?where=first_name%20LIKE%20'%25PE%25'"
```

**Expected SSE output:**
```
data: {"level":"sql","logger":"database","timestamp":"2025-10-08T14:32:15Z","message":"Executed SELECT query","query":"SELECT * FROM `actor` WHERE first_name LIKE '%PE%' LIMIT 100 OFFSET 0","queryType":"SELECT","database":"sakila","table":"actor","durationMs":45,"rowCount":5,"connectionId":"conn_123"}

data: {"level":"sql","logger":"database","timestamp":"2025-10-08T14:32:15Z","message":"Executed COUNT query","query":"SELECT COUNT(*) FROM `actor` WHERE first_name LIKE '%PE%'","queryType":"COUNT","database":"sakila","table":"actor","durationMs":12,"rowCount":1,"connectionId":"conn_123"}
```

### 3.2 Frontend Testing
1. Open browser → System Logs panel
2. Click "SQL" tab
3. Navigate to a table and apply filters
4. SQL queries should appear instantly in the log panel

---

## Implementation Checklist

### Backend (Phase 1)
- [ ] Create `internal/sqllog/sqllog.go` package
- [ ] Add SQLQueryLog struct and NewQueryLog helper
- [ ] Add SSEWriter field to Connection struct
- [ ] Log SQL in GetTableData with metadata
- [ ] Log SQL in GetFilteredRowCount
- [ ] Inject s.sseWriter into connections in handlers
- [ ] Test with curl → verify SSE stream shows SQL

### Frontend (Phase 2)
- [ ] Add "SQL" filter tab in SystemLogs.vue
- [ ] Add isSQLLog detection function
- [ ] Create SQL log entry template with formatting
- [ ] Add copy button for queries
- [ ] (Optional) Add syntax highlighting
- [ ] Test real-time SQL streaming

### Polish (Phase 3)
- [ ] Add query type icons (SELECT, COUNT, etc.)
- [ ] Show error queries in red
- [ ] Add slow query warnings (>1s)
- [ ] Export SQL history
- [ ] Search/filter SQL queries

---

## Comparison: SSE vs Polling

| Feature | SSE (Revised) | Polling (Original) |
|---------|---------------|-------------------|
| Real-time | ✅ Instant | ❌ Delayed by poll interval |
| Efficiency | ✅ Single connection | ❌ N HTTP requests |
| Backend Load | ✅ Write once, broadcast | ❌ Query endpoint repeatedly |
| Infrastructure | ✅ Already exists | ❌ Need to build |
| Complexity | ✅ Simpler (reuse existing) | ❌ More code |
| Frontend Code | ✅ Minimal changes | ❌ New API client + store |

**Winner**: SSE approach is superior in every way! 🎉

---

## Next Steps

Please confirm approach:
1. ✅ Use SSE streaming instead of polling?
2. ✅ Integrate into existing System Logs panel?
3. ✅ Start with Phase 1 (Backend SQL logging to SSE)?

Once approved, I'll start implementing! 🚀
