# Migration Guide: Updating Components to Design System

This guide helps you update existing components to follow the new design system standards.

---

## Quick Checklist

Before updating a component:
- [ ] Read [DESIGN_QUICK_REFERENCE.md](./DESIGN_QUICK_REFERENCE.md)
- [ ] Identify all buttons and their purposes
- [ ] Identify all form inputs
- [ ] Check for any custom focus states
- [ ] Look for inconsistent colors

---

## Step-by-Step Migration

### 1. Replace Buttons

#### Find These Patterns

```vue
<!-- Pattern 1: Inline classes -->
<button class="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700">
  Create
</button>

<!-- Pattern 2: Conditional classes -->
<button :class="isPrimary ? 'bg-teal-600' : 'bg-gray-200'">
  Action
</button>

<!-- Pattern 3: Mixed styling -->
<button class="custom-btn primary">Submit</button>
```

#### Replace With BaseButton

```vue
<script setup lang="ts">
import BaseButton from '@/components/base/BaseButton.vue'
</script>

<template>
  <!-- Primary actions -->
  <BaseButton variant="primary">Create</BaseButton>
  
  <!-- Secondary actions -->
  <BaseButton variant="secondary">Cancel</BaseButton>
  
  <!-- Dangerous actions -->
  <BaseButton variant="danger">Delete</BaseButton>
  
  <!-- With loading state -->
  <BaseButton variant="primary" :loading="isLoading">Save</BaseButton>
  
  <!-- Disabled -->
  <BaseButton variant="primary" :disabled="!isValid">Submit</BaseButton>
</template>
```

#### Decision Tree for Button Variants

```
What does this button do?
├─ Creates/Saves/Starts something → variant="primary"
├─ Cancels/Closes/Goes back → variant="secondary"
├─ Deletes/Removes permanently → variant="danger"
└─ Minor action (Edit/View/Expand) → variant="ghost"
```

### 2. Standardize Form Inputs

#### Find These Patterns

```vue
<!-- Pattern 1: No focus styling -->
<input class="border rounded px-3 py-2" />

<!-- Pattern 2: Custom focus colors -->
<input class="border focus:border-blue-500 focus:ring-blue-500" />

<!-- Pattern 3: Inconsistent styling -->
<input class="form-control" />
```

#### Replace With Standard Pattern

```vue
<!-- Text Input -->
<input
  v-model="value"
  type="text"
  class="block w-full rounded-md border-gray-300 shadow-sm text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 sm:text-sm"
  placeholder="Enter value"
/>

<!-- Select -->
<select
  v-model="value"
  class="block w-full rounded-md border-gray-300 shadow-sm text-gray-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 sm:text-sm"
>
  <option>Option 1</option>
</select>

<!-- Textarea -->
<textarea
  v-model="value"
  rows="4"
  class="block w-full rounded-md border-gray-300 shadow-sm text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 sm:text-sm"
></textarea>

<!-- Checkbox -->
<input
  v-model="checked"
  type="checkbox"
  class="rounded border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
/>

<!-- Radio -->
<input
  v-model="selected"
  type="radio"
  value="option1"
  class="border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
/>
```

#### Create Reusable Input Components (Recommended)

```vue
<!-- src/components/base/FormInput.vue -->
<script setup lang="ts">
interface Props {
  modelValue: string | number
  type?: string
  placeholder?: string
  disabled?: boolean
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text'
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()
</script>

<template>
  <div>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="[
        'block w-full rounded-md shadow-sm text-gray-900 placeholder-gray-400 sm:text-sm',
        error
          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
          : 'border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500',
        disabled ? 'bg-gray-50 text-gray-500' : ''
      ]"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <p v-if="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
  </div>
</template>
```

### 3. Update Selection Buttons

#### Find These Patterns

```vue
<!-- Pattern: Toggle button groups -->
<button
  v-for="option in options"
  :class="selected === option ? 'bg-teal-600' : 'bg-gray-200'"
>
  {{ option }}
</button>
```

#### Replace With Standard Pattern

```vue
<button
  v-for="option in options"
  :key="option.value"
  type="button"
  :class="[
    'px-4 py-2 rounded-md text-sm font-medium border transition-all duration-150',
    selected === option.value
      ? 'bg-teal-600 text-white border-teal-600 ring-2 ring-teal-500 ring-offset-1'
      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
  ]"
  @click="selected = option.value"
>
  {{ option.label }}
</button>
```

### 4. Update Status Indicators

#### Find These Patterns

```vue
<!-- Pattern 1: Inline badges -->
<span class="bg-green-100 text-green-800 px-2 py-1 rounded">Success</span>

<!-- Pattern 2: Conditional styling -->
<span :class="status === 'running' ? 'text-blue-600' : 'text-gray-600'">
  {{ status }}
</span>
```

#### Replace With StatusBadge

```vue
<script setup lang="ts">
import StatusBadge from '@/components/base/StatusBadge.vue'
</script>

<template>
  <!-- Basic usage -->
  <StatusBadge :status="stream.status" />
  
  <!-- Custom text -->
  <StatusBadge status="finished">Completed Successfully</StatusBadge>
  
  <!-- Different sizes -->
  <StatusBadge :status="stream.status" size="sm" />
</template>
```

#### Status Mapping

Map your existing statuses to the standard ones:

```typescript
// Old → New
'active'       → 'running'
'success'      → 'finished'
'error'        → 'failed'
'waiting'      → 'pending'
'stopped'      → 'paused'
'loading'      → 'initializing'
```

### 5. Update Navigation

#### Tabs

```vue
<!-- Before -->
<button :class="activeTab === 'config' ? 'text-teal-600 border-b-2' : 'text-gray-600'">
  Configuration
</button>

<!-- After -->
<button
  :class="[
    'px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-150',
    activeTab === 'config'
      ? 'text-teal-600 border-teal-600'
      : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
  ]"
  @click="activeTab = 'config'"
>
  Configuration
</button>
```

#### Sidebar Navigation

```vue
<!-- Before -->
<a href="/connections" :class="isActive ? 'bg-teal-100' : ''">
  Connections
</a>

<!-- After -->
<a
  href="/connections"
  :class="[
    'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150',
    isActive
      ? 'text-teal-700 bg-teal-50 border-l-4 border-teal-600'
      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
  ]"
>
  <Icon />
  Connections
</a>
```

---

## Common Scenarios

### Scenario 1: Modal with Actions

```vue
<!-- Before -->
<template>
  <div class="modal">
    <h2>Delete Connection?</h2>
    <p>This action cannot be undone.</p>
    <div class="buttons">
      <button class="cancel-btn">Cancel</button>
      <button class="delete-btn">Delete</button>
    </div>
  </div>
</template>

<!-- After -->
<script setup lang="ts">
import BaseButton from '@/components/base/BaseButton.vue'

const emit = defineEmits<{
  cancel: []
  confirm: []
}>()
</script>

<template>
  <div class="modal">
    <h2 class="text-lg font-medium text-gray-900">Delete Connection?</h2>
    <p class="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
    <div class="mt-6 flex justify-end gap-3">
      <BaseButton variant="secondary" @click="emit('cancel')">Cancel</BaseButton>
      <BaseButton variant="danger" @click="emit('confirm')">Delete</BaseButton>
    </div>
  </div>
</template>
```

### Scenario 2: Form with Validation

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'

const name = ref('')
const error = ref('')

const isValid = computed(() => name.value.length > 0)

const handleSubmit = () => {
  if (!isValid.value) {
    error.value = 'Name is required'
    return
  }
  // Submit logic
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <div>
      <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
      <input
        id="name"
        v-model="name"
        type="text"
        :class="[
          'mt-1 block w-full rounded-md shadow-sm text-gray-900 placeholder-gray-400 sm:text-sm',
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500'
        ]"
        placeholder="Enter connection name"
      />
      <p v-if="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
    </div>

    <div class="mt-6 flex justify-end gap-3">
      <BaseButton variant="secondary" type="button">Cancel</BaseButton>
      <BaseButton variant="primary" type="submit" :disabled="!isValid">Save</BaseButton>
    </div>
  </form>
</template>
```

### Scenario 3: Stream Monitor

```vue
<script setup lang="ts">
import BaseButton from '@/components/base/BaseButton.vue'
import StatusBadge from '@/components/base/StatusBadge.vue'

const stream = ref({
  name: 'mysql_to_postgres',
  status: 'running',
  progress: 65
})

const handlePause = () => {
  stream.value.status = 'paused'
}

const handleStop = () => {
  // Show confirmation modal
}
</script>

<template>
  <div class="stream-monitor">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-medium text-gray-900">{{ stream.name }}</h3>
        <StatusBadge :status="stream.status" class="mt-2" />
      </div>
      <div class="flex gap-2">
        <BaseButton variant="secondary" @click="handlePause">Pause</BaseButton>
        <BaseButton variant="danger" @click="handleStop">Stop</BaseButton>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="mt-4">
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div
          class="bg-teal-600 h-2 rounded-full transition-all duration-300"
          :style="{ width: `${stream.progress}%` }"
        ></div>
      </div>
      <p class="mt-1 text-sm text-gray-600">{{ stream.progress }}% complete</p>
    </div>
  </div>
</template>
```

---

## Testing Checklist

After migration, verify:
- [ ] All buttons have consistent hover states
- [ ] All form inputs have teal focus rings
- [ ] Primary actions are visually distinct (teal background)
- [ ] Secondary actions are clearly secondary (white/gray)
- [ ] Status indicators use semantic colors
- [ ] No orphaned custom CSS classes
- [ ] Disabled states work correctly
- [ ] Keyboard navigation works (focus visible)
- [ ] Colors pass WCAG AA contrast requirements

---

## Gradual Migration Strategy

Don't try to migrate everything at once. Follow this order:

### Week 1: Critical Paths
1. Connection creation wizard
2. Stream configuration wizard
3. Main action buttons (Create, Save, Start)

### Week 2: Common Components
1. All modal dialogs
2. Form components
3. Navigation (tabs, sidebar)

### Week 3: Data Views
1. Table actions
2. Status indicators
3. Data explorer

### Week 4: Polish
1. Edge cases
2. Less-used pages
3. Admin sections

---

## Before You Commit

Run this checklist:
- [ ] No console errors
- [ ] All buttons have proper variants
- [ ] All inputs have teal focus rings
- [ ] No hardcoded colors (use Tailwind classes)
- [ ] Component passes linting
- [ ] Test in Chrome, Firefox, Safari
- [ ] Test keyboard navigation
- [ ] Update any related tests

---

## Get Help

- **Design Questions:** See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
- **Quick Lookup:** See [DESIGN_QUICK_REFERENCE.md](./DESIGN_QUICK_REFERENCE.md)
- **Examples:** Check [src/components/base/](./src/components/base/)
- **Implementation:** See [DESIGN_IMPLEMENTATION_SUMMARY.md](./DESIGN_IMPLEMENTATION_SUMMARY.md)

Remember: **Consistency over perfection.** It's better to follow the standard pattern imperfectly than to create a new custom solution.
