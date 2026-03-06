<template>
  <div class="mx-auto flex min-h-[calc(100vh-65px)] max-w-[1600px] flex-col px-4 sm:px-6 lg:px-8">
    <div class="flex-1 py-6">
      <div class="grid h-full min-h-0 gap-8 xl:grid-cols-[320px_minmax(0,1fr)] xl:gap-10">
        <aside class="min-h-0 xl:border-r xl:border-gray-200 xl:pr-6 dark:xl:border-gray-800">
          <DatabaseTypeStep
            :selected-type="selectedDBType?.type"
            @update:selected-db-type="handleDBTypeUpdate"
          />
        </aside>

        <section class="flex min-h-0 flex-col overflow-hidden">
          <div class="border-b border-gray-200 py-5 dark:border-gray-800">
            <div v-if="selectedDBType" class="flex flex-wrap items-start justify-between gap-4">
              <div class="flex items-start gap-3">
                <DatabaseIcon
                  :dbType="selectedDBType.type"
                  :logoSrc="selectedDBType.logo"
                  size="LG"
                  containerClass="rounded-xl"
                />
                <div>
                  <p
                    class="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
                  >
                    Create Connection
                  </p>
                  <h2 class="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {{ selectedDBType.type }}
                  </h2>
                  <p class="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
                    {{ selectedTypeDescription }}
                  </p>
                </div>
              </div>
            </div>

            <div v-else class="py-2">
              <p
                class="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
              >
                Create Connection
              </p>
              <h2 class="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">
                Start in the selector
              </h2>
              <p class="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
                Choose a connection type on the left to open the editor and fill the required
                settings.
              </p>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto">
            <div v-if="selectedDBType" class="space-y-5 py-5">
              <div
                class="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/60"
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p
                      class="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
                    >
                      Quick Fill
                    </p>
                    <h3 class="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Use a connection string
                    </h3>
                  </div>
                  <p class="max-w-xl text-xs leading-5 text-gray-500 dark:text-gray-400">
                    Paste a DSN or URI to prefill this editor. Database, local file, and S3-style
                    URIs are supported.
                  </p>
                </div>

                <div class="mt-4">
                  <ConnectionStringInput
                    :connectionType="selectedDBType.type"
                    @update:connection-params="handleConnectionStringPrefill"
                  />
                </div>
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

              <ConnectionDetailsStep
                :key="editorKey"
                :connectionType="selectedDBType.type"
                layout="workspace"
                @update:can-proceed="updateCanProceed"
              />
            </div>

            <div v-else class="flex h-full min-h-[420px] items-center justify-center py-8 text-center">
              <div class="max-w-md">
                <div
                  class="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500"
                >
                  <Database class="h-7 w-7" />
                </div>
                <h3 class="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  No type selected
                </h3>
                <p class="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                  Select a connection type to open the editor. The form on the right will adapt to
                  the selected source and keep the same create flow.
                </p>
              </div>
            </div>
          </div>
        </section>
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
            :disabled="!canRunActions || isTestingConnection || isCreatingConnection"
            :loading="isTestingConnection"
            @click="testConnection"
          >
            {{ isTestingConnection ? 'Testing...' : 'Test Connection' }}
          </BaseButton>
          <BaseButton
            variant="primary"
            :disabled="!canRunActions || isCreatingConnection"
            :loading="isCreatingConnection"
            @click="createConnection"
          >
            Create Connection
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CheckCircle, Database, XCircle } from 'lucide-vue-next'
import BaseButton from '@/components/base/BaseButton.vue'
import DatabaseIcon from '@/components/base/DatabaseIcon.vue'
import ConnectionStringInput from '../ConnectionStringInput.vue'
import DatabaseTypeStep from './steps/DatabaseTypeStep.vue'
import ConnectionDetailsStep from './steps/ConnectionDetailsStep.vue'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import type { DbType } from '@/types/connections'

type ParsedConnectionPayload = {
  type: string
  host: string
  port: number
  username: string
  password: string
  database: string
  path?: string
  params?: Record<string, string>
}

const router = useRouter()
const connectionsStore = useConnectionsStore()
const commonStore = useCommonStore()

const selectedDBType = ref<DbType | null>(null)
const canProceed = ref(false)
const isCreatingConnectionStep = ref(false)
const testResult = ref<{ success: boolean; message: string } | undefined>(undefined)
const editorKey = ref(0)

const isCreatingConnection = computed(
  () => connectionsStore.isUpdatingConnection || isCreatingConnectionStep.value
)
const isTestingConnection = computed(() => connectionsStore.isTestingConnection)
const canRunActions = computed(() => Boolean(selectedDBType.value) && canProceed.value)

const selectedTypeDescription = computed(() => {
  if (!selectedDBType.value) return ''

  const descriptions: Record<string, string> = {
    PostgreSQL: 'Direct database connection with optional SSL settings.',
    MySQL: 'Direct database connection with default database and SSL support.',
    Files: 'Local folder-based source for CSV, JSON, JSONL, and Parquet files.',
    S3: 'S3-compatible object storage with optional scoped bucket and prefix.'
  }

  return descriptions[selectedDBType.value.type] || 'Configure the required connection settings.'
})

