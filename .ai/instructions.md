# DBConvert Streams UI — Shared AI Instructions

This is the single source of truth for all AI assistants (Claude Code, Codex, Copilot).
Tool-specific settings live in `CLAUDE.md` and `AGENTS.md`.

## AI Router

Start each task from `.ai/router.md` and select exactly one primary skill before making changes.

## Engineering Principles

Core repo preferences (simplicity-first, DRY, and no transitional compatibility by default):

- `.ai/skills/engineering-principles/SKILL.md`

## Project Overview

**DBConvert Streams UI** is a Vue 3 + TypeScript frontend for managing database streaming and CDC operations.
It provides a responsive web interface with real-time monitoring, connection management, and stream configuration.

## Related Repositories

This UI repo is commonly worked on alongside:

- Backend (API/reader/writer): `../dbconvert-stream`
- Website + licensing (Sentry): `../dbconvert-streams-website`

## Technology Stack

### Core

- **Vue 3** (`<script setup>` + Composition API)
- **TypeScript**
- **Vite** build system
- **Pinia** (state management)
- **Vue Router 4**

### UI & Styling

- **Tailwind CSS** (utility-first)
- **Headless UI Vue** (accessible primitives)
- **Lucide** — use `lucide-vue-next`; don't invent custom SVGs
- **Vue Toastification** (notifications)

### Data & Visualization

- **Axios** (HTTP)
- **D3.js** (charts)
- **Highlight.js** + **SQL Formatter** (SQL display)

### Tooling & Tests

- **ESLint + Prettier**
- **Vitest** (unit)
- **Playwright** (E2E)

## Build & Quality Commands

```bash
yarn build          # Production build
yarn preview        # Preview prod build
yarn test:unit      # Unit tests (Vitest)
yarn test           # Headless E2E
yarn test:headed    # E2E with visible browser
yarn lint           # ESLint
yarn format         # Prettier
yarn version:patch|minor|major
```

> **Never run `yarn dev` automatically.**
> The development server will be started manually by the maintainer.

## Architecture

```
src/
├── api/            # API client layer
├── components/     # Feature-based Vue components
│   ├── common/     # Shared UI elements
│   ├── connection/ # DB connections
│   ├── stream/     # Streams & config
│   ├── monitoring/ # Real-time metrics
│   ├── logs/       # Log viewer (SSE)
│   ├── explorer/   # DB explorer
│   ├── files/      # File browsing/export
│   └── settings/
├── composables/    # Reusable logic
├── stores/         # Pinia stores
├── views/          # Route views
├── router/         # Vue Router setup
├── utils/          # Helpers
├── types/          # TS interfaces
├── constants/      # App-wide constants (import from here)
└── styles/
```

Additional directories:
- `public/` — static assets
- `tests/` — Playwright E2E, `.auth/` for stored auth state
- `src/__tests__/` — Vitest unit tests
- `docs/` — screenshots and reference docs
- `upload-server/` — optional local Go upload helper (port 8080)

### Key Views

- **HomeView.vue** — dashboard
- **StreamsView.vue** — list/manage streams
- **CreateStreamView.vue** — stream wizard
- **DatabaseExplorerView.vue** — schema browser
- **AddConnectionView.vue** — new DB connection
- **EditConnectionView.vue** — edit DB connection

## State Management (Pinia Stores)

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

## Coding Conventions

### Vue 3 + TypeScript

Use `<script setup lang="ts">`:

```vue
<script setup lang="ts">
import { ref } from 'vue'

interface Props { title: string; isActive?: boolean }
const props = withDefaults(defineProps<Props>(), { isActive: false })
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

### Code Syntax Highlighting
- **All syntax highlighting styles are centralized** in `src/styles/codeHighlighting.css`
- **NEVER** define `.hljs` or `.hljs-*` styles in individual components
- Use the `v-highlightjs` directive with `class="language-sql"` or `class="language-json"`
- See **`SYNTAX_HIGHLIGHTING.md`** for detailed guidelines

### Performance Optimization
- Implement code splitting via Vite's manual chunks configuration
- Use dynamic imports for non-critical components
- Optimize bundle size with proper chunking strategy
- Implement lazy loading where appropriate

## API Integration

**Backend:** DBConvert Streams API (`http://localhost:8020`)
Authentication: `X-API-Key` header (stored in Pinia + localStorage)

### Main Endpoints

