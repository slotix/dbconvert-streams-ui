# Skill: Task Delivery

## Scope

- Code changes, bug fixes, small refactors, and code-adjacent documentation.
- Not for pure testing policy work or high-level architecture policy decisions.

## Inputs

- User request and acceptance criteria.
- Relevant project files discovered with focused search.
- Existing project conventions from repository guidance files.

## Process

1. Restate task intent in one sentence and identify target files.
2. Investigate relevant code and constraints first; ask clarifying questions before implementation when requirements are unclear.
3. Apply the smallest complete change set that satisfies the request.
4. Do not implement fallbacks by default; if one is truly required, present rationale and wait for explicit user approval before implementing.
5. Run the fastest relevant validation for touched areas.
6. If validation cannot run, state the exact blocker and what was not run.

## Output format

1. Outcome: what changed and why.
2. File list: exact paths touched.
3. Fallback statement: none, or rationale + explicit user approval reference.
4. Validation: commands run + result, or explicit blocker.
5. Risks/next steps: only when relevant.

## Quality bar

- Minimal and atomic diff.
- No unrelated changes.
- No overengineering or speculative abstractions.
- Naming/style consistent with the existing codebase.
- Behavior-impacting changes include validation evidence.
- Fallbacks are implemented only with explicit user approval.

## Anti-patterns

- Editing before reading relevant files.
- Broad refactors outside task scope.
- Implementing fallback behavior without explicit user approval.
- Overengineering simple tasks.
- Claiming tests passed without running them.
- Leaving hidden assumptions unstated.
