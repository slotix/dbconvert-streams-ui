# Repository Guidelines

## Project Structure & Module Organization
- `src/` — main codebase
  - `views/` (route pages), `components/` (reusable UI), `stores/` (Pinia), `api/` (HTTP/services), `utils/`, `router/`, `types/`
- `public/` — static assets
- `tests/` — Playwright e2e tests (`.auth/` for stored auth)
- `src/__tests__/` — unit tests (Vitest)
- `docs/` — screenshots and reference docs
- `upload-server/` — optional local Go upload helper (port 8080)

## Build, Test, and Development Commands
- `yarn dev` — run Vite dev server at `http://localhost:5173`
- `yarn build` — production build to `dist/`
- `yarn preview` — serve built app locally
- `yarn test:unit` — run Vitest unit tests
- `yarn test` — run Playwright e2e (requires dev server)
- `yarn lint` / `yarn format` — ESLint and Prettier

Node 22+ is required (see `package.json:engines`).

## Coding Style & Naming Conventions
- Formatting via Prettier: 2 spaces, single quotes, no semicolons, 100 char line width
- Linting via ESLint with Vue/TS; fix warnings before PR
- Vue 3 + `<script setup lang="ts">`; components in PascalCase (`MyWidget.vue`)
- Variables/functions in `camelCase`; Pinia stores in `stores/` with clear domain names

## Testing Guidelines
- Unit tests: place in `src/__tests__/*.test.ts`; use Vitest + jsdom
- E2E: Playwright in `tests/`; start dev server, then `yarn test`
- Auth for e2e: follow `TESTING.md` to create `tests/.auth/user.json` (not committed)
- Aim for meaningful coverage on new/changed code; include tests in PRs

## Commit & Pull Request Guidelines
- Commits: imperative, concise subject with context (e.g., "Add file browser API", "Refactor connection wizard", "Fix port parsing")
- PRs: clear description, rationale, steps to test, linked issues; include screenshots/GIFs for UI changes; note any config or migration impacts

## Security & Configuration Tips
- Do not commit secrets; use `.env.local` for local config
- Playwright auth (`tests/.auth/`) is ignored by git; keep keys out of history
- If needed, run helper server: `go run upload-server/main.go`

