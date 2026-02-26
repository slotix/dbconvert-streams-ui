<template>
  <div class="json-config-editor">
    <div class="flex items-center justify-between mb-3">
      <button class="flex items-center gap-2 group" @click="isCollapsed = !isCollapsed">
        <component
          :is="isCollapsed ? ChevronRight : ChevronDown"
          class="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors"
        />
        <span
          class="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 dark:text-teal-400"
        >
          <SquarePen class="h-4 w-4" />
          {{ title }}
          <span v-if="isDirty" class="text-amber-500">*</span>
        </span>
      </button>

      <div v-show="!isCollapsed" class="flex items-center gap-2">
        <button
          v-tooltip="'Find in configuration (Ctrl+F)'"
          class="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          @click="openSearch"
        >
          <Search class="h-4 w-4" />
        </button>
        <button
          v-tooltip="'Copy configuration'"
          class="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          @click="copyConfig"
        >
          <Clipboard class="h-4 w-4" />
        </button>
        <button
          v-tooltip="'Revert changes'"
          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
          :disabled="!isDirty"
          :class="{ 'opacity-50 cursor-not-allowed': !isDirty }"
          @click="handleRevert"
        >
          <Undo class="h-4 w-4" />
          Revert
        </button>
        <button
          v-tooltip="'Format JSON (Ctrl+Shift+F)'"
          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
          @click="formatJson"
        >
          <Code class="h-4 w-4" />
          Format
        </button>
        <button
          v-tooltip="validationErrors.length > 0 ? 'Fix errors before saving' : 'Save changes'"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 rounded-md transition-colors"
          :disabled="!isDirty || validationErrors.length > 0 || isSaving"
          :class="{
            'opacity-50 cursor-not-allowed': !isDirty || validationErrors.length > 0 || isSaving
          }"
          @click="handleSave"
        >
          <template v-if="isSaving">
            <Loader2 class="animate-spin h-4 w-4" />
            Saving...
          </template>
          <template v-else>
            <Check class="h-4 w-4" />
            Save
          </template>
        </button>
      </div>
    </div>

    <div
      v-show="!isCollapsed"
      class="rounded-lg border overflow-hidden transition-colors border-gray-300 dark:border-gray-700"
    >
      <JsonCodeMirror
        ref="editorRef"
        v-model="editorContent"
        :height="height"
        @save-shortcut="handleSaveShortcut"
        @format-shortcut="formatJson"
      />
    </div>

    <div
      v-if="validationErrors.length > 0"
      v-show="!isCollapsed"
      class="mt-3 p-3 bg-red-50 dark:bg-red-950/35 border border-red-200 dark:border-red-700/70 rounded-lg"
    >
      <h4 class="text-sm font-medium text-red-800 dark:text-red-200 mb-2 flex items-center gap-1.5">
        <AlertTriangle class="h-4 w-4" />
        Validation Errors ({{ validationErrors.length }})
      </h4>
      <ul class="space-y-1">
        <li
          v-for="(error, index) in validationErrors"
          :key="index"
          class="text-sm text-red-700 dark:text-red-200/90 cursor-pointer hover:underline hover:text-red-800 dark:hover:text-red-100"
          @click="jumpToError(error)"
        >
          <span v-if="error.path" class="font-mono">{{ error.path }}:</span>
          {{ error.message }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import { vTooltip } from '@/directives/tooltip'

export default {
  directives: {
    tooltip: vTooltip
  }
}
</script>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, onMounted } from 'vue'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Code,
  Loader2,
  Search,
  SquarePen,
  Undo
} from 'lucide-vue-next'
import { useCommonStore } from '@/stores/common'
import { debounce } from '@/utils/debounce'
import JsonCodeMirror from '@/components/codemirror/JsonCodeMirror.vue'

export interface ValidationError {
  path: string
  message: string
  line?: number
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  parsed?: unknown
}

interface Props {
  config: Record<string, unknown>
  title?: string
  height?: string
  defaultCollapsed?: boolean
  validator?: (content: string, original: Record<string, unknown>) => ValidationResult
}

const props = withDefaults(defineProps<Props>(), {
  title: 'JSON Editor',
  height: '500px',
  defaultCollapsed: false,
  validator: undefined
})

const isCollapsed = ref(props.defaultCollapsed)

const emit = defineEmits<{
  (e: 'save', config: Record<string, unknown>): void
}>()

const commonStore = useCommonStore()
const editorRef = ref<InstanceType<typeof JsonCodeMirror> | null>(null)

const isSaving = ref(false)
const originalContent = ref('')
const editorContent = ref('')
const validationErrors = ref<ValidationError[]>([])

const initializeContent = () => {
  const content = JSON.stringify(props.config, null, 2)
  originalContent.value = content
  editorContent.value = content
  validationErrors.value = []
}

