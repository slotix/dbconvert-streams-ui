# 🌓 Dark Theme Reference Guide

## ✅ IMPLEMENTATION STATUS: COMPLETE

**Last Updated:** January 2025

**Status:** Dark theme is **fully implemented and production-ready** ✅

> **TL;DR:** All dark mode work is complete. Use this document as a reference when adding new components.

---

## 📊 Implementation Summary

### ✅ All Core Systems Implemented

1. **Foundation** (100% Complete)
   - ✅ `src/stores/theme.ts` - Theme store with Pinia
   - ✅ `ThemeToggle` component - User toggle interface
   - ✅ Dark class management - Automatic `dark` class on `<html>`
   - ✅ `@config` directive in `src/assets/style.css` - Tailwind config properly loaded
   - ✅ `darkMode: 'class'` in `tailwind.config.mjs` - Class-based dark mode enabled
   - ✅ Custom colors (gray-850, gray-950) defined in CSS

2. **Database Explorer** (100% Complete)
   - ✅ `DatabaseExplorerView.vue` - Main view with header, search, layout
   - ✅ `DatabaseTreeItem.vue` - Tree navigation with dark variants
   - ✅ `TableMetadataView.vue` - Table structure with tabs
   - ✅ `DatabaseObjectDataView.vue` - Data container
   - ✅ `AGGridDataView.vue` - Data grid with filtering
   - ✅ `src/styles/agGridTheme.css` - Complete AG Grid dark theme

3. **Common Components** (100% Complete)
   - ✅ `ObjectContainer.vue` - Tab container for data/structure views
   - ✅ `Pagination.vue` - Pagination controls
   - ✅ `BaseButton.vue` - All button variants (primary, secondary, danger, ghost)
   - ✅ `SearchInput.vue` - Search/filter inputs
   - ✅ Toast notifications - All variants (success, error, warning, info)

4. **Tailwind Safelist** (Complete)
   - ✅ Database icon backgrounds (light + dark variants)
   - ✅ Custom gray shades (gray-800, gray-850)
   - ✅ All color variants properly safelisted

---

## 🎨 Color Palette Reference

### Standard Element Colors

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| **Backgrounds** |
| Primary BG | `bg-white` | `dark:bg-gray-850` |
| Secondary BG | `bg-gray-50` | `dark:bg-gray-800` |
| Header BG | `bg-gray-50` | `dark:bg-gray-900` |
| Hover BG | `bg-gray-100` | `dark:bg-gray-700` |
| **Text Colors** |
| Primary Text | `text-gray-900` | `dark:text-gray-100` |
| Secondary Text | `text-gray-600` | `dark:text-gray-400` |
| Muted Text | `text-gray-500` | `dark:text-gray-500` |
| **Borders** |
| Default Border | `border-gray-300` | `dark:border-gray-700` |
| Subtle Border | `border-gray-200` | `dark:border-gray-800` |
| **Primary Colors** |
| Primary Action | `bg-teal-600` | `dark:bg-teal-500` |
| Primary Hover | `bg-teal-700` | `dark:bg-teal-400` |
| Focus Ring | `ring-teal-500` | `dark:ring-teal-400` |
| **Shadows** |
| Default Shadow | `shadow-sm` | `dark:shadow-gray-900/30` |
| Card Shadow | `ring-1 ring-gray-900/5` | `dark:ring-gray-700` |

### Status Colors

| Status | Light Mode | Dark Mode |
|--------|------------|-----------|
| Success | `bg-green-100 text-green-800` | `dark:bg-green-900 dark:text-green-300` |
| Warning | `bg-amber-100 text-amber-800` | `dark:bg-amber-900 dark:text-amber-300` |
| Error | `bg-red-100 text-red-800` | `dark:bg-red-900 dark:text-red-300` |
| Info | `bg-blue-100 text-blue-800` | `dark:bg-blue-900 dark:text-blue-300` |

---

## 🔧 Adding Dark Mode to New Components

### Basic Pattern

Always add `dark:` variants for every color class:

```vue
<!-- ✅ CORRECT - Include dark: variants -->
<div class="bg-white dark:bg-gray-850 text-gray-900 dark:text-gray-100">
  <button class="bg-teal-600 dark:bg-teal-500 hover:bg-teal-700 dark:hover:bg-teal-400">
    Click me
  </button>
</div>

<!-- ❌ INCORRECT - Missing dark variants -->
<div class="bg-white text-gray-900">
  <button class="bg-teal-600 hover:bg-teal-700">
    Click me
  </button>
</div>
```

### Quick Reference Patterns

