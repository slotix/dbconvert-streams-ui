# Dark Theme Reference Guide

**Status:** Fully implemented . Use this sheet to keep new UI consistent in both themes.

---

## What’s Done
- **Foundation:** `src/stores/theme.ts` manages the `dark` class, persistence, and transition timing; `ThemeToggle.vue` ships the UI; Tailwind uses `darkMode: 'class'` and the global stylesheet imports the config via `@config`.
- **Database Explorer:** All explorer views, tree items, metadata panes, AG Grid assets, and shared containers include dark variants.
- **Common Components:** Buttons, search inputs, pagination, toasts, and shared cards include `dark:` colors plus safelisted utility classes for database icons.

---

## Palette Reference (Light → Dark)
| Surface | Light class | Dark class |
| --- | --- | --- |
| Primary background | `bg-white` | `dark:bg-gray-850`
| Secondary background | `bg-gray-50` | `dark:bg-gray-800`
| Headers | `bg-gray-50 border-gray-200` | `dark:bg-gray-900 dark:border-gray-700`
| Text primary | `text-gray-900` | `dark:text-gray-100`
| Text secondary | `text-gray-600` | `dark:text-gray-400`
| Borders | `border-gray-300` | `dark:border-gray-700`
| Primary button | `bg-teal-600 hover:bg-teal-700` | `dark:bg-teal-500 dark:hover:bg-teal-400`
| Secondary button | `bg-white border-gray-300` | `dark:bg-gray-800 dark:border-gray-600`

Status colors follow the same shift: lighten text/background by ~200 Tailwind points in dark mode (e.g., `bg-red-100 text-red-800` → `dark:bg-red-900 dark:text-red-300`).

---

## Implementation Pattern
1. Wrap every color utility with a `dark:` partner (`bg-white dark:bg-gray-850`, `text-gray-900 dark:text-gray-100`, etc.).
2. Remember supporting tokens: shadows (`shadow-sm dark:shadow-gray-900/30`), ring offsets (`ring-offset-2 dark:ring-offset-gray-900`), and placeholders (`placeholder-gray-400 dark:placeholder-gray-500`).
3. Icons inherit text color by default; use `text-*` utilities so they automatically adapt. For multi-color SVGs, safelist the dark variants in `tailwind.config.mjs`.
4. Keep transitions smooth—the global stylesheet already adds a 200 ms transition on color/border/background.

---

## Configuration Touchpoints
- `tailwind.config.mjs`: `darkMode: 'class'`, safelist for icon backgrounds, custom gray shades, warm palette.
- `src/assets/style.css`: imports the config, defines `--color-gray-850/950`, enables `color-scheme: dark`, and applies transition defaults.
- `src/styles/agGridTheme.css`: contains the AG Grid-specific overrides (ensure new grid views reuse this theme).

---

## Testing Checklist
- Toggle the theme and confirm every new component updates backgrounds, text, borders, shadows, and focus rings.
- Check WCAG contrast ≥ 4.5:1 in both modes.
- Verify hover/focus states remain visible on dark surfaces.
- Ensure icons/spinners inherit the updated text color (or override intentionally).
- Confirm localStorage stores the user preference and the initial render respects it.

---

## Related Files
- `src/stores/theme.ts`
- `src/components/ThemeToggle.vue`
- `src/assets/style.css`
- `src/styles/agGridTheme.css`
- `tailwind.config.mjs`
