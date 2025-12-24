<template>
  <div ref="editorContainer" class="monaco-editor-container" :style="{ height: height }"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, shallowRef, nextTick } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { initializeMonaco } from '@/utils/monaco-loader'

// Import Monaco types
import type * as MonacoTypes from 'monaco-editor'

type MonacoApi = typeof import('monaco-editor')

interface Props {
  modelValue?: string
  language?: string
  theme?: 'vs' | 'vs-dark' | 'hc-black' | 'hc-light'
  height?: string
  readOnly?: boolean
  options?: MonacoTypes.editor.IEditorOptions
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  language: 'plaintext',
  theme: undefined, // Auto-detect from theme store if undefined
  height: '400px',
  readOnly: false,
  options: () => ({})
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'mount', editor: MonacoTypes.editor.IStandaloneCodeEditor, monaco: MonacoApi): void
  (e: 'change', value: string): void
  (e: 'blur'): void
  (e: 'focus'): void
}>()

const editorContainer = ref<HTMLElement>()
const editor = shallowRef<MonacoTypes.editor.IStandaloneCodeEditor>()
const monaco = shallowRef<MonacoApi>()
const themeStore = useThemeStore()

// Get theme from props or theme store
const currentTheme = ref<string>(props.theme || (themeStore.isDark ? 'vs-dark' : 'vs'))

// Watch theme store changes
watch(
  () => themeStore.isDark,
  (isDark) => {
    if (!props.theme) {
      // Only auto-update if theme not explicitly set
      currentTheme.value = isDark ? 'vs-dark' : 'vs'
      // currentTheme.value = isDark ? 'hc-black' : 'hc-light'
      if (monaco.value) {
        monaco.value.editor.setTheme(currentTheme.value)
      }
    }
  }
)

// Watch manual theme changes
watch(
  () => props.theme,
  (newTheme) => {
    if (newTheme && monaco.value) {
      currentTheme.value = newTheme
      monaco.value.editor.setTheme(currentTheme.value)
    }
  }
)

// Watch model value changes from parent
watch(
  () => props.modelValue,
  (newValue) => {
    if (editor.value && newValue !== editor.value.getValue()) {
      editor.value.setValue(newValue || '')
    }
  }
)

// Watch language changes
watch(
  () => props.language,
  (newLang) => {
    if (editor.value && monaco.value) {
      const model = editor.value.getModel()
      if (model) {
        monaco.value.editor.setModelLanguage(model, newLang)
      }
    }
  }
)

// Watch options changes
watch(
  () => props.options,
  (newOptions) => {
    if (editor.value && newOptions) {
      editor.value.updateOptions(newOptions)
    }
  },
  { deep: true }
)

// Watch readOnly changes
watch(
  () => props.readOnly,
  (newReadOnly) => {
    if (editor.value) {
      editor.value.updateOptions({ readOnly: newReadOnly })
    }
  }
)

onMounted(async () => {
  // Wait for next tick to ensure DOM is fully rendered
  await nextTick()

  if (!editorContainer.value) return

  try {
    // Load Monaco using lazy loader (only loads workers on first use)
    const monacoInstance = (await initializeMonaco()) as MonacoApi
    monaco.value = monacoInstance

    // Check again after async operation - container might be gone if component unmounted
    if (!editorContainer.value) {
      console.warn('Monaco editor container no longer available after initialization')
      return
    }

    // Default editor options
    const defaultOptions: MonacoTypes.editor.IStandaloneEditorConstructionOptions = {
      value: props.modelValue,
      language: props.language,
      theme: currentTheme.value,
      readOnly: props.readOnly,
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineNumbers: 'on',
      renderLineHighlight: 'line',
      scrollbar: {
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10
      },
      ...props.options
    }

    // Create editor instance
    editor.value = monacoInstance.editor.create(editorContainer.value, defaultOptions)

    // Listen to content changes
    editor.value.onDidChangeModelContent(() => {
      const value = editor.value?.getValue() || ''
      emit('update:modelValue', value)
      emit('change', value)
    })

    // Listen to blur/focus events
    editor.value.onDidBlurEditorText(() => {
      emit('blur')
    })

    editor.value.onDidFocusEditorText(() => {
      emit('focus')
    })

    // Emit mount event with editor instance
    emit('mount', editor.value, monaco.value)
  } catch (error) {
    console.error('Failed to initialize Monaco Editor:', error)
  }
})

onBeforeUnmount(() => {
  editor.value?.dispose()
})

// Expose editor instance for parent components
defineExpose({
  editor,
  monaco
})
</script>

<style scoped>
.monaco-editor-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