| Component Type | Light Classes | Dark Classes |
|----------------|---------------|--------------|
| **Container** | `bg-white` | `dark:bg-gray-850` |
| **Card** | `bg-gray-50` | `dark:bg-gray-800` |
| **Header** | `bg-gray-50 border-b border-gray-200` | `dark:bg-gray-900 dark:border-gray-700` |
| **Text** | `text-gray-900` | `dark:text-gray-100` |
| **Subtext** | `text-gray-600` | `dark:text-gray-400` |
| **Border** | `border-gray-300` | `dark:border-gray-700` |
| **Button Primary** | `bg-teal-600 hover:bg-teal-700` | `dark:bg-teal-500 dark:hover:bg-teal-400` |
| **Button Secondary** | `bg-white border-gray-300 hover:bg-gray-50` | `dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700` |
| **Input** | `bg-white border-gray-300 focus:border-teal-500` | `dark:bg-gray-850 dark:border-gray-700 dark:focus:border-teal-400` |

### Common Gotchas

1. **Shadows**: Always add dark variants
   ```vue
   class="shadow-sm dark:shadow-gray-900/30"
   ```

2. **Ring offsets**: Update for dark backgrounds
   ```vue
   class="ring-offset-2 dark:ring-offset-gray-900"
   ```

3. **Placeholder text**: Don't forget input placeholders
   ```vue
   class="placeholder-gray-400 dark:placeholder-gray-500"
   ```

4. **Dynamic classes**: Ensure safelist includes dark variants in `tailwind.config.mjs`

---

## 🎨 SVG Icons & Color Styling

### Heroicons (Outline & Solid)

Heroicons use `currentColor` by default, so they inherit from the text color:

```vue
<!-- Icon inherits text color automatically -->
<div class="text-gray-600 dark:text-gray-400">
  <PlusIcon class="h-5 w-5" />
  <!-- Icon will be gray-600 in light, gray-400 in dark -->
</div>

<!-- Direct icon coloring -->
<PlusIcon class="h-5 w-5 text-teal-600 dark:text-teal-400" />

<!-- Icon with hover states -->
<button class="text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400">
  <PencilIcon class="h-5 w-5" />
</button>
```

### Custom SVG Icons

For SVG icons that don't use `currentColor`:

```vue
<!-- Method 1: Using fill/stroke with Tailwind -->
<svg class="h-5 w-5 fill-gray-600 dark:fill-gray-400">
  <path d="..."/>
</svg>

<svg class="h-5 w-5 stroke-gray-600 dark:stroke-gray-400" fill="none">
  <path d="..."/>
</svg>

<!-- Method 2: Inline style binding (dynamic colors) -->
<svg :style="{ fill: 'currentColor' }" class="h-5 w-5 text-teal-600 dark:text-teal-400">
  <path d="..."/>
</svg>

<!-- Method 3: For complex multi-color icons -->
<template>
  <svg class="h-6 w-6">
    <path class="fill-teal-600 dark:fill-teal-400" d="..."/>
    <path class="fill-gray-600 dark:fill-gray-400" d="..."/>
  </svg>
</template>
```

### Database/Connection Icons

For dynamically colored database icons (with safelist colors):

```vue
<template>
  <div
    :class="[
      'rounded p-2',
      'bg-violet-100 dark:bg-violet-900/20'
    ]"
  >
    <svg class="h-5 w-5 text-violet-600 dark:text-violet-400">
      <path d="..."/>
    </svg>
  </div>
</template>
```

**Safelist Pattern:**
```javascript
// tailwind.config.mjs
safelist: [
  // Light backgrounds
  'bg-violet-100',
  'bg-cyan-100',
  // Dark backgrounds
  'dark:bg-violet-900/20',
  'dark:bg-cyan-900/20',
]
```

### Icon Color Best Practices

1. **Use `currentColor` when possible** - Simplifies color management
   ```vue
   <svg class="h-5 w-5" fill="currentColor">
   ```

2. **Match icon colors to nearby text** - Creates visual hierarchy
   ```vue
   <div class="text-gray-600 dark:text-gray-400">
     <span>Username</span>
     <UserIcon class="h-4 w-4" /> <!-- Inherits color -->
   </div>
   ```

3. **Use lighter shades in dark mode** - Shift 100-200 shades lighter
   ```vue
   class="text-gray-600 dark:text-gray-400"  <!-- Good -->
   class="text-gray-600 dark:text-gray-600"  <!-- Too dark -->
   ```

4. **Brand colors need adjustment** - Teal shifts from 600 → 500/400
   ```vue
   class="text-teal-600 dark:text-teal-400"
   ```

---

## 📖 Architecture Reference

### Theme System Flow

1. User clicks ThemeToggle → `useThemeStore().setTheme(mode)`
2. Store updates localStorage: `theme-mode`
3. Store adds/removes `dark` class on `<html>`
4. Tailwind's `dark:` variants activate automatically
5. 200ms CSS transition provides smooth theme change

### File Structure

```
src/
├── stores/
│   └── theme.ts                 # Pinia store for theme state
├── components/
│   └── ThemeToggle.vue          # UI toggle component
├── assets/
│   └── style.css                # Global styles with @config directive
├── styles/
│   └── agGridTheme.css          # AG Grid dark theme
└── tailwind.config.mjs          # darkMode: 'class' configuration
```

