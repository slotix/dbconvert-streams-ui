# Connection Management Flow Documentation

## Overview

This document describes the complete flow for adding and editing database connections in the DBConvert Streams UI. The connection management system is built using Vue 3 composition API with a modular component architecture.

## Component Architecture

### Core Components Structure

```
src/views/
├── DatabaseExplorerView.vue      # Connection list + explorer entrypoint
├── AddConnectionView.vue         # "New Connection" wizard wrapper
├── EditConnectionView.vue        # Edit wizard wrapper
├── EditConnectionJsonView.vue    # JSON editor route

src/components/connection/
├── wizard/
│   ├── AddConnectionWizard.vue   # 2-step create flow
│   ├── EditConnectionWizard.vue  # Edit flow
│   ├── WizardLayout.vue          # Shared wizard layout
│   └── steps/
│       ├── DatabaseTypeStep.vue      # DB/file type or connection string
│       └── ConnectionDetailsStep.vue # Params + validation
├── ConnectionStringInput.vue     # Connection string input
├── ConnectionConfigJsonEditor.vue # JSON editor wrapper
├── AccessNotice.vue              # Database access notice
└── params/                       # Parameter input components
    ├── ConnectionParams.vue      # Tab container for connection parameters
    ├── UnifiedConnectionParams.vue  # Direct connection parameters
    ├── SSLParams.vue             # SSL/TLS connection parameters
    ├── ConnectionName.vue        # Connection name input
    ├── CertificateInput.vue      # SSL certificate input
    ├── LocalFilesConnectionParams.vue # Local file params
    └── S3ConnectionParams.vue    # S3 params
```

## Add Connection Flow

### 1. Initiation
- **Trigger**: User clicks "New Connection" button in `DatabaseExplorerView.vue`
- **Action**: `onAddConnection()` navigates to `/explorer/add`

### 2. Page Display
- **Component**: `AddConnectionView.vue` renders the wizard layout
- **Content**: `AddConnectionWizard.vue` handles step navigation and actions

### 3. Database Type Selection
- **Component**: `DatabaseTypeStep.vue` displays available database and file types
- **Options**: `connectionsStore.dbTypes` (PostgreSQL, MySQL, Snowflake, Files, S3)
- **Selection**: Updates the selected DB type and initializes specs via the connections store
- **Effect**: Enables the details step

### 4. Connection Parameters
- **Component**: `ConnectionDetailsStep.vue`
- **Params**: `ConnectionParams.vue` with Direct/SSL tabs plus file/S3 inputs as needed
- **Optional**: `ConnectionStringInput.vue` for connection string parsing

### 5. Form Submission
- **Trigger**: User clicks "Create Connection"
- **Handler**: `AddConnectionWizard.vue` validates details and calls the store

### 6. API Call & Completion
- **Action**: `connectionsStore.createConnection()` sends the POST request
- **Success**: Refreshes connections and navigates back to explorer (or stream wizard)
- **Error**: Shows a toast notification, stays on the wizard step

## Edit Connection Flow

### 1. Initiation
- **Trigger**: User clicks "Edit" from the explorer connection actions
- **Action**: `onEditConnection()` navigates to `/explorer/edit/:id`

### 2. Page Display
- **Component**: `EditConnectionView.vue` renders the edit wizard
- **Pre-fill**: `EditConnectionWizard.vue` loads the selected connection into the store

### 3. Parameter Editing
- **Component**: `ConnectionDetailsStep.vue`
- **Pre-populated**: All fields show existing connection values
- **Database Type**: Fixed in edit mode (`hideTypeDisplay`)

### 4. Form Submission
- **Trigger**: User clicks "Update Connection"
- **Handler**: `EditConnectionWizard.vue` calls `connectionsStore.updateConnection()`

### 5. Completion
- **Success**: Refreshes connections and navigates back to the explorer detail view
- **Error**: Shows a toast notification and stays on the edit page

## Key State Management

### Common Store (`useCommonStore`)
```typescript
{
  isBackendConnected: boolean      // API health/connection state
  showNotification: (msg, type) => void
}
```

### Connections Store (`useConnectionsStore`)
```typescript
{
  dbTypes: DbType[]                 // Available connection types
  currentConnection: Connection | null
  isUpdatingConnection: boolean     // Loading state for updates/creates
  isTestingConnection: boolean      // Loading state for connection tests
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
- Centralized state for current connection and loading flags

### 3. Event-Driven Updates
- Backend reconnection events trigger connection list refresh
- Custom window events for cross-component communication

## Connection Testing Flow

### 1. Test Connection Feature
- **Available**: Both add and edit wizards include a "Test Connection" button
- **Component**: `AddConnectionWizard.vue` and `EditConnectionWizard.vue`
- **State**: `isTestingConnection` shows loading feedback during test

### 2. Test Process
- **Trigger**: Wizards call `connectionsStore.testConnection()`
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
- Wizard stays on the current step for user correction

### 3. Offline Mode
- Fallback to cached connection data when backend unavailable
- Limited functionality with clear user messaging
- Automatic retry when connection restored

## Connection Navigation

### Explorer Sidebar
- **Component**: `ExplorerSidebarConnections.vue`
- **Layout**: Tree view of connections → databases → schemas → objects/files
- **Features**: Search, type filters, context menus, and quick actions

## Advanced Features

### 1. Connection Filtering
- **Component**: `ConnectionTypeFilter.vue`
- **Options**: Filter by connection type (All, database, file)
- **Real-time**: Instant filtering in the explorer sidebar

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
