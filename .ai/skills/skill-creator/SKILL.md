---
name: skill-creator
description: Create or update AI skills and routing instructions for Codex, Claude, and Copilot. Use when adding `.ai/skills/*/SKILL.md`, improving skill frontmatter trigger text, or aligning `.ai/router.md` and `.ai/instructions.md` across related repositories.
---

# Skill Creator

## Scope

- Create new repo-local skills under `.ai/skills/<skill-name>/SKILL.md`.
- Update existing skills with clearer trigger descriptions and leaner instructions.
- Wire skill usage into `.ai/router.md` and shared guidance in `.ai/instructions.md`.
- Keep the workflow consistent across related repositories when requested.

## Inputs

- User goal and example prompts that should trigger the skill.
- Target repositories and any repo-specific constraints.
- Existing router and skill conventions in the repo.

## Process

1. Understand the target behavior with concrete trigger examples.
2. Inspect existing skills and keep the same structure and tone.
3. Design minimal reusable resources:
   - Add `scripts/` only for deterministic repeated operations.
   - Add `references/` for long docs that should be loaded on demand.
   - Add `assets/` only for files used directly in outputs.
4. Write or update `SKILL.md`:
   - Frontmatter must include only `name` and `description`.
   - Description must say what the skill does and when it should trigger.
   - Keep body concise; move long details into `references/`.
5. Integrate routing:
   - Add/update the route in `.ai/router.md`.
   - Update `.ai/instructions.md` if shared workflow rules changed.
   - Regenerate `AGENTS.md` with `scripts/sync-agents-md.sh` after editing instructions.
6. Validate:
   - Check frontmatter formatting and naming (`[a-z0-9-]`, <= 64 chars).
   - Confirm router paths exist and response format requirements still match.

## Output Format

1. What changed and why.
2. Exact files touched.
3. Validation evidence (commands + outcomes).
4. Follow-up gaps (if any).

## Quality Bar

- Keep instructions concise and actionable.
- Prefer one clear workflow over optional branches.
- Reuse existing conventions; do not invent parallel patterns.
- No fallback behavior unless explicitly approved.

## Anti-Patterns

- Adding verbose theory instead of trigger-specific guidance.
- Duplicating long content in `SKILL.md` and `references/`.
- Updating router or instructions without confirming linked paths exist.
- Claiming cross-repo consistency without applying the same change set.