### Key Configuration Files

**tailwind.config.mjs:**
```javascript
export default {
  darkMode: 'class', // Class-based dark mode
  safelist: [
    // Database icon colors
    'bg-violet-100', 'dark:bg-violet-900/20',
    'bg-cyan-100', 'dark:bg-cyan-900/20',
    // Custom grays
    'dark:bg-gray-800',
    'dark:bg-gray-850',
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          50: '#F9F6F2',
          100: '#F5F0EA',
          200: '#EBE3D5'
        }
      }
    }
  }
}
```

**src/assets/style.css:**
```css
@config "./tailwind.config.mjs";  /* CRITICAL - Loads config */
@import 'tailwindcss';
@plugin '@tailwindcss/forms';

@theme {
  /* Custom color definitions */
  --color-gray-850: oklch(22% 0 0);
  --color-gray-950: oklch(14.5% 0 0);
}

@layer base {
  .dark {
    color-scheme: dark;
  }

  /* Smooth transitions for theme changes */
  * {
    transition-property: background-color, border-color, color, fill, stroke;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 200ms;
  }
}
```

---

## ✅ Testing Checklist

When adding new components with dark mode:

- [ ] Component looks correct in light mode
- [ ] Component looks correct in dark mode
- [ ] Text has sufficient contrast (WCAG AA: 4.5:1 minimum)
- [ ] Interactive elements have visible focus states in both themes
- [ ] Hover states are clearly visible in both themes
- [ ] Transitions are smooth (200ms duration)
- [ ] Icons use appropriate colors (`currentColor` or explicit dark variants)
- [ ] Borders are visible in both themes
- [ ] Shadows work in both themes (use `dark:shadow-gray-900/30`)

---

## 🚀 Common Component Patterns

### Button Component

```vue
<template>
  <button
    :class="[
      'inline-flex items-center gap-2 px-4 py-2 rounded-md',
      'transition-all duration-150',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      variant === 'primary'
        ? 'bg-teal-600 dark:bg-teal-500 text-white hover:bg-teal-700 dark:hover:bg-teal-400 focus:ring-teal-500 dark:focus:ring-teal-400'
        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
    ]"
  >
    <slot />
  </button>
</template>
```

### Input Component

```vue
<template>
  <input
    :class="[
      'block w-full rounded-md px-3 py-2',
      'bg-white dark:bg-gray-850',
      'text-gray-900 dark:text-gray-100',
      'border border-gray-300 dark:border-gray-700',
      'placeholder-gray-400 dark:placeholder-gray-500',
      'focus:outline-none focus:ring-1',
      'focus:border-teal-500 dark:focus:border-teal-400',
      'focus:ring-teal-500 dark:focus:ring-teal-400'
    ]"
  />
</template>
```

### Card Component

```vue
<template>
  <div
    :class="[
      'bg-white dark:bg-gray-850',
      'rounded-lg p-6',
      'shadow-sm dark:shadow-gray-900/30',
      'ring-1 ring-gray-900/5 dark:ring-gray-700',
      'border border-gray-200 dark:border-gray-700'
    ]"
  >
    <slot />
  </div>
</template>
```

### Table Component

```vue
<template>
  <div class="ring-1 ring-gray-200 dark:ring-gray-700 rounded-lg overflow-hidden">
    <table class="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
      <thead class="bg-gray-50 dark:bg-gray-900">
        <tr>
          <th class="px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            Column
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-850">
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
          <td class="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
            Data
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
```

---

## 🎯 Quick Tips

1. **Start with container backgrounds** - Add dark:bg-* first
2. **Then add text colors** - Ensure readable contrast
3. **Add borders** - Often need dark:border-gray-700
4. **Don't forget shadows** - Use dark:shadow-gray-900/30
5. **Test interactivity** - Hover and focus states must be visible
6. **Check icons** - Ensure they use currentColor or have dark: variants
7. **Use browser DevTools** - Toggle dark class on `<html>` to test
8. **WCAG contrast checker** - Verify 4.5:1 minimum ratio

---

## 📚 Related Files

- [src/stores/theme.ts](/home/dm3/dbconvert/dbconvert-streams-ui/src/stores/theme.ts) - Theme state management
- [src/components/ThemeToggle.vue](/home/dm3/dbconvert/dbconvert-streams-ui/src/components/ThemeToggle.vue) - UI toggle component
- [src/assets/style.css](/home/dm3/dbconvert/dbconvert-streams-ui/src/assets/style.css) - Global styles with dark mode base
- [src/styles/agGridTheme.css](/home/dm3/dbconvert/dbconvert-streams-ui/src/styles/agGridTheme.css) - AG Grid dark theme
- [tailwind.config.mjs](/home/dm3/dbconvert/dbconvert-streams-ui/tailwind.config.mjs) - Tailwind configuration
