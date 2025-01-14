<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLogsStore, type SystemLog } from '@/stores/logs'
import { TransitionRoot, TransitionChild } from '@headlessui/vue'
import { XMarkIcon, FunnelIcon } from '@heroicons/vue/24/outline'

interface LogColumn {
    type: string
    nodeId?: string
    nodes: Record<string, SystemLog[]>
}

const store = useLogsStore()
const isOpen = computed(() => store.isLogsPanelOpen)

function formatTimestamp(timestamp: number): string {
    // Convert milliseconds to seconds if needed
    const timestampInMs = timestamp < 1e12 ? timestamp * 1000 : timestamp
    const date = new Date(timestampInMs)
    return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    })
}

function getNodeType(source: string): string {
    const [type] = source.split(':')
    return type
}

function getNodeId(source: string): string {
    const [, id] = source.split(':')
    return id
}

function getNodeColor(type: string): string {
    switch (type) {
        case 'api':
            return 'text-blue-600'
        case 'source':
            return 'text-orange-600'
        case 'target':
            return 'text-cyan-600'
        default:
            return 'text-gray-600'
    }
}

function getMessageTypeColor(message: string): string {
    if (message.toLowerCase().includes('error')) return 'bg-red-50/80 border-l-4 border-red-400 shadow-sm'
    if (message.toLowerCase().includes('warn')) return 'bg-yellow-50/80 border-l-4 border-yellow-400 shadow-sm'
    if (message.startsWith('[progress]')) return 'bg-blue-50/80 border-l-4 border-blue-400 shadow-sm'
    if (message.startsWith('[stat]')) return 'bg-emerald-50/80 border-l-4 border-emerald-400 shadow-sm'
    return 'hover:bg-gray-50 border-l-4 border-gray-300'
}

function getMessageIcon(message: string): string {
    const msg = message.toLowerCase()
    if (msg.includes('error')) return '●'
    if (msg.includes('warn')) return '●'
    if (msg.startsWith('[progress]')) return '●'
    if (msg.startsWith('[stat]')) return '●'
    return '●'
}

function getMessageIconColor(message: string): string {
    const msg = message.toLowerCase()
    if (msg.includes('error')) return 'text-red-500'
    if (msg.includes('warn')) return 'text-yellow-500'
    if (msg.startsWith('[progress]')) return 'text-blue-500'
    if (msg.startsWith('[stat]')) return 'text-emerald-500'
    return 'text-gray-400'
}

const messageTypes = ['all', 'error & warning', 'progress & stats', 'info']
const selectedMessageType = ref('all')

const groupedLogs = computed(() => {
    const groups: Record<string, Record<string, SystemLog[]>> = {
        'api': {},
        'source': {},
        'target': {}
    }

    // Group logs and sort them by timestamp (newest first)
    store.logs.forEach(log => {
        const source = log.source || ''
        const nodeType = getNodeType(source)
        const nodeId = getNodeId(source)

        if (!groups[nodeType]) return

        if (!groups[nodeType][nodeId]) {
            groups[nodeType][nodeId] = []
        }

        groups[nodeType][nodeId].push(log)
    })

    // Sort each group's logs by timestamp (newest first)
    Object.values(groups).forEach(nodeGroups => {
        Object.values(nodeGroups).forEach(logs => {
            logs.sort((a, b) => b.timestamp - a.timestamp)
        })
    })

    return groups
})

const nodeColumns = computed(() => {
    const columns: LogColumn[] = []

    // Add API column
    if (Object.keys(groupedLogs.value['api']).length > 0) {
        columns.push({ type: 'api', nodes: groupedLogs.value['api'] })
    }

    // Add 0ource column
    if (Object.keys(groupedLogs.value['source']).length > 0) {
        columns.push({ type: 'source', nodes: groupedLogs.value['source'] })
    }

    // Add Target columns (can be multiple)
    const targetNodes = Object.keys(groupedLogs.value['target'])
    targetNodes.forEach(nodeId => {
        columns.push({
            type: 'target',
            nodeId,
            nodes: { [nodeId]: groupedLogs.value['target'][nodeId] }
        })
    })

    return columns
})

const totalLogs = computed(() => {
    return store.logs.length
})

function getShortNodeId(id: string): string {
    return id.split('_').pop()?.slice(0, 8) || id
}

const selectedTab = ref<string>('api')

const tabs = computed(() => {
    return nodeColumns.value.map(col => ({
        id: col.type + (col.nodeId || ''),
        label: col.type + (col.nodeId ? ` (${getShortNodeId(col.nodeId)})` : ''),
        type: col.type,
        nodeId: col.nodeId,
        count: Object.values(col.nodes).flat().length
    }))
})

const selectedColumn = computed(() =>
    nodeColumns.value.find(col =>
        col.type + (col.nodeId || '') === selectedTab.value
    )
)

