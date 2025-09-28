<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Connection } from '@/types/connections'
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'
import { generateConnectionString } from '@/utils/connectionStringGenerator'
import {
    CalendarIcon,
    ClipboardIcon,
    CheckIcon,
    EyeIcon,
    EyeSlashIcon
} from '@heroicons/vue/24/outline'

const props = defineProps<{ connection: Connection }>()

const showPassword = ref(false)
const isCopied = ref(false)

const hostWithPort = computed(() => {
    const { host, port } = props.connection || {}
    if (!host && !port) return ''
    return `${host || ''}${port ? `:${port}` : ''}`
})

const connectionString = computed(() =>
    generateConnectionString(props.connection, showPassword.value)
)
const maskedConnectionString = computed(() => generateConnectionString(props.connection, false))

function copyConnectionString() {
    const text = showPassword.value
        ? connectionString.value
        : maskedConnectionString.value.replace(/(?<=:)[^@]+(?=@)/g, '****')
    navigator.clipboard.writeText(text).then(() => {
        isCopied.value = true
        setTimeout(() => (isCopied.value = false), 1200)
    })
}

const createdDisplay = computed(() => {
    const created = props.connection?.created
    if (!created) return ''
    const d = new Date(created * 1000)
    return d
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
</script>

<template>
    <div class="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
        <div class="px-4 py-3 border-b flex items-center justify-between">
            <div class="flex items-center gap-2">
                <h3 class="text-base font-semibold text-gray-900 truncate">Connection details</h3>
                <CloudProviderBadge :cloud-provider="connection.cloud_provider || ''" :db-type="connection.type" />
            </div>
        </div>

        <div class="p-4 space-y-6">
            <div class="grid gap-4" :class="connection.database ? 'grid-cols-2' : 'grid-cols-1'">
                <div>
                    <label class="text-xs font-medium uppercase text-gray-500">Host</label>
                    <p class="mt-1 font-medium text-gray-900 truncate" :title="hostWithPort">
                        {{ hostWithPort }}
                    </p>
                </div>
                <div v-if="connection.database">
                    <label class="text-xs font-medium uppercase text-gray-500">Database</label>
                    <p class="mt-1 font-medium text-gray-900 truncate">{{ connection.database }}</p>
                </div>
            </div>

            <div>
                <label class="text-xs font-medium uppercase text-gray-500">Connection String</label>
                <div class="mt-1 flex items-start gap-2 rounded-md bg-gray-50 p-3 font-mono text-sm">
                    <span class="flex-1 break-all text-gray-800 overflow-x-auto">
                        {{
                            showPassword
                                ? connectionString
                                : maskedConnectionString.replace(/(?<=:)[^@]+(?=@) /g, '****' ) }} </span>
                            <div class="flex flex-col gap-1">
                                <button class="flex-shrink-0 text-gray-400 hover:text-gray-600" :title="showPassword ? 'Hide password and truncate' : 'Show password and full details'
                                    " @click="showPassword = !showPassword">
                                    <EyeIcon v-if="!showPassword" class="h-4 w-4" />
                                    <EyeSlashIcon v-else class="h-4 w-4" />
                                </button>
                                <button class="flex-shrink-0 transition-colors"
                                    :class="isCopied ? 'text-green-500' : 'text-gray-400 hover:text-gray-600'"
                                    :title="isCopied ? 'Copied!' : 'Copy connection string to clipboard'"
                                    @click="copyConnectionString">
                                    <ClipboardIcon v-if="!isCopied" class="h-4 w-4" />
                                    <CheckIcon v-else class="h-4 w-4" />
                                </button>
                            </div>
                </div>
            </div>

            <div class="flex items-center gap-2 pt-2 border-t border-gray-100">
                <CalendarIcon class="h-4 w-4 text-gray-500" />
                <span class="text-sm text-gray-500 truncate">Created: {{ createdDisplay }}</span>
            </div>
        </div>
    </div>
</template>

<style scoped></style>
