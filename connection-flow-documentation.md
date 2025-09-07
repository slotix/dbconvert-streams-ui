# Connection Management Flow Documentation

## Overview

This document describes the complete flow for adding and editing database connections in the DBConvert Streams UI. The connection management system is built using Vue 3 composition API with a modular component architecture.

## Component Architecture

### Core Components Structure

```
src/components/connection/
├── Modal.vue                    # Main modal container
├── Add.vue                      # Add connection workflow
├── Edit.vue                     # Edit connection workflow
├── Connections.vue              # Main connections list view
├── ActionBtns.vue              # Modal action buttons (Add/Update/Test/Cancel)
├── CardItem.vue                # Connection card display
├── Table.vue                   # Table view for connections
├── TableRow.vue                # Table row component
├── NewCard.vue                 # Empty state new connection card
├── DBTypesListBox.vue          # Database type selector dropdown
├── DBTypesCombo.vue            # Database type filter combo
├── ConnectionStringInput.vue    # Connection string input
├── AccessNotice.vue            # Database access notice
├── shared.ts                   # Shared utilities and types
└── params/                     # Parameter input components
    ├── ConnectionParams.vue     # Tab container for connection parameters
    ├── UnifiedConnectionParams.vue  # Direct connection parameters
    ├── SSLParams.vue           # SSL/TLS connection parameters
    ├── ConnectionName.vue      # Connection name input
    └── CertificateInput.vue    # SSL certificate input
```

## Add Connection Flow

### 1. Initiation
- **Trigger**: User clicks "New connection" button in `Connections.vue`
- **Action**: `addConnection()` method calls `commonStore.openModal('Add')`
- **State**: Sets `showModal: true` and `dlgType: 'Add'` in common store

### 2. Modal Display
- **Component**: `Modal.vue` renders with conditional content based on `dlgType`
- **Title**: Dynamic title shows "Add database connection"
- **Content**: Shows database type selector and connection parameters sections

### 3. Database Type Selection
- **Component**: `DBTypesListBox.vue` displays available database types
- **Options**: PostgreSQL, MySQL (from `connectionsStore.dbTypes`)
- **Selection**: `selectDBType(dbType)` updates `connectionDBType` in Add.vue
- **Effect**: Enables connection parameters form

### 4. Connection Parameters
- **Component**: `ConnectionParams.vue` with tab-based interface
- **Tabs**: "Direct" and "SSL" connection options
- **Direct Tab**: `UnifiedConnectionParams.vue` for basic connection details
- **SSL Tab**: `SSLParams.vue` for SSL/TLS configuration
- **Fields**: Host, port, username, password, database name, connection name

### 5. Form Submission
- **Trigger**: User clicks "Add Connection" button
- **Component**: `ActionBtns.vue` emits `confirm` event
- **Handler**: `Add.vue` `ok()` method processes the submission
- **Validation**: Checks if database type is selected and connection details are complete

### 6. API Call & Completion
- **Action**: `connectionsStore.createConnection()` sends POST request to API
- **Success**: Shows success notification, closes modal, refreshes connections list
- **Error**: Shows error notification, keeps modal open for corrections

## Edit Connection Flow

### 1. Initiation
- **Trigger**: User clicks edit button on connection card or table row
- **Component**: `CardItem.vue` or `TableRow.vue` calls edit method
- **Action**: Sets current connection in store and opens modal with 'Update' type

### 2. Modal Display
- **Component**: `Modal.vue` renders with edit-specific content
- **Title**: Shows "Edit database connection"
- **Pre-fill**: Connection parameters are pre-populated from `currentConnection`

### 3. Parameter Editing
- **Component**: `Edit.vue` uses same `ConnectionParams.vue` structure
- **Pre-populated**: All fields show existing connection values
- **Database Type**: Not changeable in edit mode (no DB type selector shown)
- **Modification**: User can modify any connection parameters

### 4. Form Submission
- **Trigger**: User clicks "Update Connection" button
- **Handler**: `Edit.vue` `ok()` method processes the update
- **API Call**: `connectionsStore.updateConnection()` sends PUT request

### 5. Completion
- **Success**: Shows success notification, closes modal, refreshes connections list
- **Error**: Shows error notification, keeps modal open for corrections

## Key State Management

### Common Store (`useCommonStore`)
```typescript
{
  showModal: boolean           // Controls modal visibility
  dlgType: 'Add' | 'Update'   // Determines modal content and behavior
}
```

