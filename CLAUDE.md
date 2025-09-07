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
├── components/    # Reusable Vue components organized by feature
│   ├── common/    # Shared UI components
│   ├── connection/# Database connection components
│   ├── stream/    # Stream management components
│   └── ...
├── composables/   # Vue composable functions
├── stores/        # Pinia stores for state management
├── views/         # Route-level components (pages)
├── router/        # Vue Router configuration
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
└── assets/        # Static assets
```

### Key Components
- **ConnectionsView**: Database connection management interface
- **StreamsView**: Stream configuration and monitoring
- **MonitorStreamView**: Real-time stream monitoring with metrics
- **DatabaseExplorerView**: Database schema exploration
- **HomeView**: Dashboard with quick actions and system status

### State Management (Pinia Stores)
- **common.ts**: Global app state, API key management, notifications
- **connections.ts**: Database connection management
- **monitoring.ts**: Stream monitoring and metrics
- **streamConfig.ts**: Stream configuration state
- **logs.ts**: Real-time logging via Server-Sent Events
- **schema.ts**: Database schema and metadata

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

### Base Configuration
The application communicates with the DBConvert Streams API server running on port 8020. API key authentication is required for all requests.

### Key API Endpoints
- `/api/v1/connections` - Connection management
- `/api/v1/streams` - Stream operations
- `/api/v1/monitoring` - System monitoring
- `/logs/stream` - Server-Sent Events for real-time logs

### Authentication Pattern
API key is stored in Pinia state and included in request headers:
```typescript
headers: {
  'X-API-Key': apiKey
}
```

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

## Cursor Rules Integration
The project includes specific guidance for development:
- Use Vue 3 Composition API with `<script setup>`
- Prefer functional programming patterns
- Use TypeScript interfaces over types
- Implement mobile-first responsive design
- Optimize for Web Vitals (LCP, CLS, FID)
- Leverage VueUse functions for enhanced reactivity