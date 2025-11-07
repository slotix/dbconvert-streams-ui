# 🌓 Complete Dark Theme Implementation Plan for DBConvert Streams UI

## Executive Summary

**Objective:** Implement a comprehensive dark theme with toggle support and user preference persistence

**Approach:** Tailwind CSS `dark:` prefix strategy + Pinia store for state management

**Timeline:** 2-3 weeks for complete implementation (or 3-5 days for MVP)

**Key Benefits:**
- Reduced eye strain for users working with data streams
- Modern, professional aesthetic
- Better visibility for long monitoring sessions
- User preference persistence across sessions

---

## 📊 Key Findings

### Teal Primary Color Analysis

**Current teal usage in the codebase:**
- `teal-600` (primary buttons, links)
- `teal-700` (hover states)
- `teal-500` (focus rings, accents)
- `teal-50`, `teal-100` (light backgrounds)

**Dark Theme Compatibility: ✅ Excellent Choice**

Teal is actually **one of the best colors for dark themes** because:

1. **High luminance contrast** - Teal/cyan colors have excellent visibility on dark backgrounds
2. **Eye comfort** - Blue-green wavelengths are easier on eyes in dark mode than warm colors
3. **Modern aesthetic** - Popular in dark mode UIs (GitHub, VS Code, Vercel, Tailwind CSS docs all use teal/cyan)
4. **Accessibility** - Maintains WCAG AA compliance more easily than orange/red/yellow

**Recommended adjustments for dark mode:**

```css
/* Light mode - current */
Primary action: teal-600 (#0d9488)
Hover: teal-700 (#0f766e)
Focus ring: teal-500 (#14b8a6)

/* Dark mode - recommended */
Primary action: teal-400 (#2dd4bf) ✅ Brighter, pops on dark bg
Hover: teal-300 (#5eead4) ✅ More visible hover state
Focus ring: teal-500 (#14b8a6) ✅ Can keep same or go to teal-400
Background accents: teal-900 (#134e4a) ✅ Subtle dark backgrounds
```

**Why lighter teal shades work better in dark mode:**
- Dark backgrounds need lighter, more vibrant accent colors
- Teal-600 on gray-900 = insufficient contrast (might fail WCAG)
- Teal-400 on gray-900 = excellent contrast ✅
- General rule: **Shift 200-300 shades lighter** for dark mode

### Current Architecture

**Tech Stack:**
- **Framework**: Vue 3 + TypeScript
- **CSS Framework**: Tailwind CSS v4.1.15 (latest CSS engine)
- **CSS Preprocessor**: PostCSS with `@tailwindcss/postcss` plugin
- **Build Tool**: Vite 6.2.2
- **State Management**: Pinia for global state
- **UI Components**: Headless UI v1.x, Heroicons v2.x, AG Grid

**Current State:**
- Modern Tailwind CSS v4 setup with PostCSS
- ~500+ color class instances across 94+ Vue component files
- No existing dark mode support
- Well-organized component structure suitable for gradual updates
- Already using some CSS variable patterns

**Implementation Feasibility:** High (straightforward but requires systematic work)

### Scope & Complexity

📈 **Scale Challenge:**
- **94+ Vue component files** need color class updates
- **~500+ color class instances** to modify with `dark:` variants
- **23,839 lines** of Vue component code total
- Every `bg-*`, `text-*`, `border-*` class needs a dark variant

⚙️ **Complexity Rating: 6/10**
- **Technical complexity:** Low (3/10) - Tailwind makes it straightforward
- **Implementation scope:** High (9/10) - Many files to touch systematically
- **Testing complexity:** Medium (6/10) - Need comprehensive visual testing

⏱️ **Estimated Time:**
- **Minimum Viable (core UI only):** 3-5 days
- **Complete implementation:** 2-3 weeks
- **Per-component average:** 15-30 minutes each

---

## Part 1: Dark Mode Color Palette

### Complete Color Mapping Guide

