# Skill: Code Review

## Scope

- Reviewing code without rewriting it: PRs, diffs, existing modules, or specific files.
- Producing structured findings the developer can act on.
- Not for making changes — if fixes are needed, hand off to `task-delivery`.

## Inputs

- Code to review (PR diff, file paths, or pasted snippets).
- Context: what the code is supposed to do, if provided.
- Project conventions from `.ai/instructions.md`.

## Process

1. Read the code and understand intent before forming opinions.
2. Check against project conventions (error handling, logging, naming, concurrency patterns).
3. Look for: bugs, race conditions, missing error handling, security issues, performance concerns, readability problems.
4. Classify each finding by severity.
5. Do NOT rewrite code — describe the issue and where it is.
6. If everything looks good, say so briefly. Don't invent issues.

## Output format

1. **Summary**: one sentence on overall quality.
2. **Findings** (grouped by severity):
   - **Critical**: bugs, security issues, data loss risks
   - **Warning**: performance concerns, missing edge cases, convention violations
   - **Suggestion**: readability, naming, minor improvements
3. Each finding: file path, line/area, what's wrong, why it matters.
4. **No issues found**: explicitly state if the code is clean.

## Quality bar

- Findings are specific and actionable, not vague ("this could be better").
- Severity is honest — don't inflate minor style issues to warnings.
- No unsolicited refactoring or rewrites.
- Respects existing project patterns even if reviewer would do it differently.
- Focuses on behavior and correctness over style preferences.

## Anti-patterns

- Rewriting code instead of describing the issue.
- Flagging style preferences as bugs.
- Reviewing code without reading it first.
- Inventing hypothetical issues that can't happen in practice.
- Producing a wall of nitpicks that buries real issues.
- Suggesting changes outside the scope of what's being reviewed.
