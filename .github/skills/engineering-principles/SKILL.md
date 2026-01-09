---
name: engineering-principles
description: Core repo preferences: simplicity-first, DRY, and avoid compatibility shims unless explicitly requested.
---

# Engineering Principles

## Simplicity-first
- Prefer the simplest correct solution.
- Avoid unnecessary abstraction, premature reusability, or “transitional layers” that keep legacy behavior alive.

## No transitional compatibility by default
- Do **not** preserve backward compatibility by default.
- When migrating (legacy config/state/props → new approach), prefer a **single** source of truth:
  - Update call-sites in the same change.
  - Remove the old path instead of maintaining adapters.
- Do **not** add implicit fallbacks ("try old behavior if new behavior fails") or silent defaulting.
  - If a fallback might be needed for rollout safety, **ask first** and only implement it after explicit confirmation.
- If backward compatibility is required, **ask first** and keep it time-boxed with a removal plan.

## Keep it DRY (but readable)
- Remove duplication when it improves maintainability.
- Prefer small focused helpers/composables over copy/paste.
- Don’t over-abstract UI: readability and local clarity matter.
