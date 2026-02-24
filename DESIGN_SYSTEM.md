# DBConvert Streams UI Design System

**Scope:** Consolidated reference for implementation status, patterns, quick lookups, migration steps, and dark mode (supersedes previous design docs).

---

## 1. Implementation Snapshot
- **Component library:** Use `src/components/base/*` (`BaseButton`, `FormInput`, `FormSelect`, `FormCheckbox`, `FormSwitch`, `SelectionButtonGroup`). `StatusBadge` currently lives in `src/components/common/StatusBadge.vue`. Monitoring still runs the legacy badge until the transition bug is fixed.
- **Coverage:** 21 components (12 buttons, 9 forms) already consume the shared primitives.
- **Rollout progress:**
  | Phase | Scope | Outcome |
  | --- | --- | --- |
  | 1 | High-visibility actions (connection + stream wizards, stream lists, monitoring) | Buttons standardized; RUNNING badge corrected to blue |
  | 2 | Dialogs & connection management | Confirm dialogs, folder selection, connection panels migrated |
  | 3 | Remaining priority buttons | Card items, stream history controls, explorer panels updated |
  | 4 | Logs & advanced settings | Planned when those areas are refactored |
- **Documented exceptions:** icon-only controls in compact layouts, context menus, breadcrumbs, and monitoring’s legacy badge. Keep them as-is until the owning flows change.
- **Outstanding work:** Optional migrations for `UnifiedConnectionParams` and other specialty inputs; Phase 4 polish plus dark-mode validation pass once the toggle ships.

---

## 2. Principles & Quick Reference
### Core principles
1. **Color = signal.** Teal appears only when guiding users through primary actions, active selections, focus states, success, or progress. Neutral grays handle everything else.
2. **Clarity for operators.** Surfaces stay calm so DB engineers can spot the next action instantly.
3. **Accessibility first.** Every interactive element must expose a teal focus ring, predictable keyboard order, and semantic color contrast.
4. **Centralized styling.** Extend base components instead of scattering ad-hoc Tailwind strings. Document any exception.

### When to use teal
| Element | Teal? | Notes |
| --- | --- | --- |
| Primary buttons | ✅ | `bg-teal-600` / `hover:bg-teal-700`, `focus:ring-teal-500` |
| Secondary buttons (Cancel/Back) | ❌ | `bg-white border-gray-300 text-gray-700` |
| Active selections (tabs, segmented controls) | ✅ | Selected option gains teal fill or border + ring |
| Form inputs | ⚠️ | Gray borders by default; teal only on focus |
| Success state badges | ✅ | Finished/completed indicators |
| Progress indicators | ✅ | Bars/spinners use teal fill |
| Body text, helper copy | ❌ | Stick with gray-600/700 |

### Button & input cheatsheet
- **Primary:** teal background, white text, `focus:ring-teal-500 ring-offset-2`.
- **Secondary:** white background, gray text, gray border, `hover:bg-gray-50`.
- **Danger:** white background, red text/border; reserve for destructive actions.
- **Ghost:** transparent background, gray text; use for inline “Edit”/link-style actions.
- **Inputs/selects/textareas:** `border-gray-300 text-gray-900 placeholder-gray-400`, teal focus ring only.
- **Checkbox/radio:** `text-teal-600 focus:ring-teal-500`, gray border when idle.

### Color decision flow
1. Is the element interactive? If not, keep it gray.
2. Does it advance/confirm the primary flow? → teal primary styling.
3. Is it destructive? → red danger palette.
4. Is it contextual (cancel/back/filter)? → secondary gray styling.
5. Is it showing active/selected state? → teal border/fill + ring.

### Status colors
| Status | Background | Text | Border |
| --- | --- | --- | --- |
| Running | `bg-blue-50` | `text-blue-700` | `border-blue-200` |
| Finished | `bg-teal-50` | `text-teal-700` | `border-teal-200` |
| Failed | `bg-red-50` | `text-red-700` | `border-red-200` |
| Paused | `bg-amber-50` | `text-amber-700` | `border-amber-200` |
| Pending | `bg-gray-50` | `text-gray-600` | `border-gray-200` |
| Initializing | `bg-purple-50` | `text-purple-700` | `border-purple-200` |

