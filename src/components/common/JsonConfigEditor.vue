<template>
  <div class="json-config-editor">
    <!-- Header with buttons -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <span
          class="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 dark:text-teal-400"
        >
          <SquarePen class="h-4 w-4" />
          {{ title }}
          <span v-if="isDirty" class="text-amber-500">*</span>
        </span>
      </div>

      <div class="flex items-center gap-2">
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

    <!-- Editor container -->
    <div
      class="rounded-lg border overflow-hidden transition-colors border-teal-500 dark:border-teal-400"
    >
      <MonacoEditor
        ref="editorRef"
        v-model="editorContent"
        language="json"
        :height="height"
        :read-only="false"
        :options="editorOptions"
        @mount="handleEditorMount"
      />
    </div>

    <!-- Validation errors panel -->
    <div
      v-if="validationErrors.length > 0"
      class="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
    >
      <h4 class="text-sm font-medium text-red-800 dark:text-red-300 mb-2 flex items-center gap-1.5">
        <AlertTriangle class="h-4 w-4" />
        Validation Errors ({{ validationErrors.length }})
      </h4>
      <ul class="space-y-1">
        <li
          v-for="(error, index) in validationErrors"
          :key="index"
          class="text-sm text-red-700 dark:text-red-400 cursor-pointer hover:underline"
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
import { AlertTriangle, Check, Clipboard, Code, Loader2, SquarePen, Undo } from 'lucide-vue-next'
import MonacoEditor from '@/components/monaco/MonacoEditor.vue'
import { useCommonStore } from '@/stores/common'
import { debounce } from '@/utils/debounce'

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
  validator?: (content: string, original: Record<string, unknown>) => ValidationResult
}

const props = withDefaults(defineProps<Props>(), {
  title: 'JSON Editor',
  height: '500px',
  validator: undefined
})

const emit = defineEmits<{
  (e: 'save', config: Record<string, unknown>): void
}>()

const commonStore = useCommonStore()
const editorRef = ref<InstanceType<typeof MonacoEditor>>()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const monacoInstance = ref<any>(null)

// State
const isSaving = ref(false)
const originalContent = ref('')
const editorContent = ref('')
const validationErrors = ref<ValidationError[]>([])

// Initialize content from props
const initializeContent = () => {
  const content = JSON.stringify(props.config, null, 2)
  originalContent.value = content
  editorContent.value = content
  validationErrors.value = []
}

// Watch for config changes (e.g., after external update)
watch(
  () => props.config,
  (newConfig, oldConfig) => {
    // Only reinitialize if the config ID changed or if we're not dirty
    const newId = (newConfig as Record<string, unknown>)?.id
    const oldId = (oldConfig as Record<string, unknown>)?.id
    if (newId !== oldId || !isDirty.value) {
      initializeContent()
    }
  },
  { deep: true }
)

// Initialize on mount
onMounted(() => {
  initializeContent()
})

// Computed
const isDirty = computed(() => {
  return editorContent.value !== originalContent.value
})

// Default JSON validation
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

// Debounced validation
const debouncedValidate = debounce(() => {
  const validateFn = props.validator || defaultValidate
  const result = validateFn(editorContent.value, props.config)
  validationErrors.value = result.errors
}, 500)

// Watch editor content for validation
watch(editorContent, () => {
  debouncedValidate()
})

// Monaco editor options - always editable
const editorOptions = computed<Record<string, unknown>>(() => ({
  minimap: { enabled: true },
  scrollBeyondLastLine: false,
  fontSize: 13,
  lineNumbers: 'on',
  glyphMargin: true,
  folding: true,
  lineDecorationsWidth: 5,
  lineNumbersMinChars: 3,
  renderLineHighlight: 'line',
  scrollbar: {
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
    useShadows: false
  },
  wordWrap: 'on',
  contextmenu: true,
  quickSuggestions: true,
  formatOnPaste: true,
  autoClosingBrackets: 'always',
  autoClosingQuotes: 'always'
}))

// Methods
const handleEditorMount = (editor: unknown, monaco: unknown) => {
  monacoInstance.value = monaco

  const ed = editor as {
    addCommand: (keybinding: number, handler: () => void) => void
  }
  const mon = monaco as {
    KeyMod: { CtrlCmd: number; Shift: number }
    KeyCode: { KeyF: number; KeyS: number }
  }

  // Add keyboard shortcut for format (Ctrl+Shift+F)
  ed.addCommand(mon.KeyMod.CtrlCmd | mon.KeyMod.Shift | mon.KeyCode.KeyF, () => {
    formatJson()
  })

  // Add keyboard shortcut for save (Ctrl+S)
  ed.addCommand(mon.KeyMod.CtrlCmd | mon.KeyCode.KeyS, () => {
    if (isDirty.value && validationErrors.value.length === 0) {
      handleSave()
    }
  })
}

const copyConfig = () => {
  navigator.clipboard.writeText(editorContent.value)
  commonStore.showNotification('Configuration copied to clipboard', 'success')
}

const formatJson = () => {
  const editor = editorRef.value?.editor
  if (editor) {
    const ed = editor as {
      getAction: (id: string) => { run: () => void } | null
    }
    ed.getAction('editor.action.formatDocument')?.run()
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

  // Final validation before save
  const validateFn = props.validator || defaultValidate
  const result = validateFn(editorContent.value, props.config)
  if (!result.valid) {
    validationErrors.value = result.errors
    commonStore.showNotification('Configuration has validation errors', 'error')
    return
  }

  isSaving.value = true

  try {
    const updatedConfig = result.parsed as Record<string, unknown>
    emit('save', updatedConfig)
    // Parent will handle API call and call onSaveSuccess/onSaveError
  } catch (error) {
    commonStore.showNotification('Failed to save configuration', 'error')
    isSaving.value = false
  }
}

// Find line for path helper
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

const jumpToError = (error: ValidationError) => {
  const editor = editorRef.value?.editor
  if (editor && error.path) {
    const line = findLineForPath(editorContent.value, error.path)
    if (line) {
      const ed = editor as {
        revealLineInCenter: (line: number) => void
        setPosition: (position: { lineNumber: number; column: number }) => void
        focus: () => void
      }
      ed.revealLineInCenter(line)
      ed.setPosition({ lineNumber: line, column: 1 })
      ed.focus()
    }
  }
}

// Handle unsaved changes warning
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (isDirty.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

// Register beforeunload handler
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', handleBeforeUnload)
}

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }
})

// Called by parent after successful save
const onSaveSuccess = () => {
  originalContent.value = editorContent.value
  isSaving.value = false
  commonStore.showNotification('Configuration saved successfully', 'success')
}

// Called by parent on save error
const onSaveError = (message: string) => {
  isSaving.value = false
  commonStore.showNotification(message || 'Failed to save configuration', 'error')
}

// Expose methods for parent
defineExpose({
  onSaveSuccess,
  onSaveError,
  isDirty
})
</script>

<style scoped>
.json-config-editor {
  /* Component wrapper */
}
</style>