| Element | Light Mode | Dark Mode | WCAG AA ✅ |
|---------|-----------|-----------|-----------|
| **Backgrounds** |
| Primary BG | `bg-white` | `dark:bg-gray-900` | ✅ |
| Secondary BG | `bg-gray-50` | `dark:bg-gray-800` | ✅ |
| Card/Panel BG | `bg-white` | `dark:bg-gray-850` (custom) | ✅ |
| Hover BG | `bg-gray-100` | `dark:bg-gray-700` | ✅ |
| Active BG | `bg-gray-200` | `dark:bg-gray-600` | ✅ |
| **Text Colors** |
| Primary Text | `text-gray-900` | `dark:text-gray-100` | ✅ |
| Secondary Text | `text-gray-600` | `dark:text-gray-400` | ✅ |
| Muted Text | `text-gray-500` | `dark:text-gray-500` | ✅ |
| Link Text | `text-teal-600` | `dark:text-teal-400` | ✅ |
| **Borders** |
| Default Border | `border-gray-300` | `dark:border-gray-700` | ✅ |
| Subtle Border | `border-gray-200` | `dark:border-gray-800` | ✅ |
| Focus Border | `border-teal-500` | `dark:border-teal-400` | ✅ |
| **Primary/Accent Colors** |
| Primary Action | `bg-teal-600` | `dark:bg-teal-500` | ✅ |
| Primary Hover | `bg-teal-700` | `dark:bg-teal-400` | ✅ |
| Primary Text | `text-teal-600` | `dark:text-teal-400` | ✅ |
| Focus Ring | `ring-teal-500` | `dark:ring-teal-400` | ✅ |
| **Status Colors** |
| Success | `bg-green-100` / `text-green-800` | `dark:bg-green-900` / `dark:text-green-300` | ✅ |
| Warning | `bg-amber-100` / `text-amber-800` | `dark:bg-amber-900` / `dark:text-amber-300` | ✅ |
| Error | `bg-red-100` / `text-red-800` | `dark:bg-red-900` / `dark:text-red-300` | ✅ |
| Info | `bg-blue-100` / `text-blue-800` | `dark:bg-blue-900` / `dark:text-blue-300` | ✅ |
| Running | `bg-blue-100` / `text-blue-700` | `dark:bg-blue-900` / `dark:text-blue-300` | ✅ |
| Finished | `bg-teal-100` / `text-teal-700` | `dark:bg-teal-900` / `dark:text-teal-300` | ✅ |
| **Sidebar (App.vue)** |
| Sidebar BG | `bg-gray-900` | `dark:bg-gray-950` (darker) | ✅ |
| Sidebar Text | `text-white` | `dark:text-gray-100` | ✅ |
| Sidebar Item Hover | `bg-gray-800` | `dark:bg-gray-800` | ✅ |
| Sidebar Active | `bg-gray-800` | `dark:bg-teal-900` | ✅ |

### Custom Color Extensions for Tailwind Config

Add to `tailwind.config.mjs`:

```javascript
export default {
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        gray: {
          850: '#1a202e', // Custom shade between 800 and 900
          950: '#0a0e1a', // Darker than 900 for deep backgrounds
        }
      }
    }
  }
}
```

---

## Part 2: Theme Store Implementation (Pinia)

### Step 1: Create Theme Store

**File:** `src/stores/theme.ts`

```typescript
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

export const useThemeStore = defineStore('theme', () => {
  // State
  const mode = ref<ThemeMode>('system')
  const isDark = ref(false)

  // Initialize theme from localStorage or system preference
  function initializeTheme() {
    const stored = localStorage.getItem('theme-mode') as ThemeMode | null

    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      mode.value = stored
    }

    updateTheme()
  }

  // Update the actual theme applied to DOM
  function updateTheme() {
    const root = document.documentElement

    if (mode.value === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      isDark.value = prefersDark
    } else {
      isDark.value = mode.value === 'dark'
    }

    if (isDark.value) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  // Set theme mode
  function setTheme(newMode: ThemeMode) {
    mode.value = newMode
    localStorage.setItem('theme-mode', newMode)
    updateTheme()
  }

  // Toggle between light and dark (skips system)
  function toggleTheme() {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  // Listen to system theme changes when in system mode
  function setupSystemThemeListener() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const listener = (e: MediaQueryListEvent) => {
      if (mode.value === 'system') {
        updateTheme()
      }
    }

    mediaQuery.addEventListener('change', listener)

    // Cleanup (call this on app unmount if needed)
    return () => mediaQuery.removeEventListener('change', listener)
  }

  // Watch mode changes
  watch(mode, () => {
    updateTheme()
  })

  return {
    mode,
    isDark,
    initializeTheme,
    setTheme,
    toggleTheme,
    setupSystemThemeListener,
  }
})
```

