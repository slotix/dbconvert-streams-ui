# Migration Guide: Updating Components to the Design System

Use this checklist whenever existing UI needs to match the current teal/gray standard. The goal is consistency, not one-off polish.

---

## Pre-Migration Checklist
- Read `DESIGN_QUICK_REFERENCE.md` to refresh the teal vs. gray rules.
- Inventory every button and input in the component; confirm the intent of each control.
- Remove ad-hoc focus states or hex colors before starting.
- Note any flow-specific constraints so genuine exceptions can be documented.

---

## Migration Steps
1. **Buttons → `BaseButton`.** Map actions to variants: Create/Save/Start → `primary`, Cancel/Back/Close → `secondary`, destructive work → `danger`, minor inline actions → `ghost`. Use the loading and disabled props instead of custom logic.
2. **Forms → standard pattern.** Inputs, selects, textareas, checkboxes, switches, and segmented controls should use the base components so focus rings stay teal and helper/error text is consistent.
3. **Status indicators → `StatusBadge`.** Convert any inline badge styles to the shared statuses (running, finished, failed, pending, paused, initializing). Re-map legacy labels using the table below.
4. **Navigation + selection states.** Tabs, sidebar links, and segmented buttons always show teal on the active item and neutral gray elsewhere.
5. **Validation + messaging.** Use semantic colors only for actual state (green/teal success, red danger, amber warning). Remove decorative teal accents.

---

## Legacy → Standard Status Mapping
| Legacy label | Use this status |
| --- | --- |
| active | running |
| success | finished |
| error | failed |
| waiting | pending |
| stopped | paused |
| loading | initializing |

---

## Testing Checklist (run before committing)
- Buttons expose the correct variant, hover, and disabled styling.
- All inputs use gray borders by default and teal focus rings.
- Keyboard navigation works through every interactive element and focus is visible.
- Status badges display the semantic colors listed in `DESIGN_SYSTEM.md`.
- No hardcoded colors or stray utility classes remain from the previous implementation.
- Component passes lint/tests and introduces no console warnings.

---

## Suggested Rollout Order (when touching large areas)
1. **Critical flows:** Connection and stream creation wizards, main action bars.
2. **Shared components:** Dialogs, confirmation prompts, global forms.
3. **Data views:** Tables, explorers, AG Grid controls, log panels.
4. **Polish:** Edge cases, admin surfaces, rarely used screens.

---

## Before You Commit
- Verify colors in Chrome + Firefox (light theme) and ensure dark-mode classes exist if the surface already supports it.
- Confirm there are no regressions in spacing, disabled states, or aria labels.
- Update related documentation if you had to introduce an exception.

---

## Need Help?
- Rules + palette: `DESIGN_SYSTEM.md`
- Quick lookup: `DESIGN_QUICK_REFERENCE.md`
- Implementation history: `DESIGN_IMPLEMENTATION_SUMMARY.md`
- Base component examples: `src/components/base/`
