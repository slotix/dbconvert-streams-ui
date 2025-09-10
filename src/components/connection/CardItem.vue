<template>
  <div class="w-full">
    <div
      class="bg-white rounded-lg border overflow-hidden cursor-pointer transform hover:shadow-lg duration-300 ease-in-out flex flex-col min-h-[400px] max-h-[500px]"
      :class="{
        'border-yellow-500 ring-2 ring-yellow-400': selected && currentStep?.name === 'source',
        'border-green-500 ring-2 ring-green-400': selected && currentStep?.name === 'target',
        'border-gray-200': !selected
      }"
      @click="selectConnection"
    >
      <!-- Header -->
      <div
        class="border-b px-6 py-4 flex-shrink-0"
        :class="{
          'bg-yellow-50': selected && currentStep?.name === 'source',
          'bg-green-50': selected && currentStep?.name === 'target',
          'bg-gray-50': !selected
        }"
      >
        <div class="flex items-start gap-3">
          <div
            :class="getDatabaseIconStyle(connection.type)"
            class="rounded-lg p-2.5 transition-all duration-200 hover:shadow-md flex-shrink-0"
          >
            <img
              class="h-7 w-7 object-contain"
              :src="logoSrc"
              :alt="connection.type + ' logo'"
            />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-medium text-gray-900 truncate pr-2">{{ connection.name }}</h3>
            </div>
            <div class="flex items-center gap-2 mt-1">
              <CloudProviderBadge :cloud-provider="connection.cloud_provider" :db-type="connection.type" size="sm" />
              <p class="text-xs text-gray-500 truncate font-mono">{{ connection.id }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="space-y-6 p-6 flex-1 overflow-y-auto">
        <!-- Connection Details - Different content for file vs database connections -->
        <div class="space-y-4">
          <!-- File Connection Details -->
          <div v-if="isFileConnection" class="space-y-4">
            <div class="min-w-0">
              <label class="text-xs font-medium uppercase text-gray-500">Folder Path</label>
              <p class="mt-1 font-medium text-gray-900 break-all" :title="connection.path">
                {{ connection.path || 'No path configured' }}
              </p>
            </div>
            
            <div class="min-w-0">
              <label class="text-xs font-medium uppercase text-gray-500">Supported Formats</label>
              <p class="mt-1 text-sm text-gray-700">
                📊 CSV, JSON, JSONL, Parquet files (.gz supported)
              </p>
            </div>
          </div>
          
          <!-- Database Connection Details -->
          <div v-else>
            <div class="grid gap-4" :class="connection.database ? 'grid-cols-2' : 'grid-cols-1'">
              <div class="min-w-0">
                <label class="text-xs font-medium uppercase text-gray-500">Host</label>
                <p class="mt-1 font-medium text-gray-900 truncate" :title="concatenateValues">
                  {{ showPassword ? concatenateValues : truncatedHost }}
                </p>
              </div>
              <div v-if="connection.database" class="min-w-0">
                <label class="text-xs font-medium uppercase text-gray-500">Database</label>
                <p class="mt-1 font-medium text-gray-900 truncate">{{ connection.database }}</p>
              </div>
            </div>

            <div class="min-w-0">
              <label class="text-xs font-medium uppercase text-gray-500">Connection String</label>
              <div class="mt-1 flex items-start gap-2 rounded-md bg-gray-50 p-3 font-mono text-sm">
                <span class="flex-1 break-all text-gray-800 overflow-x-auto">
                  {{
                    showPassword
                      ? connectionString
                      : truncatedConnectionString.replace(/(?<=:)[^@]+(?=@)/g, '****')
                  }}
                </span>
                <div class="flex flex-col gap-1">
                  <button
                    class="flex-shrink-0 text-gray-400 hover:text-gray-600"
                    @click.stop="showPassword = !showPassword"
                    :title="showPassword ? 'Hide password and truncate' : 'Show password and full details'"
                  >
                    <EyeIcon v-if="!showPassword" class="h-4 w-4" />
                    <EyeSlashIcon v-else class="h-4 w-4" />
                  </button>
                  <button
                    class="flex-shrink-0 transition-colors"
                    :class="isCopied ? 'text-green-500' : 'text-gray-400 hover:text-gray-600'"
                    @click.stop="copyConnectionString"
                    :title="isCopied ? 'Copied!' : 'Copy connection string to clipboard'"
                  >
                    <ClipboardIcon v-if="!isCopied" class="h-4 w-4" />
                    <CheckIcon v-else class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Creation Date -->
        <div class="flex items-center gap-2 pt-4 border-t border-gray-100">
          <CalendarIcon class="h-4 w-4 text-gray-500" />
          <span class="text-sm text-gray-500 truncate">Created: {{ connectionCreated }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div v-show="!isStreamsPage" class="flex divide-x divide-gray-200 border-t flex-shrink-0">
        <button
          v-tooltip="'View tables, data, schema, and AI assistant'"
          type="button"
          class="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 flex items-center justify-center gap-2"
          @click.stop="$router.push({ name: 'DatabaseMetadata', params: { id: connection.id } })"
        >
          <TableCellsIcon class="h-4 w-4" />
          Explore
        </button>
        <button
          v-tooltip="'Edit the connection'"
          type="button"
          class="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 flex items-center justify-center gap-2"
          @click.stop="editConnection"
        >
          <PencilIcon class="h-4 w-4" />
          Edit
        </button>
        <button
          v-tooltip="'Clone the connection'"
          type="button"
          class="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 flex items-center justify-center gap-2"
          @click.stop="cloneConnection"
        >
          <Square2StackIcon class="h-4 w-4" />
          Clone
        </button>
        <button
          v-tooltip="'Delete the connection'"
          type="button"
          class="flex-1 px-4 py-3 text-sm font-medium text-red-600 bg-gray-50 hover:bg-gray-100 flex items-center justify-center gap-2"
          @click.stop="deleteConn(connection.id)"
        >
          <TrashIcon class="h-4 w-4" />
          Delete
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useConnectionsStore } from '@/stores/connections'
import { useStreamsStore } from '@/stores/streamConfig'
import { useCommonStore, DIALOG_TYPES } from '@/stores/common'
import { type Connection } from '@/types/connections'
import { normalizeConnectionType } from '@/utils/connectionUtils'
import { generateConnectionString } from '@/utils/connectionStringGenerator'
import {
  PencilIcon,
  Square2StackIcon,
  TrashIcon,
  CalendarIcon,
  TableCellsIcon,
  EyeIcon,
  EyeSlashIcon,
  ClipboardIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'
import { ref } from 'vue'
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'

const props = defineProps<{
  connection: Connection
}>()

const router = useRouter()
const connectionsStore = useConnectionsStore()
const streamsStore = useStreamsStore()
const commonStore = useCommonStore()

const showPassword = ref(false)
const isCopied = ref(false)

const isStreamsPage = computed(() => commonStore.isStreamsPage)
const currentStep = computed(() => streamsStore.currentStep)
const currentStreamConfig = computed(() => streamsStore.currentStreamConfig)

const logoSrc = computed(() => {
  const normalizedType = normalizeConnectionType(props.connection?.type || '')
  const dbType = connectionsStore.dbTypes.find(
    (f) => normalizeConnectionType(f.type) === normalizedType
  )
  return dbType ? dbType.logo : ''
})

// Check if this is a file connection (case-insensitive)
const isFileConnection = computed(() => {
  return props.connection?.type?.toLowerCase() === 'files'
})

const connectionCreated = computed(() => {
  if (!props.connection || typeof props.connection.created !== 'number') return ''
  const milliseconds = props.connection.created * 1000
  const date = new Date(milliseconds)
  return date
    .toLocaleString('en-GB', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    .replace(',', ' -')
})

const concatenateValues = computed(() => {
  if (!props.connection) return ''
  const { host, port } = props.connection
  if (host === undefined && port === undefined) return ''
  return (host || '') + (port !== undefined ? `:${port}` : '')
})

const selected = computed(() => {
  if (!isStreamsPage.value) {
    return false
  }
  const isSourceStreamSelected =
    currentStep.value?.name === 'source' &&
    currentStreamConfig.value?.source === props.connection?.id
  const isTargetStreamSelected =
    currentStep.value?.name === 'target' &&
    currentStreamConfig.value?.target === props.connection?.id

  return isSourceStreamSelected || isTargetStreamSelected
})

const connectionString = computed(() => {
  if (!props.connection) return ''
  return generateConnectionString(props.connection, showPassword.value)
})

const truncatedHost = computed(() => {
  const fullHost = concatenateValues.value
  if (fullHost.length <= 30) return fullHost
  
  // For cloud providers, try to show the important part
  if (fullHost.includes('.')) {
    const parts = fullHost.split('.')
    if (parts.length > 3) {
      // Show first part and last 2 parts with ellipsis
      return `${parts[0]}...${parts.slice(-2).join('.')}`
    }
  }
  
  // Simple truncation for other cases
  return `${fullHost.substring(0, 30)}...`
})

const truncatedConnectionString = computed(() => {
  const fullString = connectionString.value
  if (fullString.length <= 60) return fullString
  
  // For connection strings, truncate in the middle to preserve protocol and end
  const start = fullString.substring(0, 30)
  const end = fullString.substring(fullString.length - 30)
  return `${start}...${end}`
})

function getDatabaseIconStyle(dbType: string): string {
  const normalizedType = normalizeConnectionType(dbType?.toLowerCase() || '')
  
  // Database-specific brand colors with subtle backgrounds
  const styles: Record<string, string> = {
    'postgresql': 'bg-blue-100 ring-2 ring-blue-200/50',
    'postgres': 'bg-blue-100 ring-2 ring-blue-200/50',
    'mysql': 'bg-orange-100 ring-2 ring-orange-200/50',
    'mongodb': 'bg-green-100 ring-2 ring-green-200/50',
    'mongo': 'bg-green-100 ring-2 ring-green-200/50',
    'redis': 'bg-red-100 ring-2 ring-red-200/50',
    'sqlite': 'bg-gray-100 ring-2 ring-gray-200/50',
    'mariadb': 'bg-orange-100 ring-2 ring-orange-200/50',
    'mssql': 'bg-blue-100 ring-2 ring-blue-200/50',
    'sqlserver': 'bg-blue-100 ring-2 ring-blue-200/50',
    'oracle': 'bg-red-100 ring-2 ring-red-200/50',
    'cassandra': 'bg-purple-100 ring-2 ring-purple-200/50',
    'elasticsearch': 'bg-yellow-100 ring-2 ring-yellow-200/50',
    'clickhouse': 'bg-yellow-100 ring-2 ring-yellow-200/50'
  }
  
  return styles[normalizedType] || 'bg-gray-100 ring-2 ring-gray-200/50'
}

function editConnection(): void {
  if (props.connection) {
    // Navigate to edit wizard instead of opening modal
    router.push(`/connections/edit/${props.connection.id}`)
  }
}

function cloneConnection(): void {
  connectionsStore.setCurrentConnection(props.connection.id)
  commonStore.openModal(DIALOG_TYPES.SAVE)
}

function deleteConn(id: string): void {
  connectionsStore.deleteConnection(id)
}

function selectConnection(): void {
  if (!props.connection) return
  connectionsStore.setCurrentConnection(props.connection.id)
  if (currentStep.value?.name === 'source') {
    streamsStore.updateSource(props.connection.id)
  }
  if (currentStep.value?.name === 'target') {
    streamsStore.updateTarget(props.connection.id)
  }
}

async function copyConnectionString(): Promise<void> {
  if (!props.connection) return
  
  try {
    const fullConnectionString = generateConnectionString(props.connection, true) // Always copy with password
    await navigator.clipboard.writeText(fullConnectionString)
    
    // Show success indication
    isCopied.value = true
    
    // Reset the copied state after 2 seconds
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
    
  } catch (error) {
    console.error('Failed to copy connection string:', error)
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea')
      textArea.value = generateConnectionString(props.connection, true)
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      
      // Show success indication for fallback too
      isCopied.value = true
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        isCopied.value = false
      }, 2000)
      
    } catch (fallbackError) {
      console.error('Fallback copy also failed:', fallbackError)
    }
  }
}

</script>
