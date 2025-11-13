# Syntax Highlighting Guidelines

## Overview

All code syntax highlighting in this project uses a **centralized** styling system. This ensures consistency across all components and eliminates the need to redefine highlighting styles in individual components.

## Centralized Styles Location

All highlight.js (hljs) syntax highlighting styles are defined in:

```
src/styles/codeHighlighting.css
```

This file is automatically imported in `src/main.ts` and applies globally to all code blocks throughout the application.

## Supported Languages

The project supports syntax highlighting for:

- **SQL** - Database queries, DDL statements, etc.
- **JSON** - Configuration files, API responses, etc.

Both languages have consistent color schemes for both light and dark themes.

## Color Scheme

### Light Theme
- **Keywords/Operators**: `#d73a49` (red)
- **Strings**: `#032f62` (dark blue) / `#a5d6ff` (light blue for SQL strings)
- **Numbers/Literals**: `#005cc5` (blue)
- **Functions**: `#005cc5` (blue) / `#d2a8ff` (purple for SQL functions)
- **Comments**: `#6a737d` (gray, italic)
- **Punctuation**: `#24292e` (dark gray)
- **Attributes** (JSON): `#d73a49` (red, bold)

### Dark Theme
- **Keywords/Operators**: `#ff7b72` (light red)
- **Strings**: `#79c0ff` (light blue) / `#a5d6ff` (lighter blue for SQL strings)
- **Numbers/Literals**: `#79c0ff` (light blue)
- **Functions**: `#79c0ff` (light blue) / `#d2a8ff` (purple for SQL functions)
- **Comments**: `#8b949e` (light gray, italic)
- **Punctuation**: `#e1e4e8` / `#c9d1d9` (light gray)
- **Attributes** (JSON): `#f97583` (light red, bold)

## Usage in Components

### DO ✅

```vue
<template>
  <pre v-highlightjs>
    <code class="language-sql">{{ sqlCode }}</code>
  </pre>
</template>

<style>
/* Component-specific styles only - code highlighting styles are centralized in src/styles/codeHighlighting.css */
</style>
```

### DON'T ❌

```vue
<style>
/* DO NOT define hljs styles in individual components */
.hljs {
  color: #24292e;
}

.hljs-keyword {
  color: #d73a49;
}
/* etc. */
</style>
```

## Component-Specific Overrides

If you need component-specific styling (e.g., different tab-size, scrollbar styles), define only those specific overrides:

```vue
<style>
/* Component-specific styles only */

/* Custom scrollbar for this component */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #e5e7eb transparent;
}

/* Override tab-size for SQL code blocks */
pre {
  tab-size: 4; /* Default is 2 */
}
</style>
```

## Files Using Code Highlighting

The following components display code and use the centralized highlighting:

1. `src/components/stream/wizard/steps/StreamConfigurationStep.vue` - JSON stream config
2. `src/components/stream/CardItem.vue` - JSON stream config
3. `src/components/stream/StreamConfigurationView.vue` - JSON stream config
4. `src/components/database/SqlCodeBlock.vue` - SQL code display
5. `src/components/logs/FlatQueryRow.vue` - Inline SQL queries
6. `src/components/files/AGGridFileDataView.vue` - SQL filters
7. `src/components/database/AGGridDataView.vue` - SQL filters
8. `src/components/database/ViewStructureView.vue` - SQL DDL

## Adding New Code Display Components

When creating a new component that displays code:

1. Use the `v-highlightjs` directive
2. Specify the language with `class="language-sql"` or `class="language-json"`
3. **DO NOT** define any `.hljs` or `.hljs-*` styles in the component
4. The centralized styles will apply automatically
5. Only add component-specific layout/spacing styles as needed

## Modifying the Color Scheme

If you need to change the syntax highlighting colors:

1. Edit **only** `src/styles/codeHighlighting.css`
2. Update both light and dark theme sections
3. Test in both light and dark modes
4. Changes will apply to all components automatically

## Benefits of Centralization

✅ **Consistency**: All code blocks use the same color scheme
✅ **Maintainability**: One file to update instead of many
✅ **Dark mode support**: Built-in light/dark theme support
✅ **Less duplication**: No repeated CSS across components
✅ **Easier testing**: Single source of truth for styling
