---
name: testing
description: Policies for unit testing, E2E testing, and test-running constraints for DBConvert Streams UI.
---

# Testing (Agent & Copilot Rules)

## Scope

- Prefer unit tests (Vitest) by default.
- Playwright E2E tests only when explicitly requested.
- Lint/build checks can be used for fast validation signals.

## Inputs

- User request and acceptance criteria.
- Touched UI code paths (components, stores, composables).
- `TESTING.md` and this skill.

## Process

1. Choose the smallest useful validation path for the change.
2. Default to unit tests: `yarn test:unit`.
3. Use `yarn lint` or `yarn build` when they provide faster/clearer signal.
4. Run Playwright (`yarn test`, `yarn test:headed`, `yarn test:ui`) only when explicitly asked.
5. Never start `yarn dev` automatically.
6. Use Yarn only (no npm/pnpm), with Node >= 22.
7. If tests cannot run, report exact blockers and unexecuted commands.

## Output format

1. Test scope used (unit/lint/build/e2e).
2. Files/tests touched.
3. Commands executed and outcomes.
4. Blockers/untested areas (if any).

## Quality bar

- Tests focus on user-visible behavior.
- Assertions are deterministic and non-flaky.
- New behavior gets practical unit coverage where feasible.
- Validation commands match changed surface area.
- No hidden assumptions about running services.

## Anti-patterns

- Running E2E by default for routine changes.
- Auto-starting `yarn dev`.
- Using npm/pnpm in this repo.
- Overly brittle timing-based assertions.
- Claiming tests passed without command evidence.
