# DBConvert Streams UI Design System

**Version:** 1.0  
**Last Updated:** November 7, 2025  
**Status:** Active Standard

---

## Philosophy

> **"Color as signal, not decoration"**

DBConvert Streams serves technical professionals (DBAs, data engineers, DevOps teams) who value clarity, efficiency, and minimal distraction. Our design system uses color strategically to guide critical actions and indicate system state, while maintaining a professional, distraction-free interface.

---

## Brand Identity

### Primary Brand Color
**Teal (#0d9488)** - Tailwind `teal-600`

### Usage Principle
Teal is used as a **navigational beacon** to highlight:
- Critical actions in user flows
- Active/selected states
- Success confirmations
- System readiness indicators

Teal is **NOT** used for:
- Decorative purposes
- All interactive elements (forms stay neutral)
- Text content
- Backgrounds (except active states)

---

## Color Palette

### Brand Colors
```css
--brand-primary: #0d9488;      /* teal-600 - Primary actions */
--brand-hover: #0f766e;        /* teal-700 - Hover states */
--brand-light: #5eead4;        /* teal-300 - Accents */
--brand-dark: #115e59;         /* teal-800 - Dark mode adjustments */
```

### Neutral Palette (Light Theme)
```css
--gray-50: #f9fafb;   /* Backgrounds */
--gray-100: #f3f4f6;  /* Subtle backgrounds */
--gray-200: #e5e7eb;  /* Borders, dividers */
--gray-300: #d1d5db;  /* Disabled borders */
--gray-400: #9ca3af;  /* Placeholder text */
--gray-500: #6b7280;  /* Secondary text */
--gray-600: #4b5563;  /* Body text */
--gray-700: #374151;  /* Headings */
--gray-800: #1f2937;  /* Emphasis */
--gray-900: #111827;  /* Maximum contrast */
```

### Semantic Colors
```css
/* Success */
--success-bg: #d1fae5;      /* green-100 */
--success-border: #10b981;  /* green-500 */
--success-text: #047857;    /* green-700 */

/* Warning */
--warning-bg: #fef3c7;      /* amber-100 */
--warning-border: #f59e0b;  /* amber-500 */
--warning-text: #d97706;    /* amber-600 */

/* Error */
--error-bg: #fee2e2;        /* red-100 */
--error-border: #ef4444;    /* red-500 */
--error-text: #dc2626;      /* red-600 */

/* Info */
--info-bg: #dbeafe;         /* blue-100 */
--info-border: #3b82f6;     /* blue-500 */
--info-text: #2563eb;       /* blue-600 */

/* Running/Active */
--active-bg: #dbeafe;       /* blue-100 */
--active-border: #3b82f6;   /* blue-500 */
--active-text: #2563eb;     /* blue-600 */
```

---

## Component Standards

### 1. Buttons

#### Primary Actions (Teal)
Use for critical path operations that move users forward:
- Create Connection
- Create Stream
- Save Configuration
- Start Stream
- Confirm/Submit

```vue
<button class="btn-primary">
  bg-teal-600 text-white
  hover:bg-teal-700
  focus:ring-2 focus:ring-teal-500 focus:ring-offset-2
  disabled:bg-gray-300 disabled:text-gray-500
</button>
```

**Tailwind Classes:**
```html
<button class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors duration-150">
  Create Stream
</button>
```

#### Secondary Actions (Gray)
Use for supporting, non-critical operations:
- Cancel
- Back
- Refresh
- Filter
- Export

```vue
<button class="btn-secondary">
  bg-white text-gray-700 border border-gray-300
  hover:bg-gray-50 hover:border-gray-400
  focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
  disabled:bg-gray-100 disabled:text-gray-400
</button>
```

**Tailwind Classes:**
```html
<button class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-150">
  Cancel
</button>
```

#### Danger Actions (Red)
Use for destructive operations that cannot be easily undone:
- Delete Connection
- Delete Stream
- Permanently Remove

```vue
<button class="btn-danger">
  bg-white text-red-600 border border-red-300
  hover:bg-red-50 hover:border-red-400
  focus:ring-2 focus:ring-red-500 focus:ring-offset-2
</button>
```

**Tailwind Classes:**
```html
<button class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-red-600 text-sm font-medium border border-red-300 rounded-md hover:bg-red-50 hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-150">
  Delete
</button>
```

#### Ghost Actions (Transparent)
Use for tertiary, inline actions:
- Edit
- View Details
- Expand/Collapse

```vue
<button class="btn-ghost">
  bg-transparent text-gray-600
  hover:bg-gray-100 hover:text-gray-900
  focus:ring-2 focus:ring-gray-400
</button>
```

### 2. Form Controls

**Core Principle:** Keep forms neutral. Use color only for focus states and validation.

#### Text Inputs, Selects, Textareas

```html
<input
  type="text"
  class="block w-full rounded-md border-gray-300 shadow-sm text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-200 sm:text-sm"
/>

<select class="block w-full rounded-md border-gray-300 shadow-sm text-gray-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-500 sm:text-sm">
  <option>Option 1</option>
</select>

<textarea
  class="block w-full rounded-md border-gray-300 shadow-sm text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 sm:text-sm"
  rows="4"
></textarea>
```

#### Checkboxes & Radio Buttons

```html
<input
  type="checkbox"
  class="rounded border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:border-gray-300"
/>

<input
  type="radio"
  class="border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
/>
```

#### Selection Buttons (Toggle Groups)
Use for mutually exclusive options like file format pickers:

```html
<!-- Unselected -->
<button class="px-4 py-2 bg-white text-gray-700 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-all duration-150">
  CSV
</button>

<!-- Selected -->
<button class="px-4 py-2 bg-teal-600 text-white text-sm font-medium border border-teal-600 rounded-md ring-2 ring-teal-500 ring-offset-1 transition-all duration-150">
  CSV
</button>
```

**Vue Pattern:**
```vue
<button
  v-for="format in formats"
  :key="format.value"
  :class="[
    'px-4 py-2 rounded-md text-sm font-medium border transition-all duration-150',
    selectedFormat === format.value
      ? 'bg-teal-600 text-white border-teal-600 ring-2 ring-teal-500 ring-offset-1'
      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
  ]"
  @click="selectedFormat = format.value"
>
  {{ format.label }}
</button>
```

### 3. Status Badges

Use semantic colors to communicate system state:

```vue
<script setup lang="ts">
type Status = 'running' | 'finished' | 'failed' | 'pending' | 'paused' | 'initializing'

const statusConfig: Record<Status, { bg: string; text: string; border: string; icon: string }> = {
  running: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: '▶'
  },
  finished: {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    icon: '✓'
  },
  failed: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: '✕'
  },
  pending: {
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    border: 'border-gray-200',
    icon: '○'
  },
  paused: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: '⏸'
  },
  initializing: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: '⟳'
  }
}
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-medium',
      statusConfig[status].bg,
      statusConfig[status].text,
      statusConfig[status].border
    ]"
  >
    <span>{{ statusConfig[status].icon }}</span>
    <slot>{{ status }}</slot>
  </span>
</template>
```

### 4. Navigation

#### Sidebar Navigation

```html
<!-- Inactive -->
<a href="#" class="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150">
  <Icon />
  Connections
</a>

<!-- Active -->
<a href="#" class="flex items-center gap-3 px-3 py-2 text-sm font-medium text-teal-700 bg-teal-50 rounded-md border-l-4 border-teal-600">
  <Icon />
  Connections
</a>
```

#### Tab Navigation

```html
<!-- Inactive -->
<button class="px-4 py-2 text-sm font-medium text-gray-600 border-b-2 border-transparent hover:text-gray-900 hover:border-gray-300 transition-colors duration-150">
  Configuration
</button>

<!-- Active -->
<button class="px-4 py-2 text-sm font-medium text-teal-600 border-b-2 border-teal-600">
  Configuration
</button>
```

### 5. Progress Indicators

```html
<!-- Progress Bar -->
<div class="w-full bg-gray-200 rounded-full h-2">
  <div class="bg-teal-600 h-2 rounded-full transition-all duration-300" style="width: 45%"></div>
</div>

<!-- Loading Spinner (Teal) -->
<svg class="animate-spin h-5 w-5 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
</svg>
```

---

## User Flow Color Mapping

### Critical Path: Connection Creation
1. **"New Connection" button** → PRIMARY (teal) - Critical entry point
2. **Connection type selection** → SELECTED state (teal), UNSELECTED (gray)
3. **Connection form inputs** → NEUTRAL (gray with teal focus rings)
4. **"Test Connection" button** → SECONDARY (gray) - Non-critical action
5. **"Save Connection" button** → PRIMARY (teal) - Completes the flow

### Critical Path: Stream Configuration
1. **"Create Stream" button** → PRIMARY (teal) - Critical entry point
2. **Source/Target selection** → NEUTRAL with teal active indicators
3. **Table selection checkboxes** → Teal when checked
4. **File format selection** → SELECTED (teal), UNSELECTED (gray)
5. **Configuration form** → NEUTRAL (gray inputs, teal focus)
6. **"Create Stream" button** → PRIMARY (teal) - Completes the flow

### Critical Path: Stream Monitoring
1. **"Start" button** → PRIMARY (teal) - Critical action
2. **Status badge** → SEMANTIC colors:
   - Running → Blue
   - Finished → Teal (success)
   - Failed → Red
   - Paused → Amber
3. **"Pause" button** → SECONDARY (gray) - Reversible action
4. **"Stop" button** → DANGER (red) if destructive, SECONDARY (gray) if safe
5. **Progress bars** → Teal fill
6. **Metrics display** → NEUTRAL text with teal highlights for key numbers

---

## Quick Reference Checklist

### ✅ Use Teal For:
- [ ] Primary action buttons (Create, Save, Start, Confirm)
- [ ] Active selection states (selected tabs, buttons, radio/checkbox)
- [ ] Success status indicators ("Finished" badges)
- [ ] Progress bars and percentage fills
- [ ] Focus rings on ALL interactive elements
- [ ] Active navigation items (sidebar, tabs)
- [ ] Links (optional, can also use gray with underline)

### ❌ Don't Use Teal For:
- [ ] Form input backgrounds or borders (keep gray, teal only on focus)
- [ ] Body text or descriptions
- [ ] Secondary actions (Cancel, Back, Refresh)
- [ ] Neutral information displays
- [ ] Disabled states
- [ ] Page backgrounds
- [ ] Card backgrounds (unless indicating active selection)

### 🎨 Use Semantic Colors For:
- [ ] **Blue** - Running/active operations
- [ ] **Teal** - Success/completed states
- [ ] **Red** - Errors/failures/dangerous actions
- [ ] **Amber** - Warnings/paused states
- [ ] **Purple** - Initializing/loading states
- [ ] **Green** - Alternative success (use sparingly, prefer teal)
- [ ] **Gray** - Pending/inactive/disabled states

---

## Typography

### Headings
```css
/* Page Title */
.text-3xl font-bold text-gray-900

/* Section Heading */
.text-xl font-semibold text-gray-900

/* Subsection Heading */
.text-lg font-medium text-gray-900

/* Card Title */
.text-base font-medium text-gray-900
```

### Body Text
```css
/* Primary Body */
.text-sm text-gray-600

/* Secondary/Helper Text */
.text-sm text-gray-500

/* Small Print */
.text-xs text-gray-500
```

### Labels
```css
/* Form Labels */
.text-sm font-medium text-gray-700

/* Required Field Indicator */
.text-red-500
```

---

## Spacing

```css
/* Component Spacing */
--spacing-xs: 0.25rem;   /* 4px */
--spacing-sm: 0.5rem;    /* 8px */
--spacing-md: 1rem;      /* 16px */
--spacing-lg: 1.5rem;    /* 24px */
--spacing-xl: 2rem;      /* 32px */
--spacing-2xl: 3rem;     /* 48px */

/* Section Gaps */
.space-y-4  /* Between form fields */
.space-y-6  /* Between form sections */
.space-y-8  /* Between major sections */

/* Grid Gaps */
.gap-2  /* Tight groups (button groups) */
.gap-4  /* Form fields side-by-side */
.gap-6  /* Card grids */
```

---

## Shadows & Borders

### Shadows
```css
/* Card */
.shadow-sm  /* 0 1px 2px 0 rgb(0 0 0 / 0.05) */

/* Dropdown/Modal */
.shadow-lg  /* 0 10px 15px -3px rgb(0 0 0 / 0.1) */

/* Focus States */
.ring-2 ring-teal-500 ring-offset-2
```

### Border Radius
```css
/* Buttons, Inputs */
.rounded-md  /* 0.375rem / 6px */

/* Cards */
.rounded-lg  /* 0.5rem / 8px */

/* Badges */
.rounded-full  /* 9999px */
```

---

## Dark Mode (Future)

**Status:** Prepared but not yet implemented

### Tailwind Configuration
```js
// tailwind.config.js
module.exports = {
  darkMode: 'class', // Enable class-based dark mode
  // ... rest of config
}
```

### Dark Mode Color Adjustments
```css
.dark {
  /* Backgrounds */
  --bg-primary: #111827;      /* gray-900 */
  --bg-secondary: #1f2937;    /* gray-800 */
  --bg-tertiary: #374151;     /* gray-700 */

  /* Text */
  --text-primary: #f9fafb;    /* gray-50 */
  --text-secondary: #e5e7eb;  /* gray-200 */
  --text-tertiary: #d1d5db;   /* gray-300 */

  /* Borders */
  --border-primary: #374151;  /* gray-700 */
  --border-secondary: #4b5563; /* gray-600 */

  /* Brand (slightly brighter in dark mode) */
  --brand-primary: #14b8a6;   /* teal-500 instead of teal-600 */
  --brand-hover: #2dd4bf;     /* teal-400 */
}
```

### Implementation Pattern
```vue
<template>
  <div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50">
    <button class="bg-teal-600 dark:bg-teal-500 text-white">
      Primary Action
    </button>
    <input class="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100" />
  </div>
</template>
```

---

## Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Create `BaseButton.vue` component with all variants
- [ ] Create `StatusBadge.vue` component
- [ ] Create `FormInput.vue`, `FormSelect.vue`, `FormCheckbox.vue` wrappers
- [ ] Update Tailwind config with design tokens
- [ ] Create shared CSS utilities file

### Phase 2: Critical Paths (Week 2)
- [ ] Update Connection Creation wizard
- [ ] Update Stream Configuration wizard
- [ ] Update Stream Monitoring views
- [ ] Audit all primary/secondary buttons

### Phase 3: Forms & Tables (Week 3)
- [ ] Standardize all form components
- [ ] Update table selections and actions
- [ ] Update data explorer UI
- [ ] Ensure consistent focus states

### Phase 4: Navigation & Layout (Week 4)
- [ ] Update sidebar navigation
- [ ] Update tab navigation
- [ ] Update breadcrumbs
- [ ] Standardize page headers

### Phase 5: Polish & Documentation (Week 5)
- [ ] Component storybook/documentation
- [ ] Accessibility audit (focus indicators, ARIA labels)
- [ ] Performance check (animation smoothness)
- [ ] Create component usage examples

### Future: Dark Mode (TBD)
- [ ] Add dark mode toggle
- [ ] Test all components in dark mode
- [ ] Update documentation with dark mode screenshots
- [ ] User preference persistence

---

## Common Mistakes to Avoid

### ❌ Don't Do This
```vue
<!-- Using teal for form inputs -->
<input class="border-teal-500" />

<!-- Using teal for body text -->
<p class="text-teal-600">Description text</p>

<!-- Using teal for all buttons -->
<button class="bg-teal-600">Cancel</button>

<!-- Mixing focus ring colors -->
<input class="focus:ring-blue-500" />
<input class="focus:ring-teal-500" />
```

### ✅ Do This Instead
```vue
<!-- Keep inputs neutral, teal only on focus -->
<input class="border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />

<!-- Use gray for body text -->
<p class="text-gray-600">Description text</p>

<!-- Use secondary variant for Cancel -->
<button class="bg-white border border-gray-300 text-gray-700">Cancel</button>

<!-- Consistent teal focus rings -->
<input class="focus:ring-teal-500" />
<input class="focus:ring-teal-500" />
```

---

## Resources

### Tailwind CSS Documentation
- [Colors](https://tailwindcss.com/docs/customizing-colors)
- [Forms Plugin](https://github.com/tailwindlabs/tailwindcss-forms)
- [Dark Mode](https://tailwindcss.com/docs/dark-mode)

### Accessibility
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [ARIA Labels](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Techniques)
- [Focus Management](https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html)

### Design Inspiration
- [Tailwind UI Components](https://tailwindui.com/)
- [Headless UI](https://headlessui.com/)

---

## Questions or Suggestions?

This is a living document. If you encounter edge cases or have suggestions for improvements, please:
1. Document the use case
2. Propose a solution following existing patterns
3. Update this guide with the approved pattern
4. Communicate changes to the team

**Maintainer:** Design System Team  
**Last Review:** November 7, 2025
