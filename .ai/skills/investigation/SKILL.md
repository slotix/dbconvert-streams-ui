# Skill: Investigation

## Scope

- Diagnosing bugs, unexpected behavior, failures, or performance issues.
- Understanding how something works before proposing changes.
- Not for making fixes — once root cause is found, hand off to `task-delivery`.

## Inputs

- Symptom description: what's happening vs what's expected.
- Reproduction steps or error messages, if available.
- Affected area (endpoint, service, table, component).

## Process

1. Restate the symptom clearly before investigating.
2. Trace the data/control flow from the symptom backward to the cause.
3. Read relevant code — don't guess from file names.
4. Form a hypothesis, then verify it against the code. Don't stop at the first plausible explanation.
5. Check for related issues: is this a single bug or a pattern?
6. If root cause is found, describe it and suggest the fix direction — don't implement it.
7. If root cause is unclear, state what was ruled out and what remains to check.

## Output format

1. **Symptom**: what was reported or observed.
2. **Investigation path**: what was checked and in what order.
3. **Root cause**: the actual issue, with file path and line/area.
4. **Evidence**: why this is the cause (code reference, logic trace).
5. **Fix direction**: what needs to change (without implementing it).
6. **Unknowns**: anything that couldn't be verified (needs runtime data, logs, reproduction).

## Quality bar

- Root cause is traced to specific code, not hand-waved.
- Investigation path is documented so it's not repeated.
- Hypothesis is tested against the code, not assumed correct.
- Fix direction is minimal and targeted.
- Unknowns are stated honestly.

## Anti-patterns

- Jumping to a fix before understanding the cause.
- Guessing root cause from error messages without reading code.
- Editing files during investigation.
- Stopping at the first plausible explanation without verifying.
- Proposing broad refactors as the fix for a specific bug.
- Claiming certainty when the cause requires runtime verification.
