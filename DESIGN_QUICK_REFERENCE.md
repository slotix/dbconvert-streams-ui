# Design System Quick Reference

> **TL;DR:** Use teal for primary actions and active states. Keep everything else gray. Teal = important, Gray = neutral.

---

## When to Use Teal ✅

| Element           | Use Teal               | Example                        |
| ----------------- | ---------------------- | ------------------------------ |
| Primary Buttons   | ✅ YES                  | Create Stream, Save, Start     |
| Secondary Buttons | ❌ NO                   | Cancel, Back, Refresh          |
| Active Selections | ✅ YES                  | Selected tab, checked checkbox |
| Form Inputs       | ❌ NO (only focus ring) | Text inputs stay gray borders  |
| Success States    | ✅ YES                  | "Finished" badge               |
| Progress Bars     | ✅ YES                  | Loading progress fill          |
| Links             | ⚠️ OPTIONAL             | Can use teal or gray           |

---

## Copy-Paste Classes

### Buttons

```html
<!-- Primary (Create, Save, Start) -->
<button class="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-150">
  Create Stream
</button>

<!-- Secondary (Cancel, Back) -->
<button class="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors duration-150">
  Cancel
</button>

<!-- Danger (Delete) -->
<button class="inline-flex items-center gap-2 px-4 py-2 bg-white text-red-600 text-sm font-medium border border-red-300 rounded-md hover:bg-red-50 hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors duration-150">
  Delete
</button>
```

### Form Inputs

```html
<!-- Text Input -->
<input
  type="text"
  class="block w-full rounded-md border-gray-300 shadow-sm text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 sm:text-sm"
  placeholder="Enter value"
/>

<!-- Select -->
<select class="block w-full rounded-md border-gray-300 shadow-sm text-gray-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 sm:text-sm">
  <option>Option 1</option>
</select>

<!-- Checkbox -->
<input
  type="checkbox"
  class="rounded border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
/>
```

### Selection Buttons (File Format Picker Style)

```vue
<button
  :class="[
    'px-4 py-2 rounded-md text-sm font-medium border transition-all duration-150',
    isSelected
      ? 'bg-teal-600 text-white border-teal-600 ring-2 ring-teal-500 ring-offset-1'
      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
  ]"
>
  Option
</button>
```

### Status Badges

```html
<!-- Running (Blue) -->
<span class="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-sm font-medium text-blue-700">
  <span>▶</span> Running
</span>

<!-- Finished (Teal) -->
<span class="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-sm font-medium text-teal-700">
  <span>✓</span> Finished
</span>

<!-- Failed (Red) -->
<span class="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-sm font-medium text-red-700">
  <span>✕</span> Failed
</span>
```

---

## Color Decision Tree

```
Is this element interactive?
├─ NO → Use gray text (text-gray-600 or text-gray-700)
└─ YES → Continue...
    │
    ├─ Is it the main action on the page?
    │  ├─ YES → Use teal (bg-teal-600)
    │  └─ NO → Continue...
    │      │
    │      ├─ Is it destructive?
    │      │  ├─ YES → Use red (text-red-600, border-red-300)
    │      │  └─ NO → Use gray (bg-white, border-gray-300)
    │      │
    │      └─ Is it showing active/selected state?
    │         ├─ YES → Use teal (bg-teal-600 or border-teal-600)
    │         └─ NO → Use gray
```

---

## Status Color Rules

| Status       | Background    | Text             | Border             | Use For           |
| ------------ | ------------- | ---------------- | ------------------ | ----------------- |
| **Running**  | `bg-blue-50`  | `text-blue-700`  | `border-blue-200`  | Active operations |
| **Finished** | `bg-teal-50`  | `text-teal-700`  | `border-teal-200`  | Success/complete  |
| **Failed**   | `bg-red-50`   | `text-red-700`   | `border-red-200`   | Errors            |
| **Paused**   | `bg-amber-50` | `text-amber-700` | `border-amber-200` | Warnings/paused   |
| **Pending**  | `bg-gray-50`  | `text-gray-600`  | `border-gray-200`  | Not started       |

---

## Common Mistakes

### ❌ Wrong
```vue
<!-- Don't use teal for all buttons -->
<button class="bg-teal-600">Cancel</button>

<!-- Don't use teal borders on inputs by default -->
<input class="border-teal-500" />

<!-- Don't mix focus colors -->
<input class="focus:ring-blue-500" />
<select class="focus:ring-teal-500" />
```

### ✅ Right
```vue
<!-- Secondary actions use gray -->
<button class="bg-white border border-gray-300 text-gray-700">Cancel</button>

<!-- Inputs stay gray, teal only on focus -->
<input class="border-gray-300 focus:border-teal-500 focus:ring-teal-500" />

<!-- Consistent teal focus everywhere -->
<input class="focus:ring-teal-500" />
<select class="focus:ring-teal-500" />
```

---

## Pro Tips

1. **Primary actions = Teal background** → Create, Save, Start, Confirm
2. **Secondary actions = White background + gray border** → Cancel, Back, Close
3. **All form inputs = Gray with teal focus ring** → Consistency!
4. **Active selections = Teal** → Selected tabs, checked boxes, active nav items
5. **Status indicators = Semantic colors** → Blue (running), Teal (success), Red (error)

---

## Need More Details?

See full documentation: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
