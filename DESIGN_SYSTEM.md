# DBConvert Streams UI Design System

**Scope:** Consolidated reference for implementation status, patterns, quick lookups, migration steps, and dark mode (supersedes previous design docs).

---

## 1. Implementation Snapshot
- **Component library:** Use `src/components/base/*` (`BaseButton`, `FormInput`, `FormSelect`, `FormCheckbox`, `FormSwitch`, `SelectionButtonGroup`). `StatusBadge` currently lives in `src/components/common/StatusBadge.vue`. Monitoring still runs the legacy badge until the transition bug is fixed.
- **Coverage:** 21 components (12 buttons, 9 forms) already consume the shared primitives.
- **Header icon system:** Use `src/components/base/DatabaseIcon.vue` for connection/database logo tiles and `src/components/common/PanelHeaderIcon.vue` for panel/card headers. Explorer and monitoring panels now use this shared icon language.
- **Rollout progress:**
  | Phase | Scope | Outcome |
  | --- | --- | --- |
  | 1 | High-visibility actions (connection + stream wizards, stream lists, monitoring) | Buttons standardized; RUNNING badge corrected to blue |
  | 2 | Dialogs & connection management | Confirm dialogs, folder selection, connection panels migrated |
  | 3 | Remaining priority buttons | Card items, stream history controls, explorer panels updated |
  | 4 | Logs & advanced settings | Planned when those areas are refactored |
- **Documented exceptions:** icon-only controls in compact layouts, context menus, breadcrumbs, and inline object/list icons. Keep them as-is until the owning flows change.
- **Outstanding work:** Optional migrations for `UnifiedConnectionParams` and other specialty inputs; Phase 4 polish plus dark-mode validation pass once the toggle ships.

---

## 2. Principles & Quick Reference
### Core principles
1. **Color = signal.** Accent color stays muted by default. Use the stronger accent only for primary CTA and the current active item. Neutral grays handle informational structure and low-priority controls.
2. **Clarity for operators.** Surfaces stay calm so DB engineers can spot the next action instantly.
3. **Accessibility first.** Every interactive element must expose a visible focus state, predictable keyboard order, and semantic color contrast.
4. **Centralized styling.** Extend base components instead of scattering ad-hoc Tailwind strings. Document any exception.
5. **One icon language.** Tree roots, explorer summaries, and panel headers should feel related. Reuse shared icon tiles instead of rebuilding colored squares per view.

### When to use accent
| Element | Accent? | Notes |
| --- | --- | --- |
| Primary buttons | ✅ | Use the strong accent tier with white text |
| Secondary buttons (Cancel/Back) | ❌ | `bg-white border-gray-300 text-gray-700` |
| Active selections (tabs, segmented controls) | ✅ | Use the muted accent tier; reserve stronger accent for the current primary surface |
| Form inputs | ⚠️ | Gray borders by default; muted accent only on focus border/background |
| Success state badges | ❌ | Use semantic green, not brand accent |
| Progress indicators | ✅ | Use muted accent unless the progress control is the primary action target |
| Body text, helper copy | ❌ | Stick with gray-600/700 |
| Informational chips/badges | ❌ | Default to neutral gray unless they communicate semantic state |
| Panel header icons | ⚠️ | Use muted tile palettes; use actual connection logo when context matters |

### Button & input cheatsheet
- **Primary:** strong accent background, white text, stronger accent hover/focus state.
- **Secondary:** white background, gray text, gray border, `hover:bg-gray-50`.
- **Danger:** white background, red text/border; reserve for destructive actions.
- **Ghost:** transparent background, gray text; use for inline “Edit”/link-style actions.
- **Inputs/selects/textareas:** `border-gray-300 text-gray-900 placeholder-gray-400`, muted accent focus border/background only.
- **Checkbox/radio:** use muted accent for the checked control, gray border when idle; do not add halo rings.
- **Panel headers:** use `PanelHeaderIcon` rather than ad hoc `p-* bg-* rounded-*` wrappers.

