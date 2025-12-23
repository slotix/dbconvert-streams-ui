# Icon Sizes Usage Guide

This guide explains how to use the standardized icon sizing system in the DBConvert Streams UI.

## Quick Start

### Import Options

```typescript
// Option 1: Import from constants
import { ICON_SIZES, ICON_SPACING } from '@/constants'

// Option 2: Use the composable
import { useIconSizes, useContextualIconSizes } from '@/composables/useIconSizes'
```

## Available Sizes

| Size Key | Tailwind Class | Pixels | Use Case                                         |
| -------- | -------------- | ------ | ------------------------------------------------ |
| `XS`     | `h-3 w-3`      | 12px   | Spinners, badges, tight spaces                   |
| `SM`     | `h-3.5 w-3.5`  | 14px   | Search fields, compact UI                        |
| `BASE`   | `h-4 w-4`      | 16px   | **Default** - Table actions, forms (MOST COMMON) |
| `MD`     | `h-5 w-5`      | 20px   | Primary buttons, navigation                      |
| `LG`     | `h-6 w-6`      | 24px   | Sidebar menu, important UI                       |
| `XL`     | `h-8 w-8`      | 32px   | Large loading spinners                           |
| `XXL`    | `h-12 w-12`    | 48px   | Empty states, placeholders                       |
| `XXXL`   | `h-16 w-16`    | 64px   | Hero sections, illustrations                     |

## Usage Examples

### 1. Direct Constants (Simple)

Best for static icons where the size won't change:

```vue
<script setup lang="ts">
import { ICON_SIZES } from '@/constants'
import { Plus } from 'lucide-vue-next'
</script>

<template>
  <button>
    <Plus :class="ICON_SIZES.MD" />
    Create New
  </button>
</template>
```

### 2. Composable with Fixed Size

Best for components that need a consistent icon size:

```vue
<script setup lang="ts">
import { useIconSizes } from '@/composables/useIconSizes'
import { Trash } from 'lucide-vue-next'

const { iconClass } = useIconSizes('BASE')
</script>

<template>
  <button>
    <Trash :class="iconClass" />
  </button>
</template>
```

### 3. Icon with Text Spacing

Use this when icons appear next to text:

```vue
<script setup lang="ts">
import { useIconSizes } from '@/composables/useIconSizes'
import { Check } from 'lucide-vue-next'

// Icon will have h-5 w-5 mr-2 (20px icon with 8px margin)
const { iconWithTextClass } = useIconSizes('MD', 'DEFAULT')
</script>

<template>
  <button class="flex items-center">
    <Check :class="iconWithTextClass" />
    <span>Save</span>
  </button>
</template>
```

### 4. Dynamic Size Based on Props

Best for reusable components that need flexible sizing:

```vue
<script setup lang="ts">
import { useIconSizes } from '@/composables/useIconSizes'
import { X } from 'lucide-vue-next'
import type { IconSizeKey } from '@/constants'

interface Props {
  size?: IconSizeKey
}

const props = withDefaults(defineProps<Props>(), {
  size: 'BASE'
})

const { iconClass } = useIconSizes(props.size)
</script>

<template>
  <button>
    <X :class="iconClass" />
  </button>
</template>

<!-- Usage -->
<CloseButton size="MD" />
<!-- 20px icon -->
<CloseButton size="LG" />
<!-- 24px icon -->
```

### 5. Contextual Sizes

Best when you need multiple purpose-specific sizes in one component:

```vue
<script setup lang="ts">
import { useContextualIconSizes } from '@/composables/useIconSizes'
import { Home, ArrowUpDown, Plus, Settings } from 'lucide-vue-next'

const sizes = useContextualIconSizes()
</script>

<template>
  <div>
    <!-- Sidebar navigation (24px) -->
    <nav>
      <Home :class="sizes.sidebarMenu" />
    </nav>

    <!-- Primary action button (20px) -->
    <button>
      <Plus :class="sizes.primaryButton" />
      Create
    </button>

    <!-- Table action (16px) -->
    <table>
      <td>
        <ArrowUpDown :class="sizes.tableAction" />
      </td>
    </table>

    <!-- Settings icon (16px) -->
    <Settings :class="sizes.formInput" />
  </div>
</template>
```

### 6. Loading Spinners

```vue
<script setup lang="ts">
import { useContextualIconSizes } from '@/composables/useIconSizes'
import { RefreshCw } from 'lucide-vue-next'

const sizes = useContextualIconSizes()
</script>

<template>
  <!-- Small spinner (12px) for inline use -->
  <RefreshCw :class="[sizes.spinnerSmall, 'animate-spin']" />

  <!-- Default spinner (16px) for buttons -->
  <RefreshCw :class="[sizes.spinner, 'animate-spin']" />

  <!-- Large spinner (32px) for full-page loading -->
  <RefreshCw :class="[sizes.spinnerLarge, 'animate-spin']" />
</template>
```