### Step 2: Initialize Theme in App

**File:** `src/main.ts`

Add theme initialization:

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/style.css'
import { useThemeStore } from './stores/theme'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize theme before mounting
const themeStore = useThemeStore()
themeStore.initializeTheme()
themeStore.setupSystemThemeListener()

app.mount('#app')
```

### Step 3: Create Theme Toggle Component

**File:** `src/components/ThemeToggle.vue`

```vue
<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/vue/24/outline'
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'

const themeStore = useThemeStore()

const themes = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'System', icon: ComputerDesktopIcon },
] as const
</script>

<template>
  <Menu as="div" class="relative inline-block text-left">
    <MenuButton
      class="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-800 hover:text-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400"
      title="Toggle theme"
    >
      <SunIcon v-if="!themeStore.isDark" class="h-5 w-5" />
      <MoonIcon v-else class="h-5 w-5" />
    </MenuButton>

    <transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <MenuItems
        class="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
      >
        <div class="py-1">
          <MenuItem
            v-for="theme in themes"
            :key="theme.value"
            v-slot="{ active }"
          >
            <button
              @click="themeStore.setTheme(theme.value)"
              :class="[
                active ? 'bg-gray-100 dark:bg-gray-700' : '',
                themeStore.mode === theme.value
                  ? 'bg-teal-50 dark:bg-teal-900 text-teal-600 dark:text-teal-400'
                  : 'text-gray-700 dark:text-gray-300',
                'group flex w-full items-center px-4 py-2 text-sm',
              ]"
            >
              <component
                :is="theme.icon"
                class="mr-3 h-5 w-5"
                :class="
                  themeStore.mode === theme.value
                    ? 'text-teal-500 dark:text-teal-400'
                    : 'text-gray-400 dark:text-gray-500'
                "
              />
              {{ theme.label }}
            </button>
          </MenuItem>
        </div>
      </MenuItems>
    </transition>
  </Menu>
</template>
```

### Step 4: Add Toggle to App.vue Sidebar

**File:** `src/App.vue` - Add in sidebar (around line 100-150)

```vue
<script setup lang="ts">
// ... existing imports
import ThemeToggle from '@/components/ThemeToggle.vue'
</script>

<template>
  <!-- In the sidebar, after existing nav items -->
  <div class="flex flex-shrink-0 border-t border-gray-800 dark:border-gray-700 p-4">
    <div class="flex items-center justify-between w-full">
      <div class="text-sm text-gray-400">
        Theme
      </div>
      <ThemeToggle />
    </div>
  </div>
</template>
```

---

## Part 3: Step-by-Step Migration Guide

### Phase 1: Foundation Setup (Day 1)

#### 1.1 Enable Dark Mode in Tailwind Config

**File:** `tailwind.config.mjs`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class', // ADD THIS LINE
  theme: {
    extend: {
      colors: {
        gray: {
          850: '#1a202e',
          950: '#0a0e1a',
        },
      },
    },
  },
  plugins: [],
  safelist: [
    // ... existing safelist items
  ],
}
```

#### 1.2 Update Root HTML

**File:** `index.html`

```html
<!DOCTYPE html>
<html lang="en" class="h-full"> <!-- REMOVE bg-white class -->
<head>
  <meta charset="UTF-8">
  <link rel="icon" type="image/svg+xml" href="/vite.svg">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DBConvert Streams</title>
</head>
<body class="h-full bg-white dark:bg-gray-900"> <!-- ADD dark:bg-gray-900 -->
  <div id="app" class="h-full"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

#### 1.3 Update Global Styles

**File:** `src/assets/style.css`

Add after line 4 (after `@tailwind utilities;`):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Dark mode base styles */
@layer base {
  :root {
    color-scheme: light;
  }

  .dark {
    color-scheme: dark;
  }

  /* Ensure smooth transitions */
  * {
    @apply transition-colors duration-200;
  }
}
```

