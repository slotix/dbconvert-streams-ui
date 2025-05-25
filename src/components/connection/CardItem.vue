<template>
  <div class="w-full">
    <div
      class="bg-white rounded-lg border overflow-hidden cursor-pointer transform hover:shadow-lg duration-300 ease-in-out flex flex-col min-h-[400px] max-h-[500px]"
      :class="{
        'border-yellow-500 ring-2 ring-yellow-400': selected && currentStep?.name === 'source',
        'border-green-500 ring-2 ring-green-400': selected && currentStep?.name === 'target',
        'border-gray-200': !selected
      }" @click="selectConnection">
      <!-- Header -->
      <div class="border-b px-6 py-4 flex-shrink-0" :class="{
        'bg-yellow-50': selected && currentStep?.name === 'source',
        'bg-green-50': selected && currentStep?.name === 'target',
        'bg-gray-50': !selected
      }">
        <div class="flex items-center gap-3">
          <img
            class="h-8 w-8 rounded-full shadow-sm bg-white object-contain p-0.5 transition-all duration-300 flex-shrink-0"
            :class="{
              'ring-2 ring-offset-2 ring-yellow-400 shadow-yellow-200/50':
                selected && currentStep?.name === 'source',
              'ring-2 ring-offset-2 ring-green-400 shadow-green-200/50':
                selected && currentStep?.name === 'target',
              'ring-1 ring-gray-200': !selected
            }" :src="logoSrc" :alt="connection.type + ' logo'" />
          <div class="min-w-0 flex-1">
            <h3 class="text-lg font-medium text-gray-900 truncate">{{ connection.name }}</h3>
            <p class="text-sm text-gray-500 truncate">ID: {{ connection.id }}</p>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="space-y-6 p-6 flex-1 overflow-y-auto">
        <!-- Connection Details -->
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="min-w-0">
              <label class="text-xs font-medium uppercase text-gray-500">Host</label>
              <p class="mt-1 font-medium text-gray-900 truncate">{{ concatenateValues }}</p>
            </div>
            <div class="min-w-0">
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
                    : connectionString.replace(/(?<=:)[^@]+(?=@) /g, '****') }} </span>
                  <button class="flex-shrink-0 text-gray-400 hover:text-gray-600"
                    @click.stop="showPassword = !showPassword">
                    <EyeIcon v-if="!showPassword" class="h-4 w-4" />
                    <EyeSlashIcon v-else class="h-4 w-4" />
                  </button>
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
        <button v-tooltip="'View tables, data, schema, and AI assistant'" type="button"
          class="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 flex items-center justify-center gap-2"
          @click.stop="$router.push({ name: 'DatabaseMetadata', params: { id: connection.id } })">
          <TableCellsIcon class="h-4 w-4" />
          Explore
        </button>
        <button v-tooltip="'Edit the connection'" type="button"
          class="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 flex items-center justify-center gap-2"
          @click.stop="editConnection">
          <PencilIcon class="h-4 w-4" />
          Edit
        </button>
        <button v-tooltip="'Clone the connection'" type="button"
          class="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 flex items-center justify-center gap-2"
          @click.stop="cloneConnection">
          <Square2StackIcon class="h-4 w-4" />
          Clone
        </button>
        <button v-tooltip="'Delete the connection'" type="button"
          class="flex-1 px-4 py-3 text-sm font-medium text-red-600 bg-gray-50 hover:bg-gray-100 flex items-center justify-center gap-2"
          @click.stop="deleteConn(connection.id)">
          <TrashIcon class="h-4 w-4" />
          Delete
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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
  FunnelIcon
} from '@heroicons/vue/24/outline'
import { ref } from 'vue'

const props = defineProps<{
  connection: Connection
}>()

const connectionsStore = useConnectionsStore()
const streamsStore = useStreamsStore()
const commonStore = useCommonStore()

const showPassword = ref(false)

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

function editConnection(): void {
  if (props.connection) {
    connectionsStore.setCurrentConnection(props.connection.id)
    commonStore.openModal(DIALOG_TYPES.UPDATE)
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
</script>
