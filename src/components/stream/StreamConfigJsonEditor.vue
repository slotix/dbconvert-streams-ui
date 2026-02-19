<template>
  <JsonConfigEditor
    ref="editorRef"
    :config="config as unknown as Record<string, unknown>"
    :height="height"
    title="Stream Configuration"
    :validator="validateStreamConfig"
    @save="handleSave"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import JsonConfigEditor, { type ValidationResult } from '@/components/common/JsonConfigEditor.vue'
import { parseAndValidateStreamConfig } from '@/utils/StreamConfigValidator'
import type { StreamConfig } from '@/types/streamConfig'

interface Props {
  config: StreamConfig
  height?: string
}

withDefaults(defineProps<Props>(), {
  height: '600px'
})

const emit = defineEmits<{
  (e: 'save', config: StreamConfig): void
}>()

const editorRef = ref<InstanceType<typeof JsonConfigEditor>>()

function validateStreamConfig(
  content: string,
  original: Record<string, unknown>
): ValidationResult {
  const result = parseAndValidateStreamConfig(content, original as unknown as StreamConfig)

  return {
    valid: result.valid,
    errors: result.errors.map((e) => ({
      path: e.path,
      message: e.message,
      line: e.line
    })),
    parsed: result.valid ? result.parsed : undefined
  }
}

function handleSave(config: Record<string, unknown>) {
  emit('save', config as unknown as StreamConfig)
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
