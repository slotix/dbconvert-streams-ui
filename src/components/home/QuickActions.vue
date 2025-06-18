<!-- src/components/home/QuickActions.vue -->
<template>
  <div class="p-6">
    <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">Quick Actions</h2>

    <!-- Explore Databases -->
    <div v-if="recentConnections.length > 0" class="mb-8">
      <h3 class="text-sm font-medium text-gray-500 mb-4">EXPLORE DATABASES</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="connection in recentConnections.slice(0, 4)"
          :key="connection.id"
          class="group cursor-pointer"
          @click="exploreConnection(connection.id)"
        >
          <div
            class="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50/50 transition-all duration-200"
          >
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="bg-blue-50 rounded-lg p-2 group-hover:bg-blue-100 transition-colors">
                  <img
                    v-if="getConnectionLogo(connection.id)"
                    :src="getConnectionLogo(connection.id) || undefined"
                    :alt="getConnectionType(connection.id)"
                    class="h-6 w-6 object-contain"
                  />
                </div>
              </div>
              <div class="ml-4">
                <h3 class="text-sm font-semibold text-gray-900">{{ connection.name }}</h3>
                <p class="text-sm text-gray-500">{{ getConnectionDetails(connection.id) }}</p>
              </div>
            </div>
            <ArrowRightIcon
              class="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Creation Actions -->
    <div>
      <h3 class="text-sm font-medium text-gray-500 mb-4">CREATE NEW</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Create Connection -->
        <div class="group cursor-pointer" @click="createConnection">
          <div
            class="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:border-violet-200 hover:bg-violet-50/50 transition-all duration-200"
          >
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div
                  class="bg-violet-50 rounded-lg p-3 group-hover:bg-violet-100 transition-colors"
                >
                  <CircleStackIcon class="h-6 w-6 text-violet-600" />
                </div>
              </div>
              <div class="ml-4">
                <h3 class="text-sm font-semibold text-gray-900">Create Connection</h3>
                <p class="text-sm text-gray-500">Connect a new database</p>
              </div>
            </div>
            <ArrowRightIcon
              class="h-5 w-5 text-gray-400 group-hover:text-violet-600 transition-colors"
            />
          </div>
        </div>

        <!-- Create Stream -->
        <div class="group cursor-pointer" @click="createStream">
          <div
            class="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white hover:border-indigo-200 hover:bg-indigo-50/50 transition-all duration-200"
          >
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div
                  class="bg-indigo-50 rounded-lg p-3 group-hover:bg-indigo-100 transition-colors"
                >
                  <ArrowPathIcon class="h-6 w-6 text-indigo-600" />
                </div>
              </div>
              <div class="ml-4">
                <h3 class="text-sm font-semibold text-gray-900">Create Stream</h3>
                <p class="text-sm text-gray-500">Set up a new data stream</p>
              </div>
            </div>
            <ArrowRightIcon
              class="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCommonStore } from '@/stores/common'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import {
  ArrowPathIcon,
  CircleStackIcon,
  ClockIcon,
  PlusIcon,
  ArrowRightIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const commonStore = useCommonStore()
const streamsStore = useStreamsStore()
const connectionsStore = useConnectionsStore()

// Get recent connections from localStorage
const recentConnections = computed(() => {
  const recentConnectionsData = JSON.parse(localStorage.getItem('recentConnections') || '[]')
  return recentConnectionsData.slice().reverse() // Show most recent first
})

function getConnectionLogo(connectionId: string) {
  const connection = connectionsStore.connections.find((conn) => conn.id === connectionId)
  if (!connection) return null

  const dbType = connectionsStore.dbTypes.find((f) => f.type === connection.type)
  return dbType?.logo || null
}

function getConnectionType(connectionId: string) {
  const connection = connectionsStore.connections.find((conn) => conn.id === connectionId)
  return connection?.type || ''
}

function getConnectionDetails(connectionId: string) {
  const connection = connectionsStore.connections.find((conn) => conn.id === connectionId)
  if (!connection) return ''
  return `${connection.host}:${connection.port} • ${connection.database}`
}

function exploreConnection(connectionId: string) {
  router.push({ name: 'DatabaseMetadata', params: { id: connectionId } })
}

function createStream() {
  streamsStore.addStream()
  router.push({ name: 'ManageStream', params: { mode: 'add' } })
}

function createConnection() {
  commonStore.openAddConnectionDialog()
  router.push('/connections')
}

function viewAllConnections() {
  router.push('/connections')
}

function viewAllStreamConfigurations() {
  router.push('/streams')
}
</script>