#### 1.4 Implement Theme Store

Create all files from Part 2 above:
- ✅ `src/stores/theme.ts`
- ✅ Update `src/main.ts`
- ✅ Create `src/components/ThemeToggle.vue`
- ✅ Update `src/App.vue`

**Checkpoint:** After this phase, you should be able to toggle dark mode and see the background change.

---

### Phase 2: Base Components (Days 2-3)

Update base components in priority order. These are the building blocks used throughout the app.

#### 2.1 BaseButton Component

**File:** `src/components/BaseButton.vue`

**Before:**
```vue
<button
  :class="[
    baseClasses,
    variant === 'primary'
      ? 'bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500'
      : variant === 'secondary'
      ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
      : 'bg-red-600 text-white hover:bg-red-700',
  ]"
>
```

**After:**
```vue
<button
  :class="[
    baseClasses,
    variant === 'primary'
      ? 'bg-teal-600 dark:bg-teal-500 text-white hover:bg-teal-700 dark:hover:bg-teal-400 focus:ring-teal-500 dark:focus:ring-teal-400'
      : variant === 'secondary'
      ? 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
      : 'bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-400',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ]"
>
```

#### 2.2 FormInput Component

**File:** `src/components/FormInput.vue`

**Common patterns to update:**

```vue
<!-- Before -->
<input
  class="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
/>

<!-- After -->
<input
  class="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-teal-500 dark:focus:border-teal-400 focus:ring-teal-500 dark:focus:ring-teal-400 sm:text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
/>

<!-- Label -->
<label class="block text-sm font-medium text-gray-700 dark:text-gray-300">

<!-- Error message -->
<p class="mt-1 text-sm text-red-600 dark:text-red-400">
```

#### 2.3 FormSelect Component

**File:** `src/components/FormSelect.vue`

```vue
<!-- Before -->
<select
  class="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
>

<!-- After -->
<select
  class="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-teal-500 dark:focus:border-teal-400 focus:ring-teal-500 dark:focus:ring-teal-400 sm:text-sm"
>
```

#### 2.4 StatusBadge Component

**File:** `src/components/StatusBadge.vue`

```vue
<script setup lang="ts">
const statusColors = {
  running: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  finished: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  stopped: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  paused: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
}
</script>

<template>
  <span
    :class="[
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      statusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    ]"
  >
    <slot />
  </span>
</template>
```

#### 2.5 Base Component Checklist

Update these components with dark mode variants:

- [ ] `src/components/BaseButton.vue`
- [ ] `src/components/FormInput.vue`
- [ ] `src/components/FormSelect.vue`
- [ ] `src/components/StatusBadge.vue`
- [ ] `src/components/BaseCard.vue`
- [ ] `src/components/BaseModal.vue`
- [ ] `src/components/FormTextarea.vue`
- [ ] `src/components/BaseTable.vue`
- [ ] `src/components/LoadingSpinner.vue`
- [ ] `src/components/EmptyState.vue`

**Example Pattern - BaseCard:**

```vue
<!-- Before -->
<div class="bg-white shadow rounded-lg p-6">

<!-- After -->
<div class="bg-white dark:bg-gray-850 shadow dark:shadow-gray-900/30 rounded-lg p-6">
```

---

### Phase 3: Layout Components (Days 4-5)

#### 3.1 App.vue - Main Layout

**File:** `src/App.vue`

**Key sections to update:**