function initializeNewConnection() {
  isCreatingConnectionStep.value = false
  connectionsStore.initializeNewConnection()
  selectedDBType.value = null
  canProceed.value = false
  testResult.value = undefined
  editorKey.value = 0
}

function beginTypeConfiguration(dbType: DbType) {
  connectionsStore.initializeNewConnection()
  connectionsStore.setConnectionType(dbType.type)
  connectionsStore.ensureSpecForType(dbType.type)
  selectedDBType.value = dbType
  canProceed.value = false
  testResult.value = undefined
  editorKey.value += 1
}

function findDbType(type: string): DbType | undefined {
  const normalized = type.toLowerCase()
  return connectionsStore.dbTypes.find((dbType) => dbType.type.toLowerCase() === normalized)
}

function handleDBTypeUpdate(dbType: DbType) {
  if (selectedDBType.value?.type.toLowerCase() === dbType.type.toLowerCase()) {
    return
  }

  beginTypeConfiguration(dbType)
}

function handleConnectionStringPrefill(params: ParsedConnectionPayload) {
  const rawType = String(params.type || '').toLowerCase()
  const targetType = rawType === 's3' ? 'S3' : rawType === 'files' ? 'Files' : params.type
  const dbType = findDbType(targetType)

  if (!dbType) {
    commonStore.showNotification('Unsupported connection string type', 'warning')
    return
  }

  beginTypeConfiguration(dbType)

  const connection = connectionsStore.currentConnection
  if (!connection) {
    return
  }

  if (dbType.type === 'Files') {
    connection.type = 'files'
    connection.spec = {
      files: {
        basePath: params.path || ''
      }
    }
    connection.host = ''
    connection.port = 0
    connection.username = 'local'
    connection.password = ''
  } else if (dbType.type === 'S3') {
    const bucket = params.database || ''
    const prefix = (params.path || '').replace(/^\/+/, '')
    const accessKey =
      params.params?.accessKey ||
      params.params?.access_key ||
      params.params?.aws_access_key_id ||
      params.username ||
      ''
    const secretKey =
      params.params?.secretKey ||
      params.params?.secret_key ||
      params.params?.aws_secret_access_key ||
      params.password ||
      ''
    const sessionToken =
      params.params?.sessionToken ||
      params.params?.session_token ||
      params.params?.aws_session_token ||
      ''
    const endpoint = params.params?.endpoint || params.params?.host || undefined
    const region = params.params?.region || params.params?.aws_region || 'us-east-1'

    connection.type = 'files'
    connection.spec = {
      s3: {
        region,
        endpoint,
        credentials: accessKey
          ? {
              accessKey,
              secretKey,
              sessionToken: sessionToken || undefined
            }
          : undefined,
        scope: bucket || prefix ? { bucket: bucket || undefined, prefix: prefix || undefined } : undefined
      }
    }
    connection.username = accessKey || 'aws-default'
    connection.password = secretKey
    connection.host = endpoint || 's3.amazonaws.com'
    connection.port = 443
  } else {
    connection.type = dbType.type.toLowerCase()
    connection.spec = {
      database: {
        host: params.host,
        port: params.port,
        username: params.username,
        password: params.password,
        database: params.database || ''
      }
    }
    connection.host = params.host
    connection.port = params.port
    connection.username = params.username
    connection.password = params.password
  }

  editorKey.value += 1
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

async function createConnection() {
  if (!selectedDBType.value) {
    commonStore.showNotification('Connection type not selected', 'error')
    return
  }

  if (!connectionsStore.currentConnection) {
    commonStore.showNotification('Connection details not provided', 'error')
    return
  }

  isCreatingConnectionStep.value = true
  try {
    await connectionsStore.createConnection()
    const newId = connectionsStore.currentConnection?.id
    await connectionsStore.refreshConnections()

    commonStore.showNotification('Connection created successfully!', 'success')

    const streamId = sessionStorage.getItem('streamWizardId')
    if (streamId !== null) {
      sessionStorage.removeItem('streamWizardReturnPane')
      sessionStorage.removeItem('streamWizardId')
      if (streamId) {
        router.push(`/streams/edit/${streamId}`)
      } else {
        router.push('/streams/create')
      }
      return
    }

    if (newId) {
      sessionStorage.setItem('explorerFocusConnectionId', newId)
    }
    router.push('/explorer')
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    commonStore.showNotification(`Failed to create connection: ${errorMessage}`, 'error')
  } finally {
    isCreatingConnectionStep.value = false
  }
}

function cancelWizard() {
  isCreatingConnectionStep.value = false
  connectionsStore.currentConnection = null

  const streamId = sessionStorage.getItem('streamWizardId')
  if (streamId !== null) {
    sessionStorage.removeItem('streamWizardReturnPane')
    sessionStorage.removeItem('streamWizardId')
    if (streamId) {
      router.push(`/streams/edit/${streamId}`)
    } else {
      router.push('/streams/create')
    }
    return
  }

  router.push('/explorer')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    cancelWizard()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  initializeNewConnection()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>
