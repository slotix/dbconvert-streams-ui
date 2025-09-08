<template>
  <div class="space-y-6">
    <!-- Connection Summary -->
    <div class="bg-gray-50 rounded-lg p-6">
      <div class="flex items-start">
        <img
          :src="getDBTypeLogo(connection?.type)"
          :alt="connection?.type + ' logo'"
          class="h-12 w-12 object-contain mr-4 mt-1"
        />
        <div class="flex-1">
          <h3 class="text-lg font-medium text-gray-900">{{ connection?.name }}</h3>
          <p class="text-sm text-gray-600">{{ connection?.type }} Database Connection</p>
          
          <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Connection Details -->
            <div>
              <h4 class="text-sm font-medium text-gray-900 mb-2">Connection Details</h4>
              <dl class="space-y-1">
                <div class="flex justify-between text-sm">
                  <dt class="text-gray-500">Host:</dt>
                  <dd class="text-gray-900 font-mono">{{ connection?.host || 'Not set' }}</dd>
                </div>
                <div class="flex justify-between text-sm">
                  <dt class="text-gray-500">Port:</dt>
                  <dd class="text-gray-900 font-mono">{{ connection?.port || 'Default' }}</dd>
                </div>
                <div class="flex justify-between text-sm">
                  <dt class="text-gray-500">Username:</dt>
                  <dd class="text-gray-900 font-mono">{{ connection?.username || 'Not set' }}</dd>
                </div>
                <div class="flex justify-between text-sm">
                  <dt class="text-gray-500">Database:</dt>
                  <dd class="text-gray-900 font-mono">{{ connection?.database || 'Default' }}</dd>
                </div>
              </dl>
            </div>

            <!-- Security Settings -->
            <div>
              <h4 class="text-sm font-medium text-gray-900 mb-2">Security Settings</h4>
              <dl class="space-y-1">
                <div class="flex justify-between text-sm">
                  <dt class="text-gray-500">SSL Mode:</dt>
                  <dd class="text-gray-900">
                    <span :class="getSSLBadgeClass(connection?.ssl?.mode)">
                      {{ getSSLModeDisplay(connection?.ssl?.mode) }}
                    </span>
                  </dd>
                </div>
                <div class="flex justify-between text-sm">
                  <dt class="text-gray-500">Password:</dt>
                  <dd class="text-gray-900">
                    {{ connection?.password ? '••••••••' : 'Not set' }}
                  </dd>
                </div>
                <div v-if="connection?.cloud_provider" class="flex justify-between text-sm">
                  <dt class="text-gray-500">Provider:</dt>
                  <dd class="text-gray-900">{{ connection.cloud_provider }}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Test Connection Results -->
    <div v-if="testResult" class="border rounded-lg p-4">
      <div class="flex items-center">
        <div
          :class="[
            testResult.success
              ? 'text-green-600 bg-green-100'
              : 'text-red-600 bg-red-100',
            'rounded-full p-1 mr-3'
          ]"
        >
          <CheckCircleIcon v-if="testResult.success" class="h-5 w-5" />
          <XCircleIcon v-else class="h-5 w-5" />
        </div>
        <div>
          <p class="font-medium" :class="testResult.success ? 'text-green-800' : 'text-red-800'">
            {{ testResult.success ? 'Connection Successful' : 'Connection Failed' }}
          </p>
          <p class="text-sm text-gray-600">{{ testResult.message }}</p>
        </div>
      </div>
    </div>

    <!-- Action Recommendation -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div class="flex">
        <InformationCircleIcon class="h-5 w-5 text-blue-400 mt-0.5 mr-3" />
        <div>
          <h4 class="text-sm font-medium text-blue-800">Ready to {{ isEditMode ? 'update' : 'create' }}</h4>
          <p class="text-sm text-blue-700 mt-1">
            {{ isEditMode 
              ? 'Review your changes and click "Update Connection" to save them.'
              : 'Review your connection details and click "Create Connection" to add it to your connections list.'
            }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/vue/24/outline'
import { useConnectionsStore } from '@/stores/connections'
import type { Connection } from '@/types/connections'

interface TestResult {
  success: boolean
  message: string
}

interface Props {
  testResult?: TestResult
  isEditMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isEditMode: false
})

const connectionsStore = useConnectionsStore()

const connection = computed(() => connectionsStore.currentConnection)

const emit = defineEmits<{
  'update:can-proceed': [canProceed: boolean]
}>()

// Always allow proceeding from review step if we have a connection
const canProceed = computed(() => !!connection.value)


// Watch for changes and emit can-proceed updates
watchEffect(() => {
  emit('update:can-proceed', canProceed.value)
})

function getDBTypeLogo(type?: string): string {
  if (!type) return '/images/db-logos/default.svg'
  const dbType = connectionsStore.dbTypes.find(db => db.type === type)
  return dbType?.logo || '/images/db-logos/default.svg'
}

function getSSLModeDisplay(sslMode?: string): string {
  if (!sslMode || sslMode === 'disable') return 'Disabled'
  return sslMode.charAt(0).toUpperCase() + sslMode.slice(1)
}

function getSSLBadgeClass(sslMode?: string): string {
  const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full'
  if (!sslMode || sslMode === 'disable') {
    return `${baseClasses} bg-gray-100 text-gray-800`
  }
  return `${baseClasses} bg-green-100 text-green-800`
}
</script>