### Common mistakes
- Giving every button a teal background (secondary actions must stay neutral).
- Setting teal as the default input border instead of only on focus.
- Mixing focus colors (blue inputs, teal selects). Stick with teal everywhere.
- Using teal for body text or decorative accents with no semantic meaning.

---

## 3. Palette & Tokens
| Token | Value | Usage |
| --- | --- | --- |
| `teal-600` | #0d9488 | Primary buttons, active selections |
| `teal-700` | #0f766e | Hover state for primaries |
| `gray-50 → gray-200` | #f9fafb → #e5e7eb | Backgrounds, borders, dividers |
| `gray-600/700/900` | #4b5563 / #374151 / #111827 | Text hierarchy |
| `blue` semantic | `blue-{50,200,700}` | Running/info |
| `red` semantic | `red-{50,200,700}` | Errors/destructive |
| `amber` semantic | `amber-{50,200,700}` | Warning/paused |
| `purple` semantic | `purple-{50,200,700}` | Initializing |

Teal never appears on inert surfaces, body text, or default input borders.

---

## 4. Component Standards
### Buttons
- Primary: `bg-teal-600 text-white`, `hover:bg-teal-700`, `focus:ring-2 ring-teal-500 ring-offset-2`, disabled = `bg-gray-300 text-gray-500`.
- Secondary: `bg-white text-gray-700 border-gray-300`, `hover:bg-gray-50 hover:border-gray-400`, `focus:ring-gray-500`.
- Danger: `text-red-600 border-red-300 bg-white`, `hover:bg-red-50`, `focus:ring-red-500`.
- Ghost: transparent background + gray text; icons allowed with bespoke spacing.

### Forms
- Inputs/selects/textareas: `border-gray-300 text-gray-900 placeholder-gray-400`, teal focus ring, disabled surfaces lighten to `bg-gray-50`.
- Checkboxes/radios: `text-teal-600 focus:ring-teal-500 focus:ring-offset-2`, gray outline when idle.
- Segmented controls: neutral gray when idle, teal fill + ring when selected.

### Status badges
Standard statuses map to semantic colors (see table above). Use `StatusBadge` to avoid inline duplication.

### Navigation & layout
- Sidebar: active link `text-teal-700 bg-teal-50 border-l-4 border-teal-600`; inactive links remain gray with hover highlight.
- Tabs: active `text-teal-600 border-teal-600`; inactive `text-gray-600 border-transparent` + hover line.
- Progress bars/spinners: teal fill/stroke over neutral track.

### Typography, spacing, and elevation
- Headings: titles `text-3xl font-bold text-gray-900`; section headers `text-xl font-semibold`; labels `text-sm font-medium text-gray-700`; helper text `text-sm text-gray-500`.
- Spacing: `space-y-4` between inputs, `space-y-6/8` between sections, `gap-4` for form grids, `gap-6` for cards.
- Radius & shadows: `rounded-md` controls, `rounded-lg` cards, `rounded-full` badges; `shadow-sm` + `ring-1 ring-gray-900/5` for cards.

---

## 5. Migration & Adoption Guide
### Pre-migration checklist
- Review this guide to refresh teal vs. gray rules.
- Inventory every button/input in the component and note intent.
- Remove ad-hoc focus states or hex colors before migrating.
- Capture flow-specific constraints so legitimate exceptions are documented.

### Migration steps
1. **Buttons → `BaseButton`.** Map actions to variants (`primary`, `secondary`, `danger`, `ghost`). Use the built-in loading/disabled props.
2. **Forms → base components.** Inputs, selects, textareas, checkboxes, switches, and segmented controls should reuse the shared wrappers for focus, helper text, and accessibility.
3. **Status indicators → `StatusBadge`.** Convert inline badge styles and remap legacy labels (active→running, success→finished, error→failed, waiting→pending, stopped→paused, loading→initializing).
4. **Navigation/selection states.** Tabs, sidebars, segmented controls always show teal when active and gray when idle.
5. **Validation/messaging.** Reserve semantic colors for real state (teal/green success, red danger, amber warning). Remove decorative teal.

### Testing checklist
- Button variants show correct hover/disabled states.
- Inputs default to gray borders and use teal focus rings.
- Keyboard navigation covers every interactive element with visible focus.
- Status badges use the semantic palettes above.
- No stray inline colors remain; lint/tests pass with no console warnings.

### Suggested rollout order (when tackling large areas)
1. Critical flows (connection + stream creation, main action bars)
2. Shared components (dialogs, confirmation prompts, global forms)
3. Data views (tables, explorers, AG Grid, logs)
4. Edge cases/admin surfaces

### Before committing
- Verify both Chrome and Firefox in light mode; add `dark:` variants if the surface already supports dark mode.
- Confirm spacing/disabled/ARIA regressions are avoided.
- Update this doc when you introduce a sanctioned exception.

---

## 6. Dark Mode Reference
- Theme state lives in `src/stores/theme.ts`; `ThemeToggle.vue` controls the UI; Tailwind uses `darkMode: 'class'`; `src/assets/style.css` imports the config with `@config`.
- **Coverage:** Database explorer views, tree items, metadata panes, AG Grid, pagination, BaseButton, toasts, and search inputs already include `dark:` variants. Database icon colors are safelisted.

### Palette translation (light → dark)
| Surface | Light | Dark |
| --- | --- | --- |
| Primary background | `bg-white` | `dark:bg-gray-850` |
| Secondary background | `bg-gray-50` | `dark:bg-gray-800` |
| Headers | `bg-gray-50 border-gray-200` | `dark:bg-gray-900 dark:border-gray-700` |
| Text primary | `text-gray-900` | `dark:text-gray-100` |
| Text secondary | `text-gray-600` | `dark:text-gray-400` |
| Borders | `border-gray-300` | `dark:border-gray-700` |
| Primary button | `bg-teal-600 hover:bg-teal-700` | `dark:bg-teal-500 dark:hover:bg-teal-400` |
| Secondary button | `bg-white border-gray-300` | `dark:bg-gray-800 dark:border-gray-600` |
| Status colors | `bg-{color}-100 text-{color}-800` | `dark:bg-{color}-900 dark:text-{color}-300` |

### Implementation pattern
1. Pair every color utility with a `dark:` counterpart (`bg-white dark:bg-gray-850`, `text-gray-900 dark:text-gray-100`).
2. Update supporting tokens: `shadow-sm dark:shadow-gray-900/30`, `ring-offset-2 dark:ring-offset-gray-900`, `placeholder-gray-400 dark:placeholder-gray-500`.
3. Icons should inherit text color via `currentColor`; multi-tone SVGs need explicit `dark:` classes (safelisted in `tailwind.config.mjs`).
4. Global CSS already applies a 200 ms transition to color/border/background; no extra JS needed beyond the theme store.

### Configuration touchpoints
- `tailwind.config.mjs`: `darkMode: 'class'`, safelist for database icon backgrounds, custom gray shades, and warm palette.
- `src/assets/style.css`: `@config` directive, `color-scheme: dark`, definition of `--color-gray-850/950`, transition defaults.
- `src/styles/agGridTheme.css`: AG Grid dark theme overrides.

### Dark mode testing checklist
- Toggle the theme and confirm backgrounds, text, borders, shadows, and focus rings update.
- Validate hover/focus states remain visible on dark surfaces.
- Confirm icons/spinners inherit the correct color.
- Check WCAG contrast ≥ 4.5:1 in both modes.
- Ensure localStorage persists the user preference and hydration applies it before render.

---

## 7. References & Ownership
- **Primary reference:** this document (`DESIGN_SYSTEM.md`).
- **Component source of truth:** `src/components/base/` (with `StatusBadge` currently in `src/components/common/StatusBadge.vue`).
- **Theme assets:** `src/stores/theme.ts`, `src/components/ThemeToggle.vue`, `src/assets/style.css`, `src/styles/agGridTheme.css`, `tailwind.config.mjs`.
- **Maintainers:** Design System team (update this doc when patterns or exceptions change).

When in doubt, default to gray, reach for the base components, and document any deviation here.