### Connections Store (`useConnectionsStore`)
```typescript
{
  currentConnection: Connection | null    // Connection being edited
  connectionDBType: DbType | null        // Selected database type for new connections
  isUpdatingConnection: boolean          // Loading state for updates
  isTestingConnection: boolean           // Loading state for connection tests
}
```

## Component Communication Patterns

### 1. Parent-Child Props/Emit Pattern
- Modal components use slots for content injection
- Child components emit events that parent components handle
- State flows down via props, events bubble up via emit

### 2. Store-Based State Management
- Connection data managed in Pinia stores
- Reactive computed properties for UI updates
- Centralized state for modal visibility and current connection

### 3. Event-Driven Updates
- Backend reconnection events trigger connection list refresh
- Custom window events for cross-component communication

## Connection Testing Flow

### 1. Test Connection Feature
- **Available**: Both Add and Edit modals have "Test Connection" button
- **Component**: `ActionBtns.vue` handles test button click
- **State**: `isTestingConnection` shows loading spinner during test

### 2. Test Process
- **Trigger**: `Modal.vue` calls `connectionsStore.testConnection()`
- **API**: Sends test request to backend with connection parameters
- **Feedback**: Success/error notifications inform user of test results

## Error Handling

### 1. Form Validation
- Database type selection required for new connections
- Required field validation in parameter forms
- Connection string format validation

### 2. API Error Handling
- Network errors show user-friendly messages
- Validation errors from backend displayed in notifications
- Modal remains open on errors for user correction

### 3. Offline Mode
- Fallback to cached connection data when backend unavailable
- Limited functionality with clear user messaging
- Automatic retry when connection restored

## Connection Display Modes

### 1. Card View (Default)
- **Component**: `CardItem.vue`
- **Layout**: Grid of connection cards with details
- **Features**: Click to select, edit/delete actions, visual status indicators

### 2. Table View
- **Component**: `Table.vue` with `TableRow.vue`
- **Layout**: Compact tabular format
- **Features**: Sortable columns, bulk actions, efficient for many connections

### 3. View Toggle
- **Component**: `ToggleView.vue` in `Connections.vue`
- **Persistence**: View preference saved in localStorage
- **Responsive**: Adapts to screen size

## Advanced Features

### 1. Connection Filtering
- **Component**: `DBTypesCombo.vue` with filter functionality
- **Options**: Filter by database type (All, PostgreSQL, MySQL)
- **Real-time**: Instant filtering of connection list

### 2. Connection Cloning
- **Feature**: Clone existing connections for quick setup
- **Implementation**: Copy connection parameters to new form
- **Use Case**: Similar connections with minor variations

### 3. SSL/TLS Configuration
- **Component**: `SSLParams.vue`
- **Features**: Certificate upload, SSL mode selection
- **Security**: Secure handling of certificates and keys

### 4. Connection String Support
- **Component**: `ConnectionStringInput.vue`
- **Format**: Standard database connection string format
- **Parsing**: Automatic parameter extraction from connection strings

## Recent Connections Integration

### 1. Cache Management
- **Storage**: localStorage for recently used connections
- **Fallback**: Used when backend unavailable
- **Synchronization**: Kept in sync with backend connection list

### 2. Quick Access
- **Feature**: Recent connections prioritized in selection interfaces
- **Implementation**: Most recently created/used connections shown first
- **User Experience**: Faster connection selection in stream configuration

## Security Considerations

### 1. Credential Handling
- **Storage**: Connection credentials stored securely in backend
- **Transport**: Encrypted communication with API
- **Display**: Passwords masked in UI forms

### 2. SSL Certificate Management
- **Upload**: Secure certificate file handling
- **Validation**: Certificate format and validity checks
- **Storage**: Certificates stored securely in backend systems

## Performance Optimizations

### 1. Component Lazy Loading
- **Implementation**: Dynamic imports for heavy components
- **Benefit**: Faster initial page load
- **Strategy**: Load connection-specific components on demand

### 2. List Virtualization
- **Use Case**: Large numbers of connections
- **Implementation**: Virtual scrolling for connection lists
- **Performance**: Smooth scrolling with hundreds of connections


This documentation provides a comprehensive overview of the connection management flow in the DBConvert Streams UI, covering all aspects from component architecture to advanced features and performance considerations.