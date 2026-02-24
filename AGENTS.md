# Repository Guidelines

## Project Overview
DBConvert Streams UI is a Vue 3 + TypeScript frontend for managing database streaming and CDC operations.
It provides a responsive web interface with real-time monitoring, connection management, and stream configuration.

## Related Repositories

This UI repo is commonly worked on alongside:

- Backend (API/reader/writer): `../dbconvert-stream`
- Website + licensing (Sentry): `../dbconvert-streams-website`

## Technology Stack
- Vue 3 (`<script setup>` + Composition API) + TypeScript
- Vite, Pinia, Vue Router 4
- Tailwind CSS, Headless UI Vue
- Lucide icons via `lucide-vue-next` only
- Axios, D3.js, Highlight.js + SQL Formatter
- ESLint + Prettier, Vitest, Playwright

## Project Structure & Module Organization
- `src/`
  - `api/` (API client layer)
  - `components/` (feature-based components)
  - `composables/` (reusable logic)
  - `constants/` (app-wide constants; import from here)
  - `router/`, `stores/`, `types/`, `utils/`, `views/`
  - `styles/` (global styles, including syntax highlighting)
- `public/` (static assets)
- `tests/` (Playwright e2e, `.auth/` for stored auth state)
- `src/__tests__/` (Vitest unit tests)
- `docs/` (screenshots and reference docs)
- `upload-server/` (optional local Go upload helper, port 8080)

## Build, Test, and Quality Commands
- `yarn build` — production build
- `yarn preview` — preview production build
- `yarn test:unit` — Vitest unit tests
- `yarn test` / `yarn test:headed` — Playwright e2e
- `yarn lint` — ESLint
- `yarn format` — Prettier
- `yarn version:patch|minor|major`

Never run `yarn dev` automatically; the maintainer starts the dev server manually.

## Coding Conventions
- Use `<script setup lang="ts">` and Composition API
- Prefer interfaces over types; avoid enums (use const objects/maps)
- Use props/emit for parent-child communication; keep components focused
- Tailwind utility-first styling; use Headless UI for accessible patterns
- Follow `DESIGN_SYSTEM.md` (Section 6) for dark mode
- Use `lucide-vue-next` icons only; no custom SVGs

## Syntax Highlighting Rules
- All Highlight.js styles live in `src/styles/codeHighlighting.css`
- Never define `.hljs` or `.hljs-*` styles in components
- Use `v-highlightjs` with `class="language-sql"` or `class="language-json"`
- See `SYNTAX_HIGHLIGHTING.md` for details

## State Management (Pinia)
- `common.ts`, `connections.ts`, `monitoring.ts`, `streamConfig.ts`
- `logs.ts`, `schema.ts`, `paneTabs.ts`, `fileExplorer.ts`
- `explorerNavigation.ts`, `databaseOverview.ts`, `objectTabState.ts`

## API Integration
- Backend: `http://localhost:8020`
- Auth header:
  ```ts
  headers: {
    'X-API-Key': apiKey,
    'Content-Type': 'application/json',
  }
  ```

## Caching Policy
- Prefer **backend-side caching** by default (API / server layer).
- Only add **UI-side caching** (Pinia/localStorage/in-memory caches) when the requirement explicitly asks for UI caching or offline behavior.
- If caching is needed but not specified, assume backend caching and avoid inventing UI caches.

## Utilities & Constants
- Use `src/utils/formats.ts` helpers for formatting; do not reimplement
- Store static maps and tokens in `src/constants/` and import from there

## Engineering Principles

Core repo preferences (simplicity-first, DRY, and no transitional compatibility by default):

- See [.github/skills/engineering-principles/SKILL.md](.github/skills/engineering-principles/SKILL.md)

## Testing Guidelines
Testing rules are maintained as a skill doc to avoid duplication and drift:

- See [.github/skills/testing/SKILL.md](.github/skills/testing/SKILL.md)
- For developer instructions on running unit/e2e tests, see [TESTING.md](TESTING.md)

## Security & Configuration Tips
- Do not commit secrets; use `.env.local` for local overrides
- Use Yarn only; Node >= 22 is required
- Do not modify backend references or credentials

## General Instructions
- Prefer using ripgrep (rg) for searching the codebase
- By default, exclude `.git`, `node_modules`, `dist`, and `coverage` from searches unless explicitly needed
- Start each task by selecting a primary skill via `.ai/router.md`
- Do not implement fallbacks by default; if one is truly needed, provide rationale and get explicit user approval first
- Avoid overengineering; keep solutions simple and DRY, and ask clarifying questions before implementation when requirements are unclear
- Avoid regex unless explicitly requested
- Assume Go for backend, Vue + TypeScript for frontend
- Follow existing project structure and naming
- Do not invent files or APIs
- Keep changes minimal and focused

## Parallel AI Execution Instructions

Use lane-based execution for substantial tasks so implementation speed does not reduce safety.

- Define dependency gates first (`G1`, `G2`, ...). Keep only true prerequisites in gates.
- Run work in parallel lanes only when files/interfaces are independent.
- Prefer this lane split:
  - Lane A: primary implementation changes
  - Lane B: dependent integration updates
  - Lane C: supporting non-functional updates (docs/telemetry/ops notes)
  - Lane D: verification and validation
- Keep behavior-changing paths behind feature flags until validation is complete.
- Merge in small PR batches:
  1. Foundation interfaces/composables (no behavior change)
  2. Core behavior changes
  3. Recovery/state safety
  4. Observability
  5. Validation + enablement
- Do not publish stronger external claims until gate tests and canary validation pass.

Canary-ready checklist:
- Core behavior changes validated by appropriate tests.
- Concurrency-sensitive behavior validated where relevant.
- Failure, retry, and reload/restart flows validated where applicable.
- Health and quality signals visible and actionable in staging.
