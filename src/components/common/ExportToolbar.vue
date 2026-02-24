<template>
  <div class="flex items-center gap-1.5">
    <!-- Primary buttons (adaptive count controlled by parent) -->
    <button
      v-for="format in visiblePrimaryFormats"
      :key="format.id"
      class="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="disabled"
      :title="`Export current page as ${format.label}`"
      @click="handleExport(format.id)"
    >
      <Download class="h-3.5 w-3.5 mr-1" />
      {{ format.label }}
    </button>

    <!-- More Formats Dropdown -->
    <div ref="triggerRef" class="relative">
      <button
        class="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="disabled"
        title="More export formats"
        @click="toggleMenu"
      >
        <MoreHorizontal class="h-3.5 w-3.5" />
      </button>

      <!-- Dropdown Menu (teleported to body to escape overflow-hidden parents) -->
      <Teleport to="body">
        <div
          v-if="showExportMenu"
          ref="menuRef"
          class="fixed w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50"
          :style="menuStyle"
          @mouseleave="showExportMenu = false"
        >
          <!-- Current Page Export Section -->
          <div
            class="px-3 py-1.5 text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700"
          >
            Current Page
          </div>
          <button
            v-for="format in allFormats"
            :key="format.id"
            class="w-full px-3 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            @click="handleExport(format.id)"
          >
            {{ format.label }}
          </button>

          <!-- Stream Export Section (Full Table) -->
          <template v-if="showStreamExport">
            <div
              class="px-3 py-1.5 text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider border-t border-b border-gray-200 dark:border-gray-700"
            >
              Full Table (via Stream)
            </div>
            <button
              v-for="format in streamExportFormats"
              :key="`stream-${format.id}`"
              class="w-full px-3 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              :disabled="isExporting"
              @click="handleStreamExport(format.id)"
            >
              <CloudUpload v-if="!isExporting" class="h-3.5 w-3.5 text-teal-500" />
              <Loader2 v-else class="animate-spin h-3.5 w-3.5 text-teal-500" />
              {{ format.label }}
            </button>
          </template>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { CloudUpload, Download, Loader2, MoreHorizontal } from 'lucide-vue-next'
import {
  allExportFormats,
  primaryExportFormats,
  type ExportFormat
} from '@/composables/useDataExport'
import type { StreamExportFormat } from '@/composables/useStreamExport'

const props = defineProps<{
  /** Whether export buttons are disabled (e.g., no data) */
  disabled?: boolean
  /** Whether to show stream export options for full table export */
  showStreamExport?: boolean
  /** Whether a stream export is in progress */
  isExporting?: boolean
  /** Maximum number of primary export buttons to show (0-3) */
  primaryCount?: number
}>()

const emit = defineEmits<{
  export: [format: ExportFormat]
  streamExport: [format: StreamExportFormat]
}>()

const showExportMenu = ref(false)
const allFormats = allExportFormats
const triggerRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const menuStyle = ref<Record<string, string>>({})

function updateMenuPosition() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  menuStyle.value = {
    top: `${rect.bottom + 4}px`,
    left: `${rect.right - 192}px` // 192px = w-48
  }
}

async function toggleMenu() {
  showExportMenu.value = !showExportMenu.value
  if (showExportMenu.value) {
    await nextTick()
    updateMenuPosition()
  }
}

function onClickOutside(e: MouseEvent) {
  if (!showExportMenu.value) return
  const target = e.target as Node
  if (triggerRef.value?.contains(target) || menuRef.value?.contains(target)) return
  showExportMenu.value = false
}

onMounted(() => {
  document.addEventListener('click', onClickOutside, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside, true)
})

const normalizedPrimaryCount = computed(() => {
  const raw = props.primaryCount ?? primaryExportFormats.length
  return Math.max(0, Math.min(primaryExportFormats.length, raw))
})

const visiblePrimaryFormats = computed(() =>
  primaryExportFormats.slice(0, normalizedPrimaryCount.value)
)

// Stream export formats (server-side processing)
const streamExportFormats: { id: StreamExportFormat; label: string }[] = [
  { id: 'csv', label: 'CSV' },
  { id: 'jsonl', label: 'JSONL' },
  { id: 'parquet', label: 'Parquet' }
]

function handleExport(format: ExportFormat) {
  showExportMenu.value = false
  emit('export', format)
}

function handleStreamExport(format: StreamExportFormat) {
  if (props.isExporting) return
  showExportMenu.value = false
  emit('streamExport', format)
}
</script>