watch(
  () => props.config,
  (newConfig, oldConfig) => {
    const newId = (newConfig as Record<string, unknown>)?.id
    const oldId = (oldConfig as Record<string, unknown>)?.id
    if (newId !== oldId || !isDirty.value) {
      initializeContent()
    }
  },
  { deep: true }
)

onMounted(() => {
  initializeContent()
})

const isDirty = computed(() => editorContent.value !== originalContent.value)

const defaultValidate = (content: string): ValidationResult => {
  try {
    const parsed = JSON.parse(content)
    return { valid: true, errors: [], parsed }
  } catch (e) {
    const error = e as SyntaxError
    return {
      valid: false,
      errors: [{ path: '', message: `Invalid JSON: ${error.message}` }]
    }
  }
}

const debouncedValidate = debounce(() => {
  const validateFn = props.validator || defaultValidate
  const result = validateFn(editorContent.value, props.config)
  validationErrors.value = normalizeValidationErrors(result.errors)
}, 500)

watch(editorContent, () => {
  debouncedValidate()
})

const copyConfig = async () => {
  try {
    await navigator.clipboard.writeText(editorContent.value)
    commonStore.showNotification('Configuration copied to clipboard', 'success')
  } catch {
    commonStore.showNotification('Failed to copy configuration', 'error')
  }
}

const openSearch = () => {
  editorRef.value?.openSearch()
}

const formatJson = () => {
  try {
    const parsed = JSON.parse(editorContent.value)
    editorContent.value = JSON.stringify(parsed, null, 2)
    commonStore.showNotification('JSON formatted', 'success')
  } catch (e) {
    const error = e as SyntaxError
    commonStore.showNotification(`Format failed: ${error.message}`, 'error')
  }
}

const handleRevert = () => {
  editorContent.value = originalContent.value
  validationErrors.value = []
}

const handleSave = async () => {
  if (validationErrors.value.length > 0) {
    commonStore.showNotification('Please fix validation errors before saving', 'error')
    return
  }

  const validateFn = props.validator || defaultValidate
  const result = validateFn(editorContent.value, props.config)
  if (!result.valid) {
    validationErrors.value = normalizeValidationErrors(result.errors)
    commonStore.showNotification('Configuration has validation errors', 'error')
    return
  }

  isSaving.value = true

  try {
    const updatedConfig = result.parsed as Record<string, unknown>
    emit('save', updatedConfig)
  } catch {
    commonStore.showNotification('Failed to save configuration', 'error')
    isSaving.value = false
  }
}

const findLineForPath = (jsonString: string, path: string): number | undefined => {
  if (!path) return 1

  const lines = jsonString.split('\n')
  const pathParts = path
    .split('.')
    .flatMap((p) => p.replace(/\[(\d+)\]/g, '.$1').split('.'))
    .filter(Boolean)

  let searchKey = pathParts[pathParts.length - 1]

  if (/^\d+$/.test(searchKey) && pathParts.length > 1) {
    searchKey = pathParts[pathParts.length - 2]
  }

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`"${searchKey}"`)) {
      return i + 1
    }
  }

  return 1
}

const normalizeValidationErrors = (errors: ValidationError[]): ValidationError[] => {
  return errors.map((error) => {
    if (error.path) {
      return error
    }

    if (!error.message.startsWith('Invalid JSON:')) {
      return error
    }

    const hint = editorRef.value?.getLikelySyntaxIssueHint()
    if (!hint || error.message.includes(hint)) {
      return error
    }

    return {
      ...error,
      message: `${error.message} ${hint}`
    }
  })
}

const jumpToError = (error: ValidationError) => {
  if (!editorRef.value) return

  if (!error.path && !error.line) {
    const syntaxOffset = editorRef.value.getFirstSyntaxErrorOffset()
    if (syntaxOffset !== undefined) {
      editorRef.value.focusOffset(syntaxOffset)
      return
    }
  }

  const line =
    error.line || (error.path ? findLineForPath(editorContent.value, error.path) : undefined)

  if (!line) {
    editorRef.value.focus()
    return
  }
  editorRef.value.focusLine(line)
}

const handleSaveShortcut = () => {
  if (isDirty.value && validationErrors.value.length === 0 && !isSaving.value) {
    void handleSave()
  }
}

const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (isDirty.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', handleBeforeUnload)
}

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }
})

const onSaveSuccess = () => {
  originalContent.value = editorContent.value
  isSaving.value = false
  commonStore.showNotification('Configuration saved successfully', 'success')
}

const onSaveError = (message: string) => {
  isSaving.value = false
  commonStore.showNotification(message || 'Failed to save configuration', 'error')
}

defineExpose({
  onSaveSuccess,
  onSaveError,
  isDirty
})
</script>
