# CLAUDE.md

Guidelines for Claude Code when contributing to this repository.

## Available Claude agents

This repo includes optional Claude Code agent profiles under `.claude/agents/`:

- `.claude/agents/qa-engineer.md` — runs `yarn build` to validate compilation
- `.claude/agents/testing.md` — testing-focused agent (follows `.github/skills/testing/SKILL.md` + `TESTING.md`)

---

## Project Overview

**DBConvert Streams UI** is a Vue 3 + TypeScript frontend for managing database streaming and CDC operations.
It provides a responsive web interface with real-time monitoring, connection management, and stream configuration.

---

## Technology Stack

### Core

* **Vue 3** (`<script setup>` + Composition API)
* **TypeScript**
* **Vite** build system
* **Pinia** (state management)
* **Vue Router 4**

### UI & Styling

* **Tailwind CSS** (utility-first)
* **Headless UI Vue** (accessible primitives)
* **Lucide** — use `lucide-vue-next`; don’t invent custom SVGs
* **Vue Toastification** (notifications)

### Data & Visualization

* **Axios** (HTTP)
* **D3.js** (charts)
* **Highlight.js** + **SQL Formatter** (SQL display)

### Tooling & Tests

* **ESLint + Prettier**
* **Vitest** (unit)
* **Playwright** (E2E)

---

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

---

## Architecture

```
src/
├── api/            # API client layer
├── components/     # Feature-based Vue components
│   ├── common/ …   # Shared UI elements
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

### Key Views

* **HomeView.vue** — dashboard
* **StreamsView.vue** — list/manage streams
* **CreateStreamView.vue** — stream wizard
* **DatabaseExplorerView.vue** — schema browser
* **AddConnectionView.vue** — new DB connection
* **EditConnectionView.vue** — edit DB connection

---

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
---

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
---

## Backend Reference

**Backend repo:** `/home/dm3/dbconvert/dbconvert-stream`

| Folder               | Purpose                                                         |
| -------------------- | --------------------------------------------------------------- |
| `cmd/stream-api/`    | REST API (port 8020)                                            |
| `cmd/stream-reader/` | Source reader                                                   |
| `cmd/stream-writer/` | Target writer                                                   |
| `internal/`          | Core libs                                                       |
| `source/`, `target/` | DB adapters (MySQL, PostgreSQL, Snowflake, Parquet, CSV, JSONL) |

Tech: Go 1.24 · NATS JetStream · Consul · Vault

---

## Real-Time & Monitoring

* **SSE** (`/logs/stream`) for live logs
* **Pinia logs store** handles reconnects
* **D3.js** for live charts and progress indicators

---

## Testing

- Developer test running instructions (unit + Playwright E2E): [TESTING.md](TESTING.md)
- Agent/Copilot testing policy and constraints: `.github/skills/testing/SKILL.md`

---

## Environment

* **Node ≥ 22**
* `"type": "module"`
* TS strict mode enabled
* Alias `@/` → `src/`
* Use **Yarn** only
* PostCSS pinned to `^8.4.31`

---

## Performance & Build

* Dynamic imports + manual chunks in Vite
* Lazy-load non-critical components
* Monitor bundle size with Vite Analyzer

---

## Utilities & Constants

### `src/utils/formats.ts` — **use these helpers, don’t reimplement**

Centralized formatting utilities for dates, sizes, rates, durations, and numbers.

(Formatting functions description retained as before...)

### `src/constants/`

Store app-wide constants and static maps here (e.g., connection/engine type maps, color tokens, status labels, limits).
**Import from `@/constants/...` instead of hardcoding values in components.**

---

## Dark Mode Guidelines (`DESIGN_SYSTEM.md`)

Refer to **`DESIGN_SYSTEM.md` → Section 6** for all design and implementation details related to the dark theme.

---

## Development Rules for Claude

1. **Never** start or run `yarn dev` — the maintainer does this manually.
2. Make minimal, atomic commits with clear messages.
3. Ensure `yarn lint` and `yarn test:unit` pass before suggesting a PR.
4. Do not modify backend references or credentials.
5. Use `lucide-vue-next` only.
6. Follow Vue 3 + Tailwind best practices strictly.
7. Follow `DESIGN_SYSTEM.md` (Section 6) whenever adjusting colors or adding new visual elements.


## General Instructions
- Prefer using ripgrep (rg) for searching the codebase
- Avoid regex unless explicitly requested
- Assume Go for backend, Vue + TypeScript for frontend
- Follow existing project structure and naming
- Do not invent files or APIs
- Keep changes minimal and focused