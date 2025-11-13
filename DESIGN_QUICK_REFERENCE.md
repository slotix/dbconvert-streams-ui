# Design System Quick Reference

> Teal highlights the action that moves the flow forward; gray keeps the rest of the UI calm.

---

## When to Use Teal
| Element | Teal? | Notes |
| --- | --- | --- |
| Primary buttons | ✅ | `bg-teal-600` / `hover:bg-teal-700` with `focus:ring-teal-500` |
| Secondary buttons | ❌ | `bg-white border-gray-300 text-gray-700` |
| Active selections | ✅ | Selected tabs, radio buttons, segmented controls |
| Form inputs | ⚠️ | Gray borders; teal only on focus/focus ring |
| Success state badges | ✅ | Finished/completed indicators |
| Progress indicators | ✅ | Fill/track elements |
| Body text + helper copy | ❌ | Stick with gray-600/700 |

---

## Button & Input Cheatsheet
- **Primary:** teal background, white text, `focus:ring-teal-500 ring-offset-2`.
- **Secondary:** white background, gray text, gray border, subtle hover (`hover:bg-gray-50`).
- **Danger:** white background, red text/border; only for destructive actions.
- **Ghost:** transparent background, gray text; use for “Edit” / inline controls.
- **Inputs/selects/textareas:** `border-gray-300 text-gray-900 placeholder-gray-400`; add teal focus ring only.
- **Checkbox/radio:** `text-teal-600 focus:ring-teal-500` with gray borders when idle.

---

## Color Decision Flow
1. Is the element interactive? If not, default to gray text/background.
2. Does it advance/confirm the primary task? Use teal primary styling.
3. Is it destructive? Use the red danger palette.
4. Is it merely contextual (cancel, back, filters)? Keep it secondary gray.
5. Is it showing an active/selected state? Highlight with teal border/fill.

---

## Status Colors
| Status | Background | Text | Border |
| --- | --- | --- | --- |
| Running | `bg-blue-50` | `text-blue-700` | `border-blue-200` |
| Finished | `bg-teal-50` | `text-teal-700` | `border-teal-200` |
| Failed | `bg-red-50` | `text-red-700` | `border-red-200` |
| Paused | `bg-amber-50` | `text-amber-700` | `border-amber-200` |
| Pending | `bg-gray-50` | `text-gray-600` | `border-gray-200` |
| Initializing | `bg-purple-50` | `text-purple-700` | `border-purple-200` |

---

## Common Mistakes to Avoid
- Giving every button a teal background (secondary actions should read as neutral).
- Setting teal as the default input border; it should only appear on focus.
- Mixing focus colors (e.g., blue for inputs, teal for selects). Stick to teal everywhere.
- Using teal for body text or decorative accents with no semantic meaning.

---

## Quick Reminders
1. Primary actions = teal background. Secondary actions = white/gray.
2. Grids, cards, and forms stay neutral; color appears only for state.
3. Status badges use semantic palettes (blue running, teal success, red error, amber pause, gray pending).
4. If you are unsure, default to gray and consult `DESIGN_SYSTEM.md` before introducing a new color.
