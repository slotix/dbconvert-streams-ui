# AG Grid Large Table Navigation - Design Decision

## Problem Statement

Pure infinite scrolling for multi-million row tables creates poor UX:

### Issues with Basic Infinite Scroll
❌ **Navigation Problems**
- Impossible to reach end (scrolling through 2M rows = hours)
- No jump to specific position
- Easy to lose your place
- Poor discoverability of data scope

❌ **Search Limitations**
- Client-side search only works on loaded rows (~100-500)
- No global search across 2M rows
- Browser performance degrades

❌ **User Expectations**
Users expect database-like features:
- Jump to first/last records
- Search entire dataset
- Filter by criteria
- Know total count and position
- Navigate by pages/ranges

## Solution Evaluation

### Option A: Enhanced Infinite + Navigation Tools ⭐ RECOMMENDED
Keep infinite scroll, add navigation:
- Jump to first/last buttons
- Server-side search overlay
- Position indicator: "Showing rows 1,000-1,100 of 2.5M"
- Jump to row number input

**Pros:**
- ✅ Modern UX (infinite scroll for browsing)
- ✅ Solves core navigation problems
- ✅ Works with Community Edition
- ✅ Familiar interaction model

**Cons:**
- More complex implementation
- Need backend search endpoints

### Option B: Smart Auto-Switching
Auto-detect table size:
- Infinite scroll for tables < 50K rows
- Pagination for tables > 50K rows
- User can toggle manually

**Pros:**
- ✅ Optimized per use case
- ✅ Simple for small tables

**Cons:**
- ❌ Inconsistent UX (confusing for users)
- ❌ "Magic" threshold feels arbitrary

### Option C: Search-First Approach
Default to search/filter for large tables:
- Show filtered results with pagination
- Infinite scroll only after filters applied

**Pros:**
- ✅ Forces best practices
- ✅ Better performance

**Cons:**
- ❌ Forces workflow, reduces exploration
- ❌ More complex initial UX

## Pragmatic Approach - CHOSEN ✅

### Reality Check: Actual Use Cases

**Scenario 1: Data Exploration** (browsing)
- Users want to "see what's in the table"
- Infinite scroll is PERFECT
- They scroll, get a feel, done
- **Don't need to reach row 2M**

**Scenario 2: Finding Specific Data** (searching)
- Users know what they're looking for
- **Should use SQL queries or backend filters**
- Not scrolling through millions of rows
- **Backend search is the answer**

**Scenario 3: Data Analysis** (exports/reports)
- Users need aggregates or exports
- **Export to CSV** (already implemented!)
- Or use actual DB tools
- **Not done in browser grid**

### The Simple Truth

**Users should NOT be scrolling through 2M rows in a browser!**

For real work, they should use:
- Database queries (SQL)
- Filters/WHERE clauses
- Exports (CSV/Excel)
- BI tools (aggregated views)

## Implementation Plan - Phase 1 (Current)

Keep current AG Grid Infinite Scroll, add minimal enhancements:

### 1. Position Indicator ✅
```
"Showing rows 101-200 of 2,500,000"
```
- Shows current position
- Displays total row count
- Updates as user scrolls

### 2. Jump to Top Button ✅
```
[↑ Back to Top]
```
- Scrolls grid to first row
- Prevents "lost in scroll" problem
- One-click reset

### 3. Enhanced Export ✅
```
[Export CSV] (current visible rows)
[Export First 10K] (performance-friendly)
```
- Already have basic CSV export
- Consider adding row limit options

## Implementation Plan - Phase 2 (Future)

If Phase 1 proves insufficient, implement **Option A**:

### 4. Jump to Row Number
```
Go to row: [_____] [Go]
```
- Input field for row number
- Jumps to specific position
- Useful for debugging/QA

### 5. Server-Side Search Overlay
```
[🔍 Search all 2.5M rows...]
```
- Modal/overlay with search input
- Calls backend API endpoint
- Shows filtered results
- Clear button returns to full data

### 6. First/Last Navigation
```
[First] ... [Last]
```
- Jump to beginning
- Jump to end
- Keyboard shortcuts (Home/End)

## Technical Implementation

### Current Stack
- **AG Grid Community** v34.2.0 (free, MIT license)
- **Infinite Row Model** (lazy loading)
- Block size: 100 rows
- Cache: 10 blocks (1000 rows max in memory)

### Backend API (Already Exists)
```
GET /connections/{id}/databases/{db}/tables/{table}/data
  ?limit=100
  &offset=1000
  &skip_count=false
```

### Proposed New Endpoint (Phase 2)
```
GET /connections/{id}/databases/{db}/tables/{table}/search
  ?query=searchterm
  &limit=100
  &offset=0
```

## Metrics for Success

Track these to decide if Phase 2 is needed:

1. **User Feedback**
   - Do users complain about navigation?
   - Are they asking for search?

2. **Usage Patterns**
   - How far do users typically scroll?
   - Do they export often?

3. **Table Sizes**
   - What % of tables > 50K rows?
   - What % of tables > 1M rows?

## Decision Log

**2025-10-04**: Chose Pragmatic Approach (Phase 1)
- Rationale: Keep it simple, add only what's needed
- Start with position indicator + jump to top
- Monitor usage before building more complexity
- Backend search/filters are the proper solution for finding data

**Next Review**: After 2-4 weeks of usage
- Gather user feedback
- Analyze scroll depth metrics
- Decide if Phase 2 is warranted

## References

- AG Grid Infinite Row Model: https://www.ag-grid.com/vue-data-grid/infinite-scrolling/
- Community vs Enterprise: https://www.ag-grid.com/vue-data-grid/licensing/
- Server-Side Model (Enterprise only): Not using, too expensive

## Notes

- AG Grid **Server-Side Row Model** (SSRM) requires Enterprise license (~$1K+ per dev)
- We're using **Infinite Row Model** (Community Edition, free)
- For 99% of use cases, infinite scroll + position indicator is sufficient
- Power users who need advanced navigation should use SQL queries directly
