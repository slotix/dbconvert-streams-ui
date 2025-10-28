<template>
  <TransitionRoot :show="isOpen" as="template">
    <Dialog as="div" class="relative z-50" @close="closeModal">
      <TransitionChild
        as="template"
        enter="ease-out duration-300"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-200"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/40" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="ease-out duration-300"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="ease-in duration-200"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel
              class="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all"
            >
              <!-- Header -->
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mb-6">
                <div class="flex items-center justify-between">
                  <span>Select Folder</span>
                  <button
                    class="text-gray-400 hover:text-gray-600 focus:outline-none"
                    @click="closeModal"
                  >
                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </DialogTitle>

              <!-- Error Display -->
              <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p class="text-sm text-red-800">{{ error }}</p>
              </div>

              <!-- Quick Access Shortcuts -->
              <div v-if="roots.length > 0" class="mb-6">
                <h4 class="text-sm font-medium text-gray-700 mb-3">Quick Access</h4>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="root in roots"
                    :key="root"
                    class="px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    @click="navigateToPath(root)"
                  >
                    {{ getFolderDisplayName(root) }}
                  </button>
                </div>
              </div>

              <!-- Current Path Breadcrumb -->
              <div class="mb-4">
                <nav class="flex" aria-label="Breadcrumb">
                  <ol class="flex items-center space-x-2 text-sm">
                    <li
                      v-for="(segment, index) in pathSegments"
                      :key="index"
                      class="flex items-center"
                    >
                      <button
                        v-if="index < pathSegments.length - 1"
                        class="text-blue-600 hover:text-blue-800 focus:outline-none"
                        @click="navigateToSegment(index)"
                      >
                        {{ segment.name }}
                      </button>
                      <span v-else class="text-gray-700 font-medium">{{ segment.name }}</span>
                      <svg
                        v-if="index < pathSegments.length - 1"
                        class="h-4 w-4 text-gray-400 mx-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </li>
                  </ol>
                </nav>
              </div>

              <!-- Directory Contents -->
              <div class="mb-6">
                <div v-if="loading" class="flex justify-center py-8">
                  <Spinner size="sm" text="Loading..." />
                </div>
                <div v-else-if="entries.length === 0" class="text-center py-8 text-gray-500">
                  This folder is empty
                </div>
                <div v-else class="border border-gray-200 rounded-md max-h-96 overflow-y-auto">
                  <div
                    v-for="entry in sortedEntries"
                    :key="entry.path"
                    class="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    :class="{ 'bg-blue-50': selectedPath === entry.path }"
                    @click="selectEntry(entry)"
                    @dblclick="entry.type === 'dir' ? navigateToPath(entry.path) : null"
                  >
                    <!-- Icon -->
                    <div class="flex-shrink-0 mr-3">
                      <svg
                        v-if="entry.type === 'dir'"
                        class="h-5 w-5 text-blue-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z"
                        />
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M8 5a2 2 0 012-2h2a2 2 0 012 2v2H8V5z"
                        />
                      </svg>
                      <svg
                        v-else
                        class="h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>

                    <!-- Name and Size -->
                    <div class="flex-grow min-w-0">
                      <p class="text-sm font-medium text-gray-900 truncate">{{ entry.name }}</p>
                      <p v-if="entry.type === 'file' && entry.size" class="text-xs text-gray-500">
                        {{ formatFileSize(entry.size) }}
                      </p>
                    </div>

                    <!-- Selection indicator -->
                    <div v-if="selectedPath === entry.path" class="flex-shrink-0 ml-2">
                      <svg class="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fill-rule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Selected Path Display -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 mb-2">Selected Path</label>
                <div class="relative">
                  <input
                    v-model="selectedPath"
                    type="text"
                    class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    :class="{ 'bg-gray-50': !manualPathEdit }"
                    :readonly="!manualPathEdit"
                    placeholder="No folder selected"
                  />
                  <button
                    class="absolute right-2 top-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    @click="toggleManualPathEdit"
                  >
                    <svg
                      v-if="manualPathEdit"
                      class="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <svg
                      v-else
                      class="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Footer Actions -->
              <div class="flex justify-between items-center">
                <button
                  v-if="currentPath !== initialPath"
                  class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  @click="goUp"
                >
                  <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  Go Up
                </button>
                <div v-else></div>

                <div class="flex space-x-3">
                  <button
                    class="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    @click="closeModal"
                  >
                    Cancel
                  </button>
                  <button
                    :disabled="!selectedPath || validating"
                    class="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    @click="confirmSelection"
                  >
                    <Spinner v-if="validating" size="sm" class="mr-2" />
                    {{ validating ? 'Validating...' : 'Select Folder' }}
                  </button>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { listDirectory, checkWritable, getRoots, type FileSystemEntry } from '@/api/fileSystem'
import Spinner from './Spinner.vue'
import FileIcon from './FileIcon.vue'
import { useContextualIconSizes } from '@/composables/useIconSizes'

interface Props {
  isOpen: boolean
  initialPath?: string
}

interface Emits {
  (e: 'update:isOpen', value: boolean): void
  (e: 'select', path: string): void
}

const props = withDefaults(defineProps<Props>(), {
  initialPath: ''
})

const emit = defineEmits<Emits>()

// Icon sizes
const iconSizes = useContextualIconSizes()