const filteredLogs = computed(() => {
    if (selectedMessageType.value === 'all') return selectedColumn.value?.nodes || {}

    const filtered: Record<string, SystemLog[]> = {}
    if (!selectedColumn.value) return filtered

    Object.entries(selectedColumn.value.nodes).forEach(([nodeId, logs]) => {
        filtered[nodeId] = logs.filter(log => {
            const msg = log.message.toLowerCase()
            switch (selectedMessageType.value) {
                case 'error & warning': return msg.includes('error') || msg.includes('warn')
                case 'progress & stats': return msg.startsWith('[progress]') || msg.startsWith('[stat]')
                case 'info': return !msg.includes('error') && !msg.includes('warn')
                    && !msg.startsWith('[progress]') && !msg.startsWith('[stat]')
                default: return true
            }
        })
    })
    return filtered
})
</script>

<template>
    <TransitionRoot as="template" :show="isOpen">
        <div class="relative z-30">
            <div class="fixed inset-x-0 bottom-0 max-h-[50vh]">
                <TransitionChild as="template" enter="transform transition ease-in-out duration-300"
                    enter-from="translate-y-full" enter-to="translate-y-0"
                    leave="transform transition ease-in-out duration-300" leave-from="translate-y-0"
                    leave-to="translate-y-full">
                    <div
                        class="w-full h-full bg-white shadow-xl rounded-t-lg overflow-hidden border border-gray-200 lg:pl-20">
                        <div class="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
                            <div class="flex items-center">
                                <h2 class="text-lg font-medium text-gray-900">System Logs</h2>
                                <span class="ml-2 text-sm text-gray-500">{{ totalLogs }} entries</span>
                            </div>
                            <div class="flex items-center space-x-2">
                                <button type="button"
                                    class="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                                    @click="store.clearLogs">
                                    Clear
                                </button>
                                <button type="button" class="text-gray-400 hover:text-gray-600 transition-colors"
                                    @click="store.toggleLogsPanel">
                                    <XMarkIcon class="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        <!-- Tab Navigation -->
                        <div class="bg-white px-4 overflow-x-auto border-b border-gray-200">
                            <nav class="flex space-x-4 min-w-max py-2" aria-label="Tabs">
                                <button v-for="tab in tabs" :key="tab.id" @click="selectedTab = tab.id"
                                    class="group relative px-4 py-2 text-sm font-medium rounded-md focus:outline-none transition-all duration-200"
                                    :class="[
                                        selectedTab === tab.id
                                            ? 'text-gray-900 bg-gray-100 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    ]">
                                    <div class="flex items-center space-x-2">
                                        <span :class="[getNodeColor(tab.type), 'capitalize font-semibold']">
                                            {{ tab.type }}
                                        </span>
                                        <template v-if="tab.nodeId">
                                            <span class="text-xs px-1.5 py-0.5 rounded" :class="[
                                                selectedTab === tab.id
                                                    ? 'bg-white text-gray-600'
                                                    : 'bg-gray-100 text-gray-600'
                                            ]">
                                                #{{ getShortNodeId(tab.nodeId) }}
                                            </span>
                                        </template>
                                        <span class="text-xs px-1.5 py-0.5 rounded-full" :class="[
                                            selectedTab === tab.id
                                                ? 'bg-white text-gray-600'
                                                : 'bg-gray-100 text-gray-600'
                                        ]">
                                            {{ tab.count }}
                                        </span>
                                    </div>
                                    <div class="absolute bottom-0 left-0 w-full h-0.5 transition-colors duration-200"
                                        :class="[
                                            selectedTab === tab.id
                                                ? getNodeColor(tab.type)
                                                : 'bg-transparent'
                                        ]" />

                                </button>
                            </nav>
                        </div>

                        <!-- Message Type Filter -->
                        <div class="bg-white px-4 py-2 flex items-center space-x-3 border-b border-gray-200">
                            <FunnelIcon class="h-4 w-4 text-gray-400" />
                            <div class="flex flex-wrap gap-1">
                                <button v-for="type in messageTypes" :key="type" @click="selectedMessageType = type"
                                    class="px-2.5 py-1 text-xs rounded-full transition-colors duration-200" :class="[
                                        selectedMessageType === type
                                            ? 'bg-gray-700 text-white'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                    ]">
                                    {{ type }}
                                </button>
                            </div>
                        </div>

                        <div v-if="selectedColumn" class="overflow-y-auto h-full px-4 bg-white"
                            style="max-height: calc(50vh - 132px)">
                            <table class="w-full">
                                <tbody class="divide-y divide-gray-100">
                                    <template v-for="(logs, nodeId) in filteredLogs" :key="nodeId">
                                        <tr v-for="log in logs" :key="log.id" class="group transition-all duration-200"
                                            :class="[getMessageTypeColor(log.message)]">
                                            <td class="w-24 py-2 px-4">
                                                <span
                                                    class="font-mono text-xs text-gray-500 tabular-nums whitespace-nowrap">
                                                    {{ formatTimestamp(log.timestamp) }}
                                                </span>
                                            </td>
                                            <td class="py-2 px-4">
                                                <div class="flex items-center space-x-3">
                                                    <span
                                                        class="flex-shrink-0 text-lg leading-none transform transition-transform group-hover:scale-110"
                                                        :class="[getMessageIconColor(log.message)]">
                                                        {{ getMessageIcon(log.message) }}
                                                    </span>
                                                    <span
                                                        class="text-sm text-gray-900 break-words font-mono leading-relaxed">
                                                        {{ log.message }}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    </template>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TransitionChild>
            </div>
        </div>
    </TransitionRoot>
</template>