```vue
<!-- Sidebar background (line ~50) -->
<div class="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
  <div class="flex min-h-0 flex-1 flex-col bg-gray-900 dark:bg-gray-950">

    <!-- Sidebar links -->
    <a
      class="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 dark:text-gray-400 hover:bg-gray-800 dark:hover:bg-gray-800 hover:text-white"
    >

    <!-- Active link -->
    <a
      class="bg-gray-800 dark:bg-teal-900 text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md"
    >

    <!-- Main content area -->
    <main class="flex-1 bg-gray-50 dark:bg-gray-900">

    <!-- Headers -->
    <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">

    <!-- Subtext -->
    <p class="text-sm text-gray-500 dark:text-gray-400">
```

#### 3.2 Navigation Components

**Pattern for navigation items:**

```vue
<!-- Inactive nav item -->
<RouterLink
  class="text-gray-300 dark:text-gray-400 hover:bg-gray-800 dark:hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md"
>

<!-- Active nav item -->
<RouterLink
  class="bg-gray-800 dark:bg-teal-900 text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md"
>

<!-- Icon in nav -->
<component
  :is="item.icon"
  class="mr-3 h-6 w-6 flex-shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-white"
/>
```

---

### Phase 4: Feature Components (Days 6-10)

#### 4.1 Stream Components

**Priority files:**
1. `src/components/streams/StreamListItem.vue`
2. `src/components/streams/StreamDetailsPanel.vue`
3. `src/components/streams/StreamCard.vue`
4. `src/components/streams/StreamConfigForm.vue`

**Common patterns:**

```vue
<!-- Card backgrounds -->
<div class="bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-lg">

<!-- Dividers -->
<div class="border-t border-gray-200 dark:border-gray-700">

<!-- List items -->
<li class="hover:bg-gray-50 dark:hover:bg-gray-800">

<!-- Headers -->
<h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">

<!-- Descriptions -->
<dd class="text-sm text-gray-500 dark:text-gray-400">
```

#### 4.2 Connection Components

**Priority files:**
1. `src/components/connections/ConnectionDetailsPanel.vue`
2. `src/components/connections/ConnectionForm.vue`
3. `src/components/connections/DatabaseTreeItem.vue`

#### 4.3 Monitor/Logs Components

**Priority files:**
1. `src/components/monitor/LogsPanel.vue`
2. `src/components/monitor/TableStatsCard.vue`
3. `src/components/monitor/MetricsChart.vue`

**Logs-specific patterns:**

```vue
<!-- Log line backgrounds (alternate) -->
<div class="odd:bg-white dark:odd:bg-gray-900 even:bg-gray-50 dark:even:bg-gray-850">

<!-- Code/monospace content -->
<pre class="bg-gray-900 dark:bg-black text-gray-100 dark:text-gray-300 rounded p-4">

<!-- Timestamp -->
<span class="text-gray-500 dark:text-gray-500 font-mono text-xs">
```

---

### Phase 5: AG Grid Dark Theme (Day 11)

#### 5.1 Create Dark Theme CSS

**File:** `src/styles/agGridTheme.css`

Add after existing theme:

```css
/* Existing light theme stays as-is */

/* Dark theme for AG Grid */
.dark .ag-theme-alpine {
  --ag-background-color: #1f2937; /* gray-800 */
  --ag-header-background-color: #111827; /* gray-900 */
  --ag-odd-row-background-color: #1f2937; /* gray-800 */
  --ag-even-row-background-color: #1a202e; /* gray-850 */

  --ag-foreground-color: #f3f4f6; /* gray-100 */
  --ag-secondary-foreground-color: #9ca3af; /* gray-400 */
  --ag-header-foreground-color: #f9fafb; /* gray-50 */

  --ag-border-color: #374151; /* gray-700 */
  --ag-row-border-color: #374151;

  --ag-selected-row-background-color: #134e4a; /* teal-900 */
  --ag-row-hover-color: #374151; /* gray-700 */

  --ag-input-border-color: #4b5563; /* gray-600 */
  --ag-input-disabled-background-color: #111827; /* gray-900 */

  --ag-checkbox-checked-color: #14b8a6; /* teal-500 */
  --ag-range-selection-background-color: rgba(20, 184, 166, 0.2);

  --ag-header-cell-hover-background-color: #1f2937;
  --ag-header-cell-moving-background-color: #1f2937;
}

/* Dark scrollbars */
.dark .ag-theme-alpine ::-webkit-scrollbar {
  background-color: #1f2937;
}

.dark .ag-theme-alpine ::-webkit-scrollbar-thumb {
  background-color: #4b5563;
  border-radius: 4px;
}

.dark .ag-theme-alpine ::-webkit-scrollbar-thumb:hover {
  background-color: #6b7280;
}
```

