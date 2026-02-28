# AI Router

Use this router before starting work.

## Route Selection

Choose exactly one primary skill:

1. Testing or verification task:
   - `.ai/skills/testing/SKILL.md`
2. Code review (PR, diff, or existing code assessment without making changes):
   - `.ai/skills/code-review/SKILL.md`
3. Debugging, investigation, or root cause analysis:
   - `.ai/skills/investigation/SKILL.md`
4. Code implementation, bug fix, refactor, or code-adjacent docs:
   - `.ai/skills/task-delivery/SKILL.md`
5. Architecture/tradeoff or policy-level decision:
   - `.ai/skills/engineering-principles/SKILL.md`

## Rules

- Select the primary skill before editing files.
- You may consult one secondary reference, but the primary skill controls output.
- If unsure, default to `.ai/skills/task-delivery/SKILL.md`.
- Do not implement fallbacks by default; if a fallback is truly required, provide rationale and wait for explicit user approval before implementing.
- Avoid overengineering; prefer the simplest DRY approach, and ask clarifying questions before implementation when requirements are unclear.

## Completion Gate

Before final response, verify that output follows the selected primary skill:

- Required output sections are present.
- Validation evidence is provided, or blockers are stated explicitly.
- No listed anti-patterns were used.
