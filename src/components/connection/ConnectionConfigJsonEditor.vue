<template>
  <JsonConfigEditor
    v-if="config"
    ref="editorRef"
    :config="config as unknown as Record<string, unknown>"
    :height="height"
    :default-collapsed="defaultCollapsed"
    title="Edit Connection JSON"
    :validator="validateConnection"
    @save="handleSave"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import JsonConfigEditor, { type ValidationResult } from '@/components/common/JsonConfigEditor.vue'
import { validateConnectionConfig } from '@/utils/ConnectionConfigValidator'
import type { Connection } from '@/types/connections'

defineProps<{
  config: Connection | null
  height?: string
  defaultCollapsed?: boolean
}>()

const emit = defineEmits<{
  (e: 'save', config: Connection): void
}>()

const editorRef = ref<InstanceType<typeof JsonConfigEditor>>()

function validateConnection(content: string, original: Record<string, unknown>): ValidationResult {
  // Parse the JSON content first
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch (e) {
    const error = e as SyntaxError
    return {
      valid: false,
      errors: [{ path: '', message: `Invalid JSON: ${error.message}` }]
    }
  }

  // Run connection-specific validation
  const result = validateConnectionConfig(parsed, original as unknown as Connection | undefined)

  return {
    valid: result.valid,
    errors: result.errors.map((e) => ({
      path: e.path,
      message: e.message,
      line: e.line
    })),
    parsed: result.valid ? parsed : undefined
  }
}

function handleSave(config: Record<string, unknown>) {
  emit('save', config as unknown as Connection)
}

/**
 * Called by parent component when save succeeds
 */
function onSaveSuccess() {
  editorRef.value?.onSaveSuccess()
}

/**
 * Called by parent component when save fails
 */
function onSaveError(message: string) {
  editorRef.value?.onSaveError(message)
}

defineExpose({
  onSaveSuccess,
  onSaveError
})
</script>
