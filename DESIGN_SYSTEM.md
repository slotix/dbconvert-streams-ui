# DBConvert Streams UI Design System

**Version:** 1.0 (November 7, 2025)  
**Scope:** Streamlines teal-as-signal, gray-as-default visuals for the API, reader, and writer tools.

---

## Philosophy
- **Color as signal, not decoration.** Teal guides users through critical actions and confirmations; neutral grays handle everything else.
- **Clarity for technical operators.** Layouts stay quiet so DB engineers can find the action they need instantly.
- **Accessibility built in.** Every interactive element must expose a teal focus ring, predictable keyboard order, and clear semantic color contrast.

---

## Palette Overview
| Token | Value | Usage |
| --- | --- | --- |
| `teal-600` | #0d9488 | Primary buttons, active selections |
| `teal-700` | darker hover | Hover state for primaries |
| `gray-50/100/200` | #f9fafb → #e5e7eb | Backgrounds, borders, dividers |
| `gray-600/700/900` | #4b5563 → #111827 | Text hierarchy |
| `blue` semantic | blue-50/200/700 | “Running” status + info highlights |
| `red` semantic | red-50/200/700 | Destructive states |
| `amber` semantic | amber-50/200/700 | Paused / warning |
| `purple` semantic | purple-50/200/700 | Initializing/transient states |

Teal never appears on inert surfaces, body text, or default input borders.

---

## Component Standards
- **Buttons**
  - Primary: `bg-teal-600 text-white`, hover `teal-700`, `focus:ring-2 ring-teal-500 ring-offset-2`.
  - Secondary: `bg-white text-gray-700 border-gray-300`, subtle hover and gray focus ring.
  - Danger: red border/text with white background; reserve for irreversible actions.
  - Ghost: transparent background + gray text for inline actions. Icon-only variants justify bespoke sizing.
- **Forms**
  - Inputs/selects/textareas: `border-gray-300 text-gray-900 placeholder-gray-400`, teal focus border/ring, disabled state uses lighter gray backgrounds.
  - Checkboxes/radios: gray outline, `text-teal-600 focus:ring-teal-500` when active.
  - Segmented/selection buttons: gray neutral state, teal background + ring when selected.
- **Status badges**
  - Running → blue, Finished → teal, Failed → red, Paused → amber, Pending → gray, Initializing → purple. Each badge combines matching background/text/border shades.
- **Navigation**
  - Sidebar: active link `text-teal-700 bg-teal-50 border-l-4 border-teal-600`; inactive links remain gray with hover fill.
  - Tabs: active `text-teal-600 border-teal-600`; inactive `text-gray-600 border-transparent` with hover highlight.
- **Progress + messaging**
  - Progress bars use teal fill on a gray track; spinners adopt teal as primary stroke.
  - Toasts/banners rely on semantic palettes rather than teal (success = green/teal, warning = amber, error = red, info = blue).

---

## Usage Rules
### Always use teal for
- Primary actions (Create, Save, Start, Confirm) and their active states.
- Active selections (tabs, segmented buttons, selected rows, option chips).
- Success confirmations and progress indicators.
- Focus outlines on every interactive control.

### Never use teal for
- Default form borders, card backgrounds, or body text.
- Secondary/cancel/back actions.
- Disabled states or purely decorative accents.

### Semantic colors
- Blue = running/active, Teal = success/completed, Red = failure/danger, Amber = warning/paused, Purple = initializing, Gray = pending/inactive.

---

## Typography, Spacing, and Structure
- **Typography:** Page titles `text-3xl font-bold text-gray-900`; section headers `text-xl font-semibold`; labels `text-sm font-medium text-gray-700`; helper text `text-sm text-gray-500`.
- **Spacing:** Use Tailwind spacing scale—`space-y-4` between form fields, `space-y-6/8` between sections, `gap-4` for form grids, `gap-6` for cards.
- **Radii & shadows:** `rounded-md` for controls, `rounded-lg` for cards, `rounded-full` for badges; `shadow-sm` for cards and `ring-1 ring-gray-900/5` for elevation.

---

## Implementation Checklist
1. Confirm the component uses shared primitives (`BaseButton`, `FormInput`, `FormSelect`, `FormCheckbox`, `FormSwitch`, `SelectionButtonGroup`, `StatusBadge`).
2. Audit colors; replace inline hex/RGB values with Tailwind tokens.
3. Ensure hover, focus, active, disabled, and loading states exist for every control.
4. Verify keyboard navigation and aria labels (especially for Headless UI components).
5. Document any intentional exceptions directly in the component or supporting docs.

---

## Dark Mode Readiness
- Tailwind is configured with `darkMode: 'class'`; toggling adds `dark` to `<html>`.
- Dark backgrounds shift to `gray-800/850/900`, borders to `gray-700`, and teal intensities lighten (`teal-500/400`).
- Add `dark:` variants alongside every color declaration to keep parity (see `DARK_MODE.md` for specifics).

---

## Common Anti-Patterns
- Teal applied to every button regardless of importance.
- Inputs defaulting to teal borders instead of gray.
- Mixed focus colors (blue vs. teal) within the same form.
- Decorative teal body text that does not convey status.

Always default to gray unless user attention must be directed elsewhere.

---

## References & Ownership
- Implementation tracker: `DESIGN_IMPLEMENTATION_SUMMARY.md`
- Quick color lookup: `DESIGN_QUICK_REFERENCE.md`
- Migration process: `DESIGN_MIGRATION_GUIDE.md`
- Maintainers: Design System group (update this doc when patterns change).
