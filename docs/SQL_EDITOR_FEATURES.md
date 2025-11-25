# SQL Editor - Advanced Features

## Overview

The Custom Query editor in DBConvert Streams UI provides professional SQL editing capabilities powered by Monaco Editor. It offers intelligent autocomplete, hover information, syntax highlighting, and query formatting to help you write SQL queries efficiently.

## Features

### 1. Intelligent Autocomplete

The editor provides context-aware suggestions as you type:

#### SQL Keywords
- Type partial keywords to see suggestions: `SEL` → `SELECT`, `WH` → `WHERE`
- All standard SQL keywords: SELECT, FROM, WHERE, JOIN, GROUP BY, ORDER BY, LIMIT, etc.
- Dialect-specific keywords:
  - **MySQL**: REGEXP, LIMIT, FORCE INDEX
  - **PostgreSQL**: ILIKE, RETURNING, ARRAY_AGG
  - **SQL Server**: TOP, OUTPUT, STRING_AGG

#### SQL Functions
- Common aggregate functions: COUNT(), SUM(), AVG(), MIN(), MAX()
- String functions: CONCAT(), SUBSTRING(), UPPER(), LOWER(), TRIM()
- Date functions: NOW(), CURRENT_DATE(), DATE(), YEAR(), MONTH()
- Type conversion: CAST(), CONVERT(), COALESCE()
- Functions include parentheses and cursor positioning: `COUNT($0)`

#### Table Names
- Type `FROM ` to see all tables from the current database
- Tables show with their schema if applicable
- Example: `FROM actor` or `FROM sakila.actor`

#### Column Names
- Type table name followed by dot: `actor.` → see all columns from actor table
- Columns show with their data type: `actor_id: INT NOT NULL`
- Works across all tables in the database

#### Smart Snippets
Quick templates for common SQL patterns:

- **select**: Full SELECT query template with WHERE clause
- **selcol**: SELECT specific columns
- **sellimit**: SELECT with LIMIT clause
- **join**: INNER JOIN template
- **leftjoin**: LEFT JOIN template
- **groupby**: GROUP BY with aggregate and HAVING
- **where**: WHERE clause with operators
- **case**: CASE WHEN expression
- **insert**: INSERT INTO statement
- **update**: UPDATE statement
- **delete**: DELETE statement
- **subquery**: Subquery in WHERE clause

All snippets include placeholders - press Tab to jump between fields.

### 2. Hover Information

Hover your mouse over SQL elements to see detailed information:

#### Column Hover
```
actor_id (from actor)
Type: INT NOT NULL
```

#### Table Hover
```
Table: sakila.actor
Columns: 4
```

#### Function Hover
```
COUNT(expression)
Returns the number of rows that match the specified criteria.
```

### 3. Syntax Highlighting

- SQL keywords in blue
- Strings in orange
- Numbers in green
- Comments in gray
- Automatic language detection based on connection type

### 4. Query Formatting

**Keyboard Shortcuts**:
- `Shift+Alt+F` (Windows/Linux/Mac) - Monaco's standard formatting shortcut
- `Ctrl+Shift+F` (Windows/Linux) or `Cmd+Shift+F` (Mac) - Alternative shortcut

Automatically formats your SQL query with:
- Proper indentation
- Line breaks for readability
- Consistent keyword capitalization

**Before:**
```sql
select actor_id,first_name,last_name from actor where last_update>'2023-01-01' limit 100
```

**After:**
```sql
SELECT
  actor_id,
  first_name,
  last_name
FROM
  actor
WHERE
  last_update > '2023-01-01'
LIMIT
  100
```

### 5. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Space` | Trigger autocomplete manually |
| `Ctrl+Enter` | Execute query (if applicable) |
| `Shift+Alt+F` | Format query (Monaco default) |
| `Ctrl+Shift+F` / `Cmd+Shift+F` | Format query (alternative) |
| `Tab` | Accept suggestion or jump to next placeholder |
| `Esc` | Close autocomplete menu |

## How It Works

### Schema Detection

1. When you open the Custom Query editor, the system automatically fetches database schema metadata
2. Schema includes:
   - All table names in the current database
   - Column names, data types, and nullability for each table
   - Schema/database prefixes (for PostgreSQL, SQL Server)
3. Schema is cached for 30 seconds to improve performance
4. Schema metadata enables intelligent table and column autocomplete

### Autocomplete Logic

The editor provides suggestions based on:
- **Your typing**: Filters suggestions as you type
- **SQL context**: Knows if you're in SELECT, FROM, WHERE, etc.
- **Dialect**: Shows MySQL-specific functions for MySQL connections, etc.

### Priority Order

Suggestions are sorted by relevance:
1. SQL Keywords (SELECT, WHERE, etc.)
2. SQL Functions (COUNT(), SUM(), etc.)
3. Table Names (from your database)
4. Column Names (from all tables)
5. Snippets (templates)

## Usage Examples

### Example 1: Basic SELECT Query