### 7. All Sizes in One Component

When you need access to all sizes:

```vue
<script setup lang="ts">
import { useAllIconSizes } from '@/composables/useIconSizes'
import { Star } from 'lucide-vue-next'

const sizes = useAllIconSizes()
</script>

<template>
  <div class="flex items-center gap-2">
    <Star :class="sizes.xs" />
    <Star :class="sizes.sm" />
    <Star :class="sizes.base" />
    <Star :class="sizes.md" />
    <Star :class="sizes.lg" />
  </div>
</template>
```

## Migration Guide

### Before (Hardcoded)

```vue
<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
</script>

<template>
  <button>
    <Plus class="h-5 w-5 mr-2" />
    Create
  </button>
</template>
```

### After (Using Constants)

```vue
<script setup lang="ts">
import { useIconSizes } from '@/composables/useIconSizes'
import { Plus } from 'lucide-vue-next'

const { iconWithTextClass } = useIconSizes('MD', 'DEFAULT')
</script>

<template>
  <button>
    <Plus :class="iconWithTextClass" />
    Create
  </button>
</template>
```

## Size Recommendations by Context

### Forms and Tables

```typescript
const sizes = useContextualIconSizes()

// Use sizes.formInput for:
// - Search icons
// - Filter icons
// - Input field icons
// - Dropdown icons

// Use sizes.tableAction for:
// - Sort icons
// - Copy buttons
// - Delete buttons
// - Edit buttons
```

### Navigation

```typescript
const sizes = useContextualIconSizes()

// Use sizes.sidebarMenu for:
// - Main sidebar navigation items
// - Primary menu icons

// Use sizes.navigationHeader for:
// - Breadcrumb icons
// - Tab icons
// - Secondary navigation
```

### Buttons

```typescript
const sizes = useContextualIconSizes()

// Use sizes.primaryButton for:
// - Create/Add buttons
// - Submit buttons
// - Play/Pause/Stop controls
// - Important CTAs

// Use sizes.tableAction for:
// - Small action buttons
// - Icon-only buttons in tight spaces
```

### Modals and Dialogs

```typescript
const sizes = useContextualIconSizes()

// Use sizes.modalClose for:
// - Modal close buttons (X)
// - Dialog dismiss buttons
// - Overlay close controls
```

### Empty States

```typescript
const sizes = useContextualIconSizes()

// Use sizes.emptyState for:
// - Empty table placeholders
// - No results found icons
// - Empty folder icons
```

## Helper Functions

### getIconSize

Get icon size with fallback to default:

```typescript
import { getIconSize } from '@/constants'

const size = getIconSize('MD') // Returns 'h-5 w-5'
const fallback = getIconSize('INVALID') // Returns 'h-4 w-4' (BASE)
```

### getIconClasses

Combine size and spacing:

```typescript
import { getIconClasses } from '@/constants'

const classes = getIconClasses('MD', 'DEFAULT') // Returns 'h-5 w-5 mr-2'
const noSpacing = getIconClasses('LG', 'NONE') // Returns 'h-6 w-6'
```

## Best Practices

### ✅ DO

- Use the contextual sizes composable for semantic sizing
- Combine icon classes with other Tailwind utilities using arrays
- Use `iconWithTextClass` when icons appear next to text
- Prefer `ICON_SIZES.BASE` (h-4 w-4) for most action icons
- Use consistent sizing within the same context (all table actions same size)

### ❌ DON'T

- Don't hardcode `h-X w-X` classes directly anymore
- Don't mix size standards in the same component
- Don't forget the `mr-2` spacing when icons are next to text
- Don't use `BASE` size for sidebar navigation (use `LG`)
- Don't use large sizes for action buttons (stick to `BASE` or `MD`)

## TypeScript Support

All icon size utilities are fully typed:

```typescript
import type { IconSizeKey, IconSize, IconSpacingKey, IconSpacing } from '@/constants'

// IconSizeKey = 'XS' | 'SM' | 'BASE' | 'MD' | 'LG' | 'XL' | 'XXL' | 'XXXL'
// IconSize = 'h-3 w-3' | 'h-3.5 w-3.5' | 'h-4 w-4' | ...
// IconSpacingKey = 'DEFAULT' | 'TIGHT' | 'LOOSE' | 'NONE'
// IconSpacing = 'mr-2' | 'mr-1' | 'mr-3' | ''
```

## Component Examples

See these components for real-world usage:

- [SearchInput.vue](../components/common/SearchInput.vue) - Dynamic sizing with props
- [ObjectIcon.vue](../components/common/ObjectIcon.vue) - Icon component example

## Questions?

If you're unsure which size to use:

1. Check `ICON_SIZE_USAGE` in [iconSizes.ts](./iconSizes.ts)
2. Use `useContextualIconSizes()` for semantic names
3. When in doubt, use `BASE` (h-4 w-4) - it's the most common size
