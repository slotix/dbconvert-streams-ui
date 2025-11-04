# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DBConvert Streams UI is a Vue.js 3 frontend application for managing database streaming and CDC (Change Data Capture) operations. It provides a modern, responsive web interface for the DBConvert Streams platform with real-time monitoring, connection management, and stream configuration capabilities.

## Technology Stack

### Core Technologies
- **Vue 3** with Composition API and `<script setup>` syntax
- **TypeScript** for type safety and better developer experience
- **Vite** for build tooling and development server
- **Pinia** for state management
- **Vue Router 4** for client-side routing

### UI Framework & Styling
- **Tailwind CSS** for utility-first styling with mobile-first responsive design
- **Headless UI Vue** for accessible, unstyled UI components
- **Heroicons** for consistent iconography
- **Vue Toastification** for notification management
- don't invent custom svg icons use heroicons

### Data & Visualization
- **Axios** for HTTP client with API integration
- **D3.js** for data visualization and charts
- **Highlight.js** for SQL syntax highlighting
- **SQL Formatter** for code formatting

### Development Tools
- **ESLint** with Vue and TypeScript support
- **Prettier** for code formatting
- **Playwright** for end-to-end testing
- **Vitest** for unit testing

## Build Commands

### Development
```bash
yarn dev          # Start development server (http://localhost:5173)
yarn build        # Production build
yarn preview      # Preview production build locally
```

### Testing
```bash
yarn test:unit    # Run unit tests with Vitest
yarn test         # Run Playwright e2e tests (headless)
yarn test:headed  # Run Playwright tests with visible browser
yarn test:ui      # Interactive Playwright test UI
yarn test:debug   # Debug mode with Playwright inspector
```

### Code Quality
```bash
yarn lint         # Run ESLint
yarn format       # Format code with Prettier
```

### Version Management
```bash
yarn version:patch  # Patch version bump
yarn version:minor  # Minor version bump
yarn version:major  # Major version bump
```

## Architecture Overview

### Project Structure
```
src/
├── api/           # API client and service layer
├── components/    # Vue components organized by feature
│   ├── common/    # Shared UI components (buttons, modals, etc.)
│   ├── connection/# Database connection management components
│   ├── stream/    # Stream creation and configuration components
│   ├── monitoring/# Real-time monitoring components
│   ├── logs/      # Log viewer and streaming components
│   ├── database/  # Database viewing components
│   ├── explorer/  # Database explorer components
│   ├── files/     # File handling components
│   └── settings/  # Application settings components
├── composables/   # Vue composable functions (reusable logic)
├── stores/        # Pinia stores for state management
├── views/         # Full-page route components
│   └── connections/ # Connection management pages
├── router/        # Vue Router configuration and routes
├── types/         # TypeScript interfaces and type definitions
├── utils/         # Utility functions and helpers
├── constants/     # Application constants
├── directives/    # Custom Vue directives
├── config/        # Configuration files
├── styles/        # Global styles
└── assets/        # Static assets (icons, images, etc.)
```