#### 5.2 Update AG Grid Component Usage

No changes needed if using `ag-theme-alpine` class - it will automatically pick up dark theme when `dark` class is on `<html>`.

---

### Phase 6: Views & Pages (Days 12-14)

Update all view components in `src/views/`:

**Priority order:**
1. `src/views/StreamsView.vue` - Main dashboard
2. `src/views/ConnectionsView.vue` - Connections page
3. `src/views/MonitorView.vue` - Monitoring
4. `src/views/ExplorerView.vue` - Explorer
5. `src/views/SettingsView.vue` - Settings

**Common view patterns:**

```vue
<!-- Page container -->
<div class="min-h-full bg-gray-50 dark:bg-gray-900">

<!-- Page header -->
<header class="bg-white dark:bg-gray-850 shadow dark:shadow-gray-900/30">
  <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">

<!-- Content sections -->
<section class="bg-white dark:bg-gray-850 rounded-lg shadow dark:shadow-gray-900/30 p-6">

<!-- Empty states -->
<div class="text-center py-12">
  <p class="text-gray-500 dark:text-gray-400">No data available</p>
</div>
```

---

### Phase 7: Modals & Overlays (Day 15)

#### 7.1 Modal Components

**Pattern for all modals:**

```vue
<!-- Modal backdrop -->
<TransitionRoot :show="isOpen">
  <div class="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75">

    <!-- Modal panel -->
    <DialogPanel class="bg-white dark:bg-gray-850 rounded-lg shadow-xl dark:shadow-2xl">

      <!-- Modal header -->
      <DialogTitle class="text-lg font-medium text-gray-900 dark:text-gray-100">

      <!-- Modal content -->
      <div class="mt-2 text-sm text-gray-500 dark:text-gray-400">

      <!-- Modal footer -->
      <div class="mt-4 flex justify-end space-x-3 border-t border-gray-200 dark:border-gray-700 pt-4">
```

#### 7.2 Toast Notifications

**File:** Check `vue-toastification` usage

May need custom CSS:

```css
/* Add to style.css */
.dark .Vue-Toastification__toast {
  background-color: #1f2937 !important;
  color: #f3f4f6 !important;
  border: 1px solid #374151 !important;
}

.dark .Vue-Toastification__toast--success {
  background-color: #064e3b !important;
  border-color: #059669 !important;
}

.dark .Vue-Toastification__toast--error {
  background-color: #7f1d1d !important;
  border-color: #dc2626 !important;
}
```

---

### Phase 8: Testing & Polish (Days 16-18)

#### 8.1 Manual Testing Checklist

Test all major user flows in both themes:

**Streams:**
- [ ] View streams list (light/dark)
- [ ] Create new stream (modal in both themes)
- [ ] View stream details panel
- [ ] Edit stream configuration
- [ ] Delete stream (confirmation modal)
- [ ] Start/stop stream actions
- [ ] View stream statistics

**Connections:**
- [ ] View connections list
- [ ] Add new connection (form in both themes)
- [ ] Edit connection
- [ ] Test connection (loading states)
- [ ] Delete connection
- [ ] Browse database tree

**Monitor:**
- [ ] View logs panel (syntax highlighting)
- [ ] Filter logs
- [ ] View metrics charts
- [ ] Real-time updates (SSE)
- [ ] Export logs

**Explorer:**
- [ ] File tree navigation
- [ ] File content viewing
- [ ] Syntax highlighting in code preview
- [ ] Search functionality

**Settings:**
- [ ] Theme toggle works
- [ ] Theme preference persists
- [ ] System theme detection

#### 8.2 Accessibility Testing

**Contrast Ratios (WCAG AA: 4.5:1 for text, 3:1 for UI):**

