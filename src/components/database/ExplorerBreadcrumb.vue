<script setup lang="ts">
type ObjectType = 'table' | 'view'

const props = defineProps<{
  database?: string | null
  schema?: string | null
  type?: ObjectType | null
  name?: string | null
}>()

const emit = defineEmits<{
  (e: 'navigate', payload: { level: 'database' | 'schema' | 'type' | 'name' }): void
}>()

function labelForType(t: ObjectType | null | undefined) {
  if (!t) return ''
  return t === 'table' ? 'Tables' : 'Views'
}
</script>

<template>
  <nav aria-label="Breadcrumb" class="text-sm">
    <ol class="flex items-center gap-2 text-gray-600">
      <li v-if="props.database" class="inline-flex items-center gap-2">
        <button
          class="text-gray-700 font-medium hover:underline"
          @click="emit('navigate', { level: 'database' })"
        >
          {{ props.database }}
        </button>
      </li>
      <li v-if="props.schema" class="inline-flex items-center gap-2">
        <span class="text-gray-400">/</span>
        <button
          class="text-gray-700 font-medium hover:underline"
          @click="emit('navigate', { level: 'schema' })"
        >
          {{ props.schema }}
        </button>
      </li>
      <li v-if="props.type" class="inline-flex items-center gap-2">
        <span class="text-gray-400">/</span>
        <button class="text-gray-700 hover:underline" @click="emit('navigate', { level: 'type' })">
          {{ labelForType(props.type) }}
        </button>
      </li>
      <li v-if="props.name" class="inline-flex items-center gap-2">
        <span class="text-gray-400">/</span>
        <span class="text-gray-900 font-medium">{{ props.name }}</span>
      </li>
    </ol>
  </nav>
</template>