### Key Views (Pages)
- **HomeView.vue**: Dashboard with streams overview and quick actions
- **StreamsView.vue**: List and manage all streams with status indicators
- **CreateStreamView.vue**: Stream creation wizard with source/target configuration
- **DatabaseExplorerView.vue**: Interactive database schema browser with table inspection
- **connections/**: Database connection management (add, edit, list)

### State Management (Pinia Stores)
- **common.ts**: Global app state, API key management, notifications, user preferences
- **connections.ts**: Database connection CRUD operations and state
- **monitoring.ts**: Real-time stream metrics, progress, and status updates
- **streamConfig.ts**: Stream configuration and wizard state
- **logs.ts**: Real-time log streaming via Server-Sent Events (SSE)
- **schema.ts**: Database schema, metadata, and table information
- **paneTabs.ts**: Dual-pane tab state management for explorer
- **fileExplorer.ts**: File system and exported file browsing
- **explorerNavigation.ts**: Database explorer navigation state
- **databaseOverview.ts**: Database-level statistics and summaries
- **objectTabState.ts**: Object inspection tab state

## Code Patterns and Conventions

### Vue 3 Composition API
Always use `<script setup>` syntax with TypeScript:
```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  title: string
  isActive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false
})

const emit = defineEmits<{
  update: [value: string]
}>()

const localValue = ref('')
</script>
```

### TypeScript Usage
- Use interfaces over types for extensibility
- Prefer functional components with TypeScript interfaces
- Avoid enums; use const objects or maps instead
- Leverage VueUse composables for enhanced reactivity

### Component Organization
- Use PascalCase for component names
- Organize components by feature/domain
- Keep components focused and single-responsibility
- Use props/emit pattern for parent-child communication

### Styling Approach
- Mobile-first responsive design with Tailwind CSS
- Use Headless UI for accessible component patterns
- Implement consistent spacing and color schemes
- Leverage Tailwind's utility classes over custom CSS

### Performance Optimization
- Implement code splitting via Vite's manual chunks configuration
- Use dynamic imports for non-critical components
- Optimize bundle size with proper chunking strategy
- Implement lazy loading where appropriate

## API Integration

### Backend Connection
- **API Server**: DBConvert Streams API running on port 8020 (`http://localhost:8020`)
- **Authentication**: API key required for all requests (stored in browser localStorage and Pinia state)
- **Development Proxy**: Configured in `vite.config.js` for local development

### Key API Endpoints
**Connections**
- `GET /api/v1/connections` - List all connections
- `POST /api/v1/connections` - Create new connection
- `GET /api/v1/connections/{id}` - Get connection details
- `PUT /api/v1/connections/{id}` - Update connection
- `DELETE /api/v1/connections/{id}` - Delete connection
- `GET /api/v1/connections/{id}/databases` - List databases in connection

**Streams**
- `GET /api/v1/streams` - List all streams
- `POST /api/v1/streams` - Create new stream
- `GET /api/v1/streams/{id}` - Get stream details
- `PUT /api/v1/streams/{id}` - Update stream
- `DELETE /api/v1/streams/{id}` - Delete stream
- `POST /api/v1/streams/{id}/start` - Start stream
- `POST /api/v1/streams/{id}/stop` - Stop stream

**Monitoring & Logs**
- `GET /logs/stream` - Real-time log streaming via Server-Sent Events (SSE)
- `GET /api/v1/streams/{id}/status` - Stream status and metrics
- `GET /api/v1/files/data` - Query exported file data (Parquet, CSV, etc.)

**Database Schema**
- `GET /api/v1/connections/{id}/databases/{db}/tables` - List tables
- `GET /api/v1/connections/{id}/databases/{db}/tables/{table}/columns` - List columns

### Authentication Pattern
API key is stored in Pinia state and included in all request headers:
```typescript
headers: {
  'X-API-Key': apiKey,
  'Content-Type': 'application/json'
}
```

API key is persisted to browser localStorage for session persistence.

## Testing Strategy

### E2E Testing with Playwright
- Tests located in `tests/` directory
- Authentication state persisted in `tests/.auth/user.json`
- API key automatically read from auth file (no environment variables needed)
- Run manual login once: `yarn dev` → enter API key → tests will reuse it

### Test Commands
```bash
yarn test          # Headless e2e tests
yarn test:headed   # Visible browser tests
yarn test:ui       # Interactive test runner
yarn test:debug    # Debug with inspector
```

### Unit Testing
- Uses Vitest for unit tests
- Located in `src/__tests__/` directory
- Run with `yarn test:unit`

## Development Workflow

### Getting Started
1. Install dependencies: `yarn install`
2. Start development server: `yarn dev`
3. Open http://localhost:5173 and enter API key
4. For testing: API key will be saved for Playwright tests

### Environment Setup
- Node.js >=22.0.0 required
- Uses ES modules (`"type": "module"`)
- TypeScript strict mode enabled
- Path alias: `@/` maps to `src/`

### Vite Configuration
- Manual chunking for optimal bundle splitting
- Package version available via `import.meta.env.PACKAGE_VERSION`
- Development proxy configured for API integration
- Optimized dependencies for faster builds

## Real-time Features

### Server-Sent Events (SSE)
The application uses SSE for real-time updates:
- Log streaming via `/logs/stream` endpoint
- No authentication required for log stream
- Automatic reconnection handling
- Managed through `logs.ts` store

### Monitoring Dashboard
- Real-time stream metrics and progress
- Visual indicators for system component health
- Live updating charts using D3.js
- Stream control actions (start/pause/stop)

## Important Notes

### Package Management
- Use **Yarn** for all package operations
- Node.js >=22.0.0 required
- PostCSS resolution pinned to ^8.4.31 for compatibility

### Security Considerations
- API keys stored in browser localStorage
- Authentication state excluded from version control
- Secure communication with backend API

### Browser Support
- Modern ES2020+ features used
- Targets current browser versions
- Progressive enhancement approach

### Development Tips
- Use Vue DevTools for debugging reactive state
- Leverage TypeScript strict mode for better error catching
- Test responsive design across different screen sizes
- Monitor bundle size with Vite's analyzer tools

## Related Backend Repository

The UI is part of the larger **DBConvert Streams** system. The backend services are located in a separate repository:

**Backend Repository Path**: `/home/dm3/dbconvert/dbconvert-stream`

### Backend Structure
- `cmd/stream-api/` - REST API server (port 8020)
- `cmd/stream-reader/` - Source database reader
- `cmd/stream-writer/` - Target database writer
- `internal/` - Core libraries (eventhub, dbengine, stream management)
- `source/` - Database-specific readers (MySQL, PostgreSQL)
- `target/` - Database-specific writers (MySQL, PostgreSQL, Snowflake, Parquet, CSV, JSONL)

### Backend Technologies
- Go 1.24
- NATS JetStream for distributed messaging
- Consul for service discovery
- Vault for secrets management

### When Debugging Issues
- **Frontend state/UI issues** → check this repository (`dbconvert-streams-ui`)
- **API communication/backend logic** → check backend repository (`dbconvert-stream`)
- **Stream creation, monitoring, data flow** → check backend
- **Connection configuration UI** → check this repository
- **Database connectivity/drivers** → check backend in `internal/dbengine/`
- **Real-time log streaming** → check backend `cmd/stream-api/` and this UI's `logs.ts` store

## Cursor Rules Integration
The project includes specific guidance for development:
- Use Vue 3 Composition API with `<script setup>`
- Prefer functional programming patterns
- Use TypeScript interfaces over types
- Implement mobile-first responsive design
- Optimize for Web Vitals (LCP, CLS, FID)
- Leverage VueUse functions for enhanced reactivity
- Keep components focused and maintainable

## Important Development Notes

### Before Making Changes
1. Understand the data flow between UI and backend API
2. Check if related backend changes are needed
3. Run tests before submitting: `yarn test && yarn test:unit`
4. Follow ESLint and Prettier formatting: `yarn lint && yarn format`

### Common Development Tasks
```bash
# Start dev environment
yarn install
yarn dev

# Test changes
yarn test:headed     # See tests run in browser
yarn test:unit       # Run unit tests

# Check code quality
yarn lint            # ESLint
yarn format          # Prettier

# Build for production
yarn build
yarn preview         # Test production build locally
```

### UI Component Libraries
- **Headless UI Vue** - Unstyled, accessible components
- **ag-Grid** - Advanced data tables (imported but check if actively used)
- **D3.js** - Data visualization for monitoring charts
- **Tailwind CSS** - Utility-first styling with responsive design

### Real-time Features
- **Server-Sent Events (SSE)**: Used for live log streaming via `logs.ts` store
- **Polling**: Some components may use polling for periodic updates (check specific stores)
- **WebSocket**: Not currently used (SSE is preferred for this architecture)