### Color decision flow
1. Is the element interactive? If not, keep it gray.
2. Does it advance/confirm the primary flow? → strong accent styling.
3. Is it destructive? → red danger palette.
4. Is it contextual (cancel/back/filter)? → secondary gray styling.
5. Is it showing active/selected state? → muted accent border/fill.
6. Is it a panel/card header? → use a muted icon tile (`PanelHeaderIcon` or `DatabaseIcon`) instead of a one-off color block.

### Status colors
| Status | Background | Text | Border |
| --- | --- | --- | --- |
| Running | `bg-blue-50` | `text-blue-700` | `border-blue-200` |
| Finished | `bg-emerald-50` | `text-emerald-700` | `border-emerald-200` |
| Failed | `bg-red-50` | `text-red-700` | `border-red-200` |
| Paused | `bg-amber-50` | `text-amber-700` | `border-amber-200` |
| Pending | `bg-gray-50` | `text-gray-600` | `border-gray-200` |
| Initializing | `bg-purple-50` | `text-purple-700` | `border-purple-200` |

### Common mistakes
- Giving every button a strong accent background (secondary actions must stay neutral).
- Setting accent as the default input border instead of only on focus.
- Using accent for informational chips, body text, or decorative accents with no semantic meaning.
- Rebuilding panel header icon tiles by hand instead of reusing `PanelHeaderIcon`.
- Reintroducing `ring-*` halos for focus instead of border/background state changes.

---

## 3. Palette & Tokens
| Token | Value | Usage |
| --- | --- | --- |
| `ui-accent-strong-*` | CSS vars in `style.css` | Primary buttons and the current highest-priority active item |
| `ui-accent-soft-*` | CSS vars in `style.css` | Focus states, selected tabs, selected filters, subtle indicators |
| `gray-50 → gray-200` | #f9fafb → #e5e7eb | Backgrounds, borders, dividers |
| `gray-600/700/900` | #4b5563 / #374151 / #111827 | Text hierarchy |
| `blue` semantic | `blue-{50,200,700}` | Running/info |
| `emerald` semantic | `emerald-{50,200,700}` | Success/finished |
| `red` semantic | `red-{50,200,700}` | Errors/destructive |
| `amber` semantic | `amber-{50,200,700}` | Warning/paused |
| `purple` semantic | `purple-{50,200,700}` | Initializing |

Accent never appears on inert surfaces, body text, or default input borders.

---

## 4. Component Standards
### Buttons
- Primary: use `ui-accent-primary`, disabled = `bg-gray-300 text-gray-500`.
- Secondary: `bg-white text-gray-700 border-gray-300`, `hover:bg-gray-50 hover:border-gray-400`, focus uses border/background state.
- Danger: `text-red-600 border-red-300 bg-white`, `hover:bg-red-50`, focus uses red border/background state.
- Ghost: transparent background + gray text; icons allowed with bespoke spacing.

### Forms
- Inputs/selects/textareas: `border-gray-300 text-gray-900 placeholder-gray-400`, muted accent focus border/background, disabled surfaces lighten to `bg-gray-50`.
- Checkboxes/radios: muted accent for checked state, gray outline when idle.
- Segmented controls: neutral gray when idle, muted accent fill + border when selected.

### Icons
- **Connection/database logo tiles:** Use `DatabaseIcon.vue`. This is the source of truth for tree-style connection logos and their muted tile palettes.
- **Panel/card headers:** Use `PanelHeaderIcon.vue`.
- **Inline object icons:** Keep using `ObjectIcon.vue` or direct Lucide icons where the icon is part of a row/list, not a panel header.
- **Do not** build new header tiles with local color classes unless a new shared tone is needed; add the tone to the shared component instead.

### Status badges
Standard statuses map to semantic colors (see table above). Use `StatusBadge` to avoid inline duplication.

### Navigation & layout
- Sidebar: active link uses the muted accent surface plus subtle border; inactive links remain gray with hover highlight.
- Tabs: active tab uses the muted accent surface and indicator; inactive tabs stay gray with neutral hover.
- Progress bars/spinners: use the muted accent tier over a neutral track.

### Typography, spacing, and elevation
- Headings: titles `text-3xl font-bold text-gray-900`; section headers `text-xl font-semibold`; labels `text-sm font-medium text-gray-700`; helper text `text-sm text-gray-500`.
- Spacing: `space-y-4` between inputs, `space-y-6/8` between sections, `gap-4` for form grids, `gap-6` for cards.
- Radius & shadows: `rounded-md` controls, `rounded-lg` cards, `rounded-full` badges; use soft borders plus `shadow-sm`/`shadow-lg` for surfaces. Do not rely on rings for card outlines.

---

## 5. Migration & Adoption Guide
### Pre-migration checklist
- Review this guide to refresh accent hierarchy vs. neutral rules.
- Inventory every button/input in the component and note intent.
- Remove ad-hoc focus states or hex colors before migrating.
- Capture flow-specific constraints so legitimate exceptions are documented.

### Migration steps
1. **Buttons → `BaseButton`.** Map actions to variants (`primary`, `secondary`, `danger`, `ghost`). Use the built-in loading/disabled props.
2. **Forms → base components.** Inputs, selects, textareas, checkboxes, switches, and segmented controls should reuse the shared wrappers for focus, helper text, and accessibility.
3. **Status indicators → `StatusBadge`.** Convert inline badge styles and remap legacy labels (active→running, success→finished, error→failed, waiting→pending, stopped→paused, loading→initializing).
4. **Panel headers → shared icon tiles.** Use `PanelHeaderIcon` for panel/card section headers and `DatabaseIcon` when the actual connection/database logo should appear.
5. **Navigation/selection states.** Tabs, sidebars, segmented controls use muted accent when active and gray when idle.
6. **Validation/messaging.** Reserve semantic colors for real state (green success, red danger, amber warning, blue info). Remove decorative accent.

### Testing checklist
- Button variants show correct hover/disabled states.
- Inputs default to gray borders and use muted accent focus border/background states.
- Keyboard navigation covers every interactive element with visible focus.
- Status badges use the semantic palettes above.
- Panel/card headers reuse `PanelHeaderIcon` or `DatabaseIcon` where applicable.
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
| Primary button | strong accent token | strong accent token |
| Secondary button | `bg-white border-gray-300` | `dark:bg-gray-800 dark:border-gray-600` |
| Status colors | `bg-{color}-100 text-{color}-800` | `dark:bg-{color}-900 dark:text-{color}-300` |
| Header icon tiles | muted solid tiles | darker muted tiles with lightened icon tint |

### Implementation pattern
1. Pair every color utility with a `dark:` counterpart (`bg-white dark:bg-gray-850`, `text-gray-900 dark:text-gray-100`).
2. Update supporting tokens: `shadow-sm dark:shadow-gray-900/30`, `placeholder-gray-400 dark:placeholder-gray-500`, and the appropriate dark border/background focus states.
3. Icons should inherit text color via `currentColor`; multi-tone SVGs need explicit `dark:` classes (safelisted in `tailwind.config.mjs`).
4. Global CSS already applies a 200 ms transition to color/border/background; no extra JS needed beyond the theme store.

### Configuration touchpoints
- `tailwind.config.mjs`: `darkMode: 'class'`, safelist for database icon backgrounds, custom gray shades, and warm palette.
- `src/assets/style.css`: `@config` directive, `color-scheme: dark`, definition of `--color-gray-850/950`, transition defaults.
- `src/styles/agGridTheme.css`: AG Grid dark theme overrides.

### Dark mode testing checklist
- Toggle the theme and confirm backgrounds, text, borders, shadows, focus states, and header icon tiles update.
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
