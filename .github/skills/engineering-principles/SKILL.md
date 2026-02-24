---
name: engineering-principles
description: Core repo preferences: simplicity-first, DRY, and avoid compatibility shims unless explicitly requested.
---

# Engineering Principles

## Scope

- Use for architecture/tradeoff decisions, refactors, and behavior-changing implementation in the UI.
- Applies when multiple designs are possible and one needs a deliberate choice.

## Inputs

- User request and constraints.
- Affected components, stores, composables, and API contracts.
- Repository guidance in `AGENTS.md`, `CLAUDE.md`, and `TESTING.md`.

## Process

1. Choose the simplest correct design for the requirement.
2. Keep one source of truth: update call-sites in the same change and remove legacy paths.
3. Avoid implicit fallbacks/defaulting; if a fallback is truly needed, provide rationale and get explicit user approval before implementation.
4. Remove duplication only when readability improves; prefer small focused helpers/composables.
5. Apply backend-first caching by default; add UI caching only when explicitly required.
6. Keep UI logic readable and local; extract abstractions only with clear reuse.
7. For substantial work, define dependency gates and safe parallel lanes before execution.

## Output format

1. Decision summary: selected approach and why.
2. Scope of change: components/stores/composables/contracts affected.
3. Compatibility statement: any fallback/shim introduced (default: none); include rationale and explicit user approval reference when present.
4. Validation summary: what was verified and what remains.

## Quality bar

- Simplicity-first; no speculative abstractions.
- No transitional compatibility by default.
- DRY with readability preserved.
- Backend-first caching unless explicitly overridden.
- No stronger external guarantees before validation gates pass.

## Anti-patterns

- Adding adapters to keep old UI paths alive.
- Silent fallback to legacy client behavior.
- Implementing fallback behavior without explicit user approval.
- Introducing UI caching without an explicit need.
- Over-abstracting presentational logic too early.
- Keeping deprecated state/props without a removal plan.