| Area        | Endpoint                                         | Purpose              |
| ----------- | ------------------------------------------------ | -------------------- |
| Connections | `/api/v1/connections`                            | CRUD, list databases |
| Streams     | `/api/v1/streams`                                | CRUD, start/stop     |
| Monitoring  | `/api/v1/streams/{id}/status`                    | Metrics              |
| Logs        | `/logs/stream`                                   | SSE log stream       |
| Schema      | `/api/v1/connections/{id}/databases/{db}/tables` | Table list           |

### Authentication Pattern

API key is stored in Pinia state and included in all request headers:
```typescript
headers: {
  'X-API-Key': apiKey,
  'Content-Type': 'application/json'
}
```

## Caching Policy
- Prefer **backend-side caching** by default (API / server layer)
- Only add **UI-side caching** (Pinia/localStorage/in-memory caches) when the requirement explicitly asks for UI caching or offline behavior
- If caching is needed but not specified, assume backend caching and avoid inventing UI caches

## Backend Reference

**Backend repo (local):** `../dbconvert-stream`

| Folder               | Purpose                                                         |
| -------------------- | --------------------------------------------------------------- |
| `cmd/stream-api/`    | REST API (port 8020)                                            |
| `cmd/stream-reader/` | Source reader                                                   |
| `cmd/stream-writer/` | Target writer                                                   |
| `internal/`          | Core libs                                                       |
| `source/`, `target/` | DB adapters (MySQL, PostgreSQL, Snowflake, Parquet, CSV, JSONL) |

Tech: Go 1.24 · NATS JetStream · Consul · Vault

## Real-Time & Monitoring

- **SSE** (`/logs/stream`) for live logs
- **Pinia logs store** handles reconnects
- **D3.js** for live charts and progress indicators

## Testing

- Developer test running instructions (unit + Playwright E2E): [TESTING.md](TESTING.md)
- Agent/Copilot testing policy and constraints: `.ai/skills/testing/SKILL.md`

## Environment

- **Node >= 22**
- `"type": "module"`
- TS strict mode enabled
- Alias `@/` → `src/`
- Use **Yarn** only
- PostCSS pinned to `^8.4.31`

## Utilities & Constants

### `src/utils/formats.ts` — **use these helpers, don't reimplement**

Centralized formatting utilities for dates, sizes, rates, durations, and numbers.

### `src/constants/`

Store app-wide constants and static maps here (e.g., connection/engine type maps, color tokens, status labels, limits).
**Import from `@/constants/...` instead of hardcoding values in components.**

## Dark Mode Guidelines

Refer to **`DESIGN_SYSTEM.md` → Section 6** for all design and implementation details related to the dark theme.

## Security & Configuration
- Do not commit secrets; use `.env.local` for local overrides
- Use Yarn only; Node >= 22 is required
- Do not modify backend references or credentials

## General Instructions
- Prefer using ripgrep (rg) for searching the codebase
- Exclude `.git`, `node_modules`, `dist`, and `coverage` from searches unless explicitly needed
- Do not implement fallbacks by default; if one is truly needed, provide rationale and get explicit user approval first
- Avoid overengineering; keep solutions simple and DRY, and ask clarifying questions before implementation when requirements are unclear
- Avoid regex unless explicitly requested
- Assume Go for backend, Vue + TypeScript for frontend
- Follow existing project structure and naming
- Do not invent files or APIs
- Keep changes minimal and focused

## Parallel AI Execution Protocol

Use lane-based execution for substantial tasks so implementation speed does not reduce safety.

- Define dependency gates first (`G1`, `G2`, ...). Keep only true prerequisites in gates.
- Run work in parallel lanes only when files/interfaces are independent.
- Preferred lane split:
  - Lane A: primary implementation changes
  - Lane B: dependent integration updates
  - Lane C: supporting non-functional updates (docs/telemetry/ops notes)
  - Lane D: verification and validation
- Keep behavior-changing paths behind feature flags until validation is complete.
- Merge in small PR batches: foundation → behavior → recovery → observability → validation/enablement.
- Do not publish stronger external claims until gate tests and canary validation pass.

Canary-ready checklist:
- Core behavior changes validated by appropriate tests.
- Concurrency-sensitive behavior validated where relevant.
- Failure, retry, and reload/restart flows validated where applicable.
- Health and quality signals visible and actionable in staging.