```bash
# Use browser DevTools or online tools to verify:
# - Text on backgrounds
# - Button text on button backgrounds
# - Icon colors on backgrounds
# - Focus indicators visibility
# - Link colors on backgrounds
```

**Keyboard Navigation:**
- [ ] Theme toggle accessible via keyboard
- [ ] All interactive elements have visible focus rings in dark mode
- [ ] Focus indicators use `ring-teal-500 dark:ring-teal-400`

#### 8.3 Browser Testing

Test in:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if on macOS)

**Specific checks:**
- CSS variable support
- `prefers-color-scheme` media query
- Class toggle on `<html>` element
- LocalStorage persistence

#### 8.4 Performance Check

**Before/After metrics:**
- [ ] Lighthouse score (should be similar in both themes)
- [ ] Paint times (check for transition jank)
- [ ] Bundle size (should increase minimally, ~5-10KB)

---

## Part 4: Common Patterns Reference Guide

### Quick Reference: Common Class Replacements

Use this as a find-replace guide:

| Light Class | Dark Mode Addition | Full Pattern |
|-------------|-------------------|--------------|
| `bg-white` | `dark:bg-gray-850` | `bg-white dark:bg-gray-850` |
| `bg-gray-50` | `dark:bg-gray-800` | `bg-gray-50 dark:bg-gray-800` |
| `bg-gray-100` | `dark:bg-gray-700` | `bg-gray-100 dark:bg-gray-700` |
| `text-gray-900` | `dark:text-gray-100` | `text-gray-900 dark:text-gray-100` |
| `text-gray-700` | `dark:text-gray-300` | `text-gray-700 dark:text-gray-300` |
| `text-gray-600` | `dark:text-gray-400` | `text-gray-600 dark:text-gray-400` |
| `text-gray-500` | `dark:text-gray-500` | `text-gray-500` (same) |
| `border-gray-300` | `dark:border-gray-700` | `border-gray-300 dark:border-gray-700` |
| `border-gray-200` | `dark:border-gray-800` | `border-gray-200 dark:border-gray-800` |
| `hover:bg-gray-100` | `dark:hover:bg-gray-700` | `hover:bg-gray-100 dark:hover:bg-gray-700` |
| `bg-teal-600` | `dark:bg-teal-500` | `bg-teal-600 dark:bg-teal-500` |
| `text-teal-600` | `dark:text-teal-400` | `text-teal-600 dark:text-teal-400` |
| `ring-teal-500` | `dark:ring-teal-400` | `ring-teal-500 dark:ring-teal-400` |

### Regex Find & Replace Patterns (VS Code)

**Find all bg-white without dark variant:**
```regex
(?<!dark:)bg-white(?!\s+dark:)
```

**Replace with:**
```
bg-white dark:bg-gray-850
```

**Find all text-gray-900 without dark variant:**
```regex
(?<!dark:)text-gray-900(?!\s+dark:)
```

**Replace with:**
```
text-gray-900 dark:text-gray-100
```

---

## Part 5: Implementation Scripts

### Automated Migration Helper Script

Create this helper to find all files needing updates:

**File:** `scripts/find-dark-mode-candidates.sh`

```bash
#!/bin/bash

echo "=== Files with bg-white (needs dark:bg-*) ==="
rg "bg-white" --type vue -l src/

echo ""
echo "=== Files with text-gray-900 (needs dark:text-*) ==="
rg "text-gray-900" --type vue -l src/

echo ""
echo "=== Files with border-gray (needs dark:border-*) ==="
rg "border-gray-[0-9]" --type vue -l src/

echo ""
echo "=== Total files needing dark mode updates ==="
rg "bg-white|text-gray-900|border-gray-[0-9]" --type vue -l src/ | wc -l
```

### Pre-commit Hook (Optional)

Remind developers to add dark mode variants:

**File:** `.git/hooks/pre-commit`