1. Type `sel` → autocomplete suggests `SELECT`
2. Press Tab or Enter to accept
3. Type `*` then space
4. Type `from` → autocomplete suggests `FROM`
5. Press Tab, then space
6. See list of all tables in your database
7. Type `ac` → filters to `actor`
8. Press Tab to accept

Result: `SELECT * FROM actor`

### Example 2: Column-Specific Query

1. Type `SELECT `
2. Type `actor.` → see all columns from actor table
3. Select `actor_id`
4. Type `, actor.` → select another column
5. Continue building your query

Result: `SELECT actor.actor_id, actor.first_name FROM actor`

### Example 3: Using Snippets

1. Type `sellimit` → snippet suggestion appears
2. Press Tab to insert template:
   ```sql
   SELECT ${1:columns}
   FROM ${2:table_name}
   LIMIT ${3:1000}
   ```
3. Type your column names, press Tab to jump to table name
4. Type table name, press Tab to jump to limit value
5. Enter your limit

### Example 4: Hover for Information

1. Write query: `SELECT actor_id FROM actor`
2. Hover over `actor_id` → see "INT NOT NULL"
3. Hover over `actor` → see "Table: actor, Columns: 4"
4. Hover over any function like `COUNT` → see function documentation

## Tips & Best Practices

### 1. Use Snippets for Speed
Instead of typing full queries, use snippets:
- `join` for JOIN templates
- `groupby` for GROUP BY with HAVING
- `case` for CASE WHEN expressions

### 2. Format Before Saving
Always format your query with `Ctrl+Shift+F` before saving to ensure consistency.

### 3. Leverage Hover Info
Hover over columns to quickly check data types without switching views.

### 4. Use Tab for Navigation
When accepting snippets, use Tab to quickly jump between placeholders instead of clicking.

### 5. Explore Dialect-Specific Features
If you're using MySQL, explore MySQL-specific functions like `GROUP_CONCAT()`. For PostgreSQL, try `ARRAY_AGG()`.

## Supported SQL Dialects

- **MySQL** 5.7+, 8.0+
- **PostgreSQL** 9.6+, 10+, 11+, 12+, 13+, 14+, 15+
- **SQL Server** 2016+, 2017+, 2019+, 2022+
- **Generic SQL** (fallback)

## Troubleshooting

### Issue: No table suggestions appearing
**Solution**:
1. Open your browser's Developer Console (F12)
2. Look for these console messages when you open the Custom Query editor:
   - `"Schema context loaded: { tables: X, dialect: 'mysql' }"` - confirms schema loaded
   - `"Registering SQL providers: { language: 'sql', dialect: 'mysql', ... }"` - confirms providers registered
3. Type `SELECT * FROM ` and check console for:
   - `"Completion provider triggered: { text: ..., isTableContext: true }"` - confirms autocomplete triggered
   - `"Generated suggestions: { total: X, tables: Y }"` - confirms suggestions generated
4. If schema isn't loading:
   - Ensure you've selected a source connection and database
   - Check that the connection is valid and accessible
5. If providers aren't registering, refresh the page

### Issue: Wrong dialect suggestions
**Solution**:
- The dialect is auto-detected based on your connection type
- Make sure your connection type is correctly set (MySQL, PostgreSQL, SQL Server)
- Check the console log: `"Registering SQL providers: { dialect: 'mysql' }"` to verify correct dialect

### Issue: Formatting doesn't work
**Solution**:
- Try `Shift+Alt+F` (Monaco's standard shortcut) or `Ctrl+Shift+F`
- Ensure your cursor is in the editor
- SQL formatting uses Monaco's built-in formatter

### Issue: Autocomplete too slow
**Solution**:
- First load may take a moment while fetching schema
- Subsequent loads use cached schema (30s cache)
- Try typing more characters to narrow down suggestions

## Technical Details

### Architecture
- **Editor**: Monaco Editor (VS Code's editor)
- **Language Services**: Custom completion, hover, and formatting providers
- **Schema Source**: Fetched from backend API via explorerNavigation store
- **Cache Duration**: 30 seconds for schema metadata
- **Keywords**: 50+ SQL keywords, 20+ common functions
- **Snippets**: 14 predefined templates

### Performance
- Schema fetch: ~100-500ms (cached for 30s)
- Autocomplete response: <50ms
- Hover information: Instant
- Query formatting: <100ms

### Files Modified
- `src/constants/sqlKeywords.ts` - SQL keywords, functions, snippets
- `src/composables/useMonacoSqlProviders.ts` - Monaco language providers
- `src/components/monaco/SqlEditor.vue` - Editor component
- `src/components/settings/TableSettings.vue` - Integration point

## Future Enhancements

Potential future improvements:
- **Query validation**: Real-time syntax error detection
- **Query optimization**: Suggestions for improving query performance
- **Query history**: Save and recall previous queries
- **Multi-statement support**: Execute multiple queries at once
- **Query results preview**: See sample results inline
- **Custom snippets**: User-defined snippet templates
- **Cross-table JOIN suggestions**: Smart JOIN recommendations based on foreign keys

## Feedback & Support

If you encounter issues or have suggestions for improvement, please:
1. Check the troubleshooting section above
2. Review the usage examples
3. Contact support with specific details about the issue
