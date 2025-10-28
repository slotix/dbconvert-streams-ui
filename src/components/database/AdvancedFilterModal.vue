<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { vHighlightjs } from '@/directives/highlightjs'

const props = defineProps<{
  isOpen: boolean
  currentWhereClause: string
}>()

const emit = defineEmits<{
  close: []
  apply: [whereClause: string]
}>()

const whereInput = ref<string>('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// Computed property for syntax highlighting display
const highlightedCode = computed(() => {
  // Add WHERE keyword for proper SQL highlighting
  return whereInput.value ? `WHERE ${whereInput.value}` : ''
})

// Watch for modal open and initialize with current WHERE clause
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      whereInput.value = props.currentWhereClause
    }
  },
  { immediate: true }
)

// Apply filter
function applyFilter() {
  emit('apply', whereInput.value.trim())
  emit('close')
}

// Clear filter
function clearFilter() {
  whereInput.value = ''
  emit('apply', '')
  emit('close')
}

// Handle ESC key to close modal
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click.self="emit('close')"
        @keydown="handleKeydown"
      >
        <div
          class="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 overflow-hidden"
          @click.stop
        >
          <!-- Modal Header -->
          <div
            class="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50"
          >
            <h3 class="text-lg font-semibold text-gray-900">Advanced Filter (SQL WHERE Clause)</h3>
            <button
              type="button"
              class="text-gray-400 hover:text-gray-600 transition-colors"
              @click="emit('close')"
            >
              <XMarkIcon class="h-6 w-6" />
            </button>
          </div>

          <!-- Modal Body -->
          <div class="px-6 py-6">
            <div class="space-y-4">
              <!-- Help text -->
              <div class="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-md p-3">
                <p class="font-medium text-blue-900 mb-1">Enter SQL WHERE conditions:</p>
                <ul class="list-disc list-inside space-y-1 text-blue-800">
                  <li>
                    Examples: <code class="text-xs bg-white px-1 py-0.5 rounded">amount > 5</code>,
                    <code class="text-xs bg-white px-1 py-0.5 rounded">customer_id = 1</code>
                  </li>
                  <li>
                    Combine conditions:
                    <code class="text-xs bg-white px-1 py-0.5 rounded"
                      >amount > 5 AND customer_id = 1</code
                    >
                  </li>
                  <li>
                    Use wildcards:
                    <code class="text-xs bg-white px-1 py-0.5 rounded">name LIKE '%John%'</code>
                  </li>
                  <li>This combines with AG Grid column filters using AND logic</li>
                </ul>
              </div>

              <!-- WHERE clause input with syntax highlighting -->
              <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700">
                  WHERE Clause
                  <span class="text-gray-500 font-normal">(without the WHERE keyword)</span>
                </label>
                <div class="relative">
                  <!-- Syntax highlighted background -->
                  <div
                    class="absolute inset-0 px-3 py-2 text-sm font-mono border border-gray-300 rounded-md pointer-events-none overflow-hidden"
                  >
                    <pre
                      v-if="highlightedCode"
                      v-highlightjs
                      class="whitespace-pre-wrap break-words m-0 p-0"
                    ><code class="language-sql">{{ highlightedCode }}</code></pre>
                    <span v-else class="text-gray-400">e.g., amount > 5 AND customer_id = 1</span>
                  </div>
                  <!-- Transparent textarea overlay -->
                  <textarea
                    ref="textareaRef"
                    v-model="whereInput"
                    rows="6"
                    class="relative w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-transparent caret-gray-900"
                    :class="{ 'text-transparent': whereInput }"
                    placeholder="e.g., amount > 5 AND customer_id = 1"
                    spellcheck="false"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="off"
                    @keydown.ctrl.enter="applyFilter"
                    @keydown.meta.enter="applyFilter"
                  />
                </div>
                <p class="text-xs text-gray-500">
                  Tip: Press
                  <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs"
                    >Ctrl+Enter</kbd
                  >
                  to apply
                </p>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div
            class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50"
          >
            <button
              v-if="whereInput.trim()"
              type="button"
              class="px-4 py-2 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              @click="clearFilter"
            >
              Clear Filter
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              @click="emit('close')"
            >
              Cancel
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              @click="applyFilter"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .bg-white,
.modal-leave-active .bg-white {
  transition: transform 0.2s ease;
}

.modal-enter-from .bg-white,
.modal-leave-to .bg-white {
  transform: scale(0.95);
}

kbd {
  font-family: ui-monospace, monospace;
}

/* Syntax highlighting overlay styles */
.text-transparent {
  color: transparent;
  -webkit-text-fill-color: transparent;
}

/* Ensure caret is visible */
.caret-gray-900 {
  caret-color: #111827;
}

/* SQL Syntax highlighting */
:deep(.hljs) {
  background: transparent;
  padding: 0;
  color: #24292e;
  display: inline;
}

:deep(.hljs-keyword) {
  color: #d73a49;
  font-weight: 600;
}

:deep(.hljs-string) {
  color: #032f62;
}

:deep(.hljs-number) {
  color: #005cc5;
}

:deep(.hljs-operator) {
  color: #d73a49;
}

:deep(.hljs-built_in) {
  color: #6f42c1;
}

:deep(.hljs-literal) {
  color: #005cc5;
}
</style>