// Reactive state
const loading = ref(false)
const error = ref('')
const entries = ref<FileSystemEntry[]>([])
const roots = ref<string[]>([])
const currentPath = ref('')
const selectedPath = ref('')
const validating = ref(false)
const manualPathEdit = ref(false)

// Computed properties
const pathSegments = computed(() => {
  if (!currentPath.value) return []

  const path = currentPath.value
  const segments: { name: string; path: string }[] = []

  // Handle Windows drive roots
  if (path.match(/^[A-Za-z]:\\/)) {
    const drive = path.substring(0, 3)
    segments.push({ name: drive, path: drive })

    const remaining = path.substring(3)
    if (remaining) {
      const parts = remaining.split(/[/\\]/).filter((part) => part)
      for (let i = 0; i < parts.length; i++) {
        const segmentPath = drive + parts.slice(0, i + 1).join('\\')
        segments.push({ name: parts[i], path: segmentPath })
      }
    }
  } else {
    // Unix-style paths
    const parts = path.split('/').filter((part) => part)
    segments.push({ name: '/', path: '/' })

    for (let i = 0; i < parts.length; i++) {
      const segmentPath = '/' + parts.slice(0, i + 1).join('/')
      segments.push({ name: parts[i], path: segmentPath })
    }
  }

  return segments
})

const sortedEntries = computed(() => {
  return [...entries.value].sort((a, b) => {
    // Directories first, then files
    if (a.type !== b.type) {
      return a.type === 'dir' ? -1 : 1
    }
    // Then alphabetical
    return a.name.localeCompare(b.name, undefined, { numeric: true })
  })
})

// Methods
const closeModal = () => {
  emit('update:isOpen', false)
  // Reset state when closing
  error.value = ''
  entries.value = []
  selectedPath.value = ''
  manualPathEdit.value = false
}

const loadRoots = async () => {
  try {
    roots.value = await getRoots()
  } catch (err) {
    console.error('Failed to load roots:', err)
  }
}

const loadDirectory = async (path: string) => {
  loading.value = true
  error.value = ''

  try {
    // listDirectory handles empty/undefined path by defaulting to home directory
    const response = await listDirectory(path || undefined)

    currentPath.value = response.path
    entries.value = Array.isArray(response.entries) ? response.entries : []

    // Auto-select current directory if no selection
    if (!selectedPath.value) {
      selectedPath.value = currentPath.value
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to load directory'
    entries.value = []
  } finally {
    loading.value = false
  }
}

const navigateToPath = (path: string) => {
  selectedPath.value = path
  loadDirectory(path)
}

const navigateToSegment = (index: number) => {
  const segment = pathSegments.value[index]
  if (segment) {
    navigateToPath(segment.path)
  }
}

const selectEntry = (entry: FileSystemEntry) => {
  if (entry.type === 'dir') {
    selectedPath.value = entry.path
  }
}

const goUp = () => {
  const parent = getParentPath(currentPath.value)
  if (parent) {
    navigateToPath(parent)
  }
}

const getParentPath = (path: string): string => {
  if (!path || path === '/' || path.match(/^[A-Za-z]:\\?$/)) {
    return ''
  }

  // Handle Windows paths
  if (path.includes('\\')) {
    const parts = path.split('\\')
    parts.pop()
    const parent = parts.join('\\')
    return parent.endsWith(':') ? parent + '\\' : parent
  }

  // Handle Unix paths
  const parts = path.split('/')
  parts.pop()
  return parts.join('/') || '/'
}

const getFolderDisplayName = (path: string): string => {
  if (path === '/') return 'Root'
  if (path.match(/^[A-Za-z]:\\?$/)) return path.replace('\\', '')

  const segments = path.split(/[/\\]/)
  return segments[segments.length - 1] || path
}

const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}

const toggleManualPathEdit = () => {
  manualPathEdit.value = !manualPathEdit.value
  if (manualPathEdit.value) {
    // Allow manual editing
  } else {
    // Navigate to manually entered path
    if (selectedPath.value && selectedPath.value !== currentPath.value) {
      navigateToPath(selectedPath.value)
    }
  }
}

const validatePath = async (path: string): Promise<boolean> => {
  if (!path) return false

  validating.value = true
  try {
    const response = await checkWritable(path)
    return response.ok
  } catch (err) {
    return false
  } finally {
    validating.value = false
  }
}

const confirmSelection = async () => {
  if (!selectedPath.value) return

  const isValid = await validatePath(selectedPath.value)
  if (!isValid) {
    error.value = 'Selected folder is not accessible or writable'
    return
  }

  emit('select', selectedPath.value)
  closeModal()
}

// Watchers
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      // Clear errors and entries but preserve selectedPath if we have an initialPath
      error.value = ''
      entries.value = []
      manualPathEdit.value = false

      // Set initial path before loading anything
      if (props.initialPath) {
        selectedPath.value = props.initialPath
      } else {
        selectedPath.value = ''
      }

      loadRoots()

      // Load initial directory
      if (props.initialPath) {
        loadDirectory(props.initialPath)
      } else {
        // Load user home directory by default - get home directory from backend
        loadDirectory('')
      }
    }
  }
)

onMounted(() => {
  if (props.isOpen) {
    // Set initial path
    if (props.initialPath) {
      selectedPath.value = props.initialPath
    }

    loadRoots()

    // Load initial directory
    if (props.initialPath) {
      loadDirectory(props.initialPath)
    } else {
      loadDirectory('')
    }
  }
})
</script>
