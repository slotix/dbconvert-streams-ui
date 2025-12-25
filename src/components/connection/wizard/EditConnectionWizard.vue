<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Connection Details -->
    <div class="space-y-6">
      <ConnectionDetailsStep
        :connectionType="connection?.type"
        :hideTypeDisplay="true"
        @update:can-proceed="updateCanProceed"
      />

      <!-- Action Buttons -->
      <div class="flex justify-between">
        <BaseButton variant="secondary" @click="cancelWizard"> Cancel </BaseButton>
        <div class="flex space-x-3">
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

      <!-- Test Result -->
      <div
        v-if="testResult"
        :class="[
          'border rounded-lg p-4',
          testResult.success
            ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
            : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
        ]"
      >
        <div class="flex items-center">
          <CheckCircle
            v-if="testResult.success"
            class="h-5 w-5 text-green-600 dark:text-green-400 mr-3"
          />
          <XCircle v-else class="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
          <div>
            <p
              :class="[
                'font-medium',
                testResult.success
                  ? 'text-green-800 dark:text-green-300'
                  : 'text-red-800 dark:text-red-300'
              ]"
            >
              {{ testResult.success ? 'Connection Successful' : 'Connection Failed' }}
            </p>
            <p
              :class="[
                'text-sm',
                testResult.success
                  ? 'text-green-700 dark:text-green-400'
                  : 'text-red-700 dark:text-red-400'
              ]"
            >
              {{ testResult.message }}
            </p>
          </div>
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

// Form state
const canProceed = ref(false)
const testResult = ref<{ success: boolean; message: string } | undefined>(undefined)

// Computed properties
const connection = computed(() => connectionsStore.currentConnection)
const isUpdatingConnection = computed(() => connectionsStore.isUpdatingConnection)
const isTestingConnection = computed(() => connectionsStore.isTestingConnection)

// Get connection ID from props or route params
const connectionId = computed(() => props.connectionId || (route.params.id as string))

// Load the connection to edit
async function loadConnectionForEdit() {
  const id = connectionId.value
  if (!id) {
    commonStore.showNotification('No connection ID provided', 'error')
    router.push('/explorer')
    return
  }

  try {
    // Try to find connection in existing list first
    let existingConnection = connectionsStore.connectionByID(id)

    if (!existingConnection) {
      // If not found, refresh connections and try again
      await connectionsStore.refreshConnections()
      existingConnection = connectionsStore.connectionByID(id)
    }

    if (!existingConnection) {
      throw new Error('Connection not found')
    }

    // Set the current connection for editing
    connectionsStore.setCurrentConnection(id)
    canProceed.value = true // Enable proceed since we have valid connection data
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred'
    commonStore.showNotification(`Failed to load connection: ${message}`, 'error')
    router.push('/explorer')
  }
}

// Event handlers
function updateCanProceed(canProceedValue: boolean) {
  canProceed.value = canProceedValue
}

async function testConnection() {
  testResult.value = undefined // Clear previous results first
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

    // Navigate back to explorer and refocus the connection
    if (connectionId.value) {
      router.push({ path: `/explorer/${connectionId.value}`, query: { focus: '1' } })
    } else {
      router.push('/explorer')
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    commonStore.showNotification(errorMessage, 'error')
  }
}

function cancelWizard() {
  // Reset current connection to avoid affecting other operations
  connectionsStore.currentConnection = null
  // Navigate back to connection details view
  if (connectionId.value) {
    router.push({ path: `/explorer/${connectionId.value}`, query: { details: 'true' } })
  } else {
    router.push('/explorer')
  }
}

// Keyboard event handler
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    cancelWizard()
  }
}

// Initialize when component mounts
onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  await loadConnectionForEdit()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>
