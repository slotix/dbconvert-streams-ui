<template>
  <div class="mx-auto flex min-h-[calc(100vh-65px)] max-w-[1600px] flex-col px-4 sm:px-6 lg:px-8">
    <div class="flex-1 py-6">
      <div class="border-b border-gray-200 py-5 dark:border-gray-800">
        <div v-if="connection" class="flex items-start gap-3">
          <div class="flex items-start gap-3">
            <DatabaseIcon
              :dbType="displayConnectionType"
              :logoSrc="connectionLogo"
              size="LG"
              containerClass="rounded-xl"
            />
            <div>
              <p
                class="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
              >
                Edit Connection
              </p>
              <h2 class="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">
                {{ connection.name || displayConnectionType }}
              </h2>
              <p class="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
                {{ connectionDescription }}
              </p>
            </div>
          </div>
        </div>

        <div v-else class="py-2">
          <p
            class="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
          >
            Edit Connection
          </p>
          <h2 class="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Loading connection
          </h2>
          <p class="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
            Fetching the current connection settings.
          </p>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div class="space-y-5 py-5">
          <ConnectionDetailsStep
            v-if="connection"
            :connectionType="connection.type"
            layout="workspace"
            @update:can-proceed="updateCanProceed"
          />

          <div v-else class="flex min-h-80 items-center justify-center">
            <div class="text-sm text-gray-500 dark:text-gray-400">Loading connection...</div>
          </div>

          <div
            v-if="testResult"
            :class="[
              'rounded-lg border p-4',
              testResult.success
                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                : 'border-red-200 bg-red-50 dark:border-red-700/70 dark:bg-red-900/30'
            ]"
          >
            <div class="flex items-center">
              <CheckCircle
                v-if="testResult.success"
                class="mr-3 h-5 w-5 text-green-600 dark:text-green-400"
              />
              <XCircle v-else class="mr-3 h-5 w-5 text-red-600 dark:text-red-300" />
              <div>
                <p
                  :class="[
                    'font-medium',
                    testResult.success
                      ? 'text-green-800 dark:text-green-300'
                      : 'text-red-800 dark:text-red-200'
                  ]"
                >
                  {{ testResult.success ? 'Connection Successful' : 'Connection Failed' }}
                </p>
                <p
                  :class="[
                    'text-sm',
                    testResult.success
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-red-700 dark:text-red-100/95'
                  ]"
                >
                  {{ testResult.message }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      class="sticky bottom-0 z-20 -mx-4 border-t border-slate-200/80 bg-white/92 backdrop-blur sm:-mx-6 lg:-mx-8 dark:border-gray-700/80 dark:bg-gray-900/92"
    >
      <div
        class="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8"
      >
        <BaseButton variant="secondary" @click="cancelWizard">Cancel</BaseButton>

        <div class="flex flex-wrap items-center justify-end gap-3">
          <BaseButton
            variant="secondary"
            :disabled="!canProceed || isTestingConnection"
            :loading="isTestingConnection"
            @click="testConnection"
          >
            <span v-if="!isTestingConnection">Test Connection</span>
            <span v-else>Testing...</span>
          </BaseButton>
          <BaseButton
            variant="primary"
            :disabled="!canProceed || isUpdatingConnection"
            :loading="isUpdatingConnection"
            @click="updateConnection"
          >
            <span v-if="!isUpdatingConnection">Update Connection</span>
            <span v-else>Updating...</span>
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { CheckCircle, XCircle } from 'lucide-vue-next'
import ConnectionDetailsStep from './steps/ConnectionDetailsStep.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import DatabaseIcon from '@/components/base/DatabaseIcon.vue'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'

const router = useRouter()
const route = useRoute()
const connectionsStore = useConnectionsStore()
const commonStore = useCommonStore()

// Props for connection ID
interface Props {
  connectionId?: string
}

const props = defineProps<Props>()

const canProceed = ref(false)
const testResult = ref<{ success: boolean; message: string } | undefined>(undefined)

const connection = computed(() => connectionsStore.currentConnection)
const isUpdatingConnection = computed(() => connectionsStore.isUpdatingConnection)
const isTestingConnection = computed(() => connectionsStore.isTestingConnection)
const displayConnectionType = computed(() => {
  const current = connection.value
  if (!current) {
    return 'connection'
  }
  if (current.spec?.s3) {
    return 'S3'
  }
  if (current.spec?.files) {
    return 'Files'
  }
  const normalizedType = current.type?.toLowerCase()
  return (
    connectionsStore.dbTypes.find((dbType) => dbType.type.toLowerCase() === normalizedType)?.type ||
    current.type
  )
})
const connectionLogo = computed(() => {
  const normalizedType = displayConnectionType.value.toLowerCase()
  return (
    connectionsStore.dbTypes.find((dbType) => dbType.type.toLowerCase() === normalizedType)?.logo ||
    '/images/db-logos/default.svg'
  )
})
const connectionDescription = computed(() => {
  const descriptions: Record<string, string> = {
    PostgreSQL: 'Update host, credentials, SSL, and database defaults for this connection.',
    MySQL: 'Update host, credentials, SSL, and default database settings for this connection.',
    Files: 'Adjust the local file source path and related settings.',
    S3: 'Adjust bucket, prefix, credentials, and object storage settings.'
  }

  return descriptions[displayConnectionType.value] || 'Update the saved connection settings.'
})

const connectionId = computed(() => props.connectionId || (route.params.id as string))

async function loadConnectionForEdit() {
  const id = connectionId.value
  if (!id) {
    commonStore.showNotification('No connection ID provided', 'error')
    router.push('/explorer')
    return
  }

  try {
    let existingConnection = connectionsStore.connectionByID(id)

    if (!existingConnection) {
      await connectionsStore.refreshConnections()
      existingConnection = connectionsStore.connectionByID(id)
    }

    if (!existingConnection) {
      throw new Error('Connection not found')
    }

    connectionsStore.setCurrentConnection(id)
    canProceed.value = true
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred'
    commonStore.showNotification(`Failed to load connection: ${message}`, 'error')
    router.push('/explorer')
  }
}

function updateCanProceed(canProceedValue: boolean) {
  canProceed.value = canProceedValue
}

async function testConnection() {
  testResult.value = undefined
  try {
    await connectionsStore.testConnection()
    testResult.value = {
      success: true,
      message: 'Connection established successfully!'
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to establish connection'
    testResult.value = {
      success: false,
      message
    }
  }
}

async function updateConnection() {
  try {
    if (!connection.value) {
      throw new Error('No connection data to update')
    }

    await connectionsStore.updateConnection()

    commonStore.showNotification('Connection updated successfully', 'success')
    await connectionsStore.refreshConnections()

    if (connectionId.value) {
      sessionStorage.setItem('explorerFocusConnectionId', connectionId.value)
      router.push('/explorer')
    } else {
      router.push('/explorer')
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    commonStore.showNotification(errorMessage, 'error')
  }
}

function cancelWizard() {
  connectionsStore.currentConnection = null
  if (connectionId.value) {
    sessionStorage.setItem('explorerFocusConnectionId', connectionId.value)
    router.push('/explorer')
  } else {
    router.push('/explorer')
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    cancelWizard()
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  await loadConnectionForEdit()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>