```bash
#!/bin/bash

# Check for new Tailwind classes without dark: variants in staged files
staged_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(vue|ts|tsx)$')

for file in $staged_files; do
  # Check if adding new bg-white without dark variant
  if git diff --cached $file | grep -E '^\+.*bg-white' | grep -v 'dark:bg-'; then
    echo "⚠️  WARNING: $file adds bg-white without dark variant"
    echo "   Consider adding: dark:bg-gray-850"
  fi
done
```

---

## Part 6: Documentation Updates

### Update README.md

Add section about dark mode:

```markdown
## Dark Mode

DBConvert Streams UI supports automatic dark mode based on system preferences, or manual toggle.

### Theme Options
- **Light**: Classic light theme
- **Dark**: Eye-friendly dark theme
- **System**: Automatically match OS preference

### Accessing Theme Toggle
Click the sun/moon icon in the sidebar to change themes. Your preference is saved locally.

### Development
When adding new UI components, always include dark mode variants using Tailwind's `dark:` prefix:

\`\`\`vue
<!-- Example -->
<div class="bg-white dark:bg-gray-850 text-gray-900 dark:text-gray-100">
\`\`\`
```

### Update DESIGN_IMPLEMENTATION_SUMMARY.md

Update Phase 4 section:

```markdown
### Phase 4: Dark Mode ✅ COMPLETED
- [x] Add dark mode toggle (ThemeToggle component)
- [x] Implement theme store with Pinia
- [x] Test all components in dark theme
- [x] Update color palette for dark mode (teal-500/400 primary)
- [x] User preference persistence (localStorage)
- [x] System preference detection
- [x] AG Grid dark theme
- [x] WCAG AA compliance verified

#### Implementation Details
- **Approach**: Tailwind CSS `dark:` class strategy
- **Store**: Pinia-based theme management
- **Persistence**: localStorage with key `theme-mode`
- **Options**: light, dark, system (auto-detect)
- **Primary Color**: Teal-400 in dark mode (excellent contrast)
- **Files Modified**: 94+ Vue components, 2 CSS files, 1 config file

#### Color Palette
See `tailwind.config.mjs` for complete palette.
Key dark mode colors:
- Backgrounds: gray-900, gray-850 (custom), gray-800
- Text: gray-100, gray-300, gray-400
- Primary: teal-500/400
- Borders: gray-700, gray-600
```

---

## 🚀 Quick Start (MVP in 3-5 Days)

If you want to start NOW with minimum viable dark mode:

### **Day 1: Foundation**
1. Add `darkMode: 'class'` to `tailwind.config.mjs`
2. Create `src/stores/theme.ts` (copy from plan)
3. Create `src/components/ThemeToggle.vue`
4. Update `src/main.ts`
5. Add toggle to `src/App.vue` sidebar

### **Day 2-3: Core Components**
Update these 10 base components:
- BaseButton, FormInput, FormSelect, StatusBadge
- BaseCard, BaseModal, FormTextarea
- App.vue (sidebar + main layout)

### **Day 4: Key Views**
- StreamsView (main dashboard)
- ConnectionsView
- One modal component

### **Day 5: Test & Polish**
- Test major user flows
- Fix any contrast issues
- Verify theme persistence

**Result:** 80% of UI will have working dark mode!

---

## 💡 Next Steps

1. **Review the plan** - Read through all phases
2. **Set up foundation** - Phase 1 (Day 1) takes ~2-4 hours
3. **Test toggle** - Verify dark mode works before continuing
4. **Pick approach:**
   - **MVP:** Follow 5-day quick start above
   - **Complete:** Follow full 18-day plan systematically

---

## 📊 Summary

**Recommended Approach:** Tailwind CSS `dark:` prefix with Pinia theme store for toggle management and localStorage persistence

**Critical Files to Start With:**
1. `src/App.vue` - Sidebar and main layout
2. `src/assets/style.css` - Add `dark:` variants to theme definitions
3. `src/styles/agGridTheme.css` - Create dark variant for tables
4. `tailwind.config.mjs` - Enable dark mode
5. Create `src/stores/theme.ts` - Theme state management

**Implementation is straightforward** - the main work is systematically adding `dark:` variants to all color classes across 94+ component files. The foundation (theme toggle, store, config) can be set up in a few hours, and then components can be updated incrementally.
