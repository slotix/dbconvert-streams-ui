import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clipboard,
  Pencil,
  Play,
  SquareStack,
  Trash,
  CircleHelp
} from 'lucide-vue-next'
import { mapActions, mapState } from 'pinia'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import { useMonitoringStore } from '@/stores/monitoring'
import { defineComponent, computed, ref, type PropType } from 'vue'
import { type StreamConfig } from '@/types/streamConfig'
import { type DbType } from '@/types/connections'
import { Switch } from '@headlessui/vue'
import { getDatabaseColors, VIEW_TYPES } from '@/constants'
import { generateConnectionString } from '@/utils/connectionStringGenerator'
import ConnectionStringDisplay from '@/components/common/ConnectionStringDisplay.vue'
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'
import { normalizeConnectionType } from '@/utils/connectionUtils'
import { getDocumentationUrl } from '@/utils/documentationUtils'
import { formatDateTime } from '@/utils/formats'
import ActionsMenu from '@/components/common/ActionsMenu.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
export default defineComponent({
  props: {
    streamConfig: {
      type: Object as PropType<StreamConfig>,
      required: true
    },
    source: {
      required: true
    },
    target: {
      required: true
    }
  },
  components: {
    Pencil,
    SquareStack,
    Trash,
    Calendar,
    CheckCircle,
    ChevronRight,
    Play,
    ActionsMenu,
    Clipboard,
    Switch,
    ConnectionStringDisplay,
    AlertCircle,
    CloudProviderBadge,
    CircleHelp,
    ConfirmDialog
  },
  setup(props) {
    const dbTypes = useConnectionsStore().dbTypes
    const steps = useCommonStore().steps
    const commonStore = useCommonStore()
    const isJsonView = ref(false)
    const showDeleteConfirm = ref(false)

    const isIdExpanded = ref(false)
    const isExpanded = ref(false)

    const toggleIdExpansion = () => {
      isIdExpanded.value = !isIdExpanded.value
    }

    function copyConfig(event: Event) {
      event.preventDefault()
      if (props.streamConfig) {
        navigator.clipboard.writeText(JSON.stringify(props.streamConfig, null, 2))
        commonStore.showNotification('Configuration copied to clipboard', 'success')
      }
    }

    const prettyConfig = computed(() => {
      return JSON.stringify(props.streamConfig, null, 2)
    })

    const displayedId = computed(() => {
      if (isIdExpanded.value) {
        return props.streamConfig.id
      }
      const id = props.streamConfig.id
      return id && id.length > 13 ? `${id.slice(0, 6)}...${id.slice(-4)}` : id
    })

    return {
      dbTypes,
      steps,
      isIdExpanded,
      toggleIdExpansion,
      displayedId,
      isJsonView,
      isExpanded,
      prettyConfig,
      copyConfig,
      getDocumentationUrl,
      openDocumentation: (cloudProvider?: string, dbType?: string) => {
        const url = getDocumentationUrl(cloudProvider, dbType)
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer')
        }
      },
      showDeleteConfirm
    }
  },
  methods: {
    ...mapActions(useCommonStore, ['getViewType']),
    editStream() {
      this.selectStream()
      this.$router.push({ name: 'EditStream', params: { id: this.streamConfig.id } })
    },
    async requestDelete() {
      this.showDeleteConfirm = true
    },
    async deleteStreamConfig() {
      try {
        await useStreamsStore().deleteStreamConfig(this.streamConfig.id!)
        useCommonStore().showNotification('Stream deleted', 'success')
        this.showDeleteConfirm = false
      } catch (e: unknown) {
        if (e instanceof Error) {
          useCommonStore().showNotification(e.message, 'error')
        } else {
          useCommonStore().showNotification('An unknown error occurred', 'error')
        }
        console.log(e)
        this.showDeleteConfirm = false
      }
    },
    async cloneStreamConfig() {
      try {
        await useStreamsStore().cloneStreamConfig(this.streamConfig.id!)
        await useStreamsStore().refreshStreams()
        useCommonStore().showNotification('Stream cloned', 'success')
      } catch (e: unknown) {
        if (e instanceof Error) {
          useCommonStore().showNotification(e.message, 'error')
        } else {
          useCommonStore().showNotification('An unknown error occurred', 'error')
        }
        console.log(e)
      }
    },
    selectStream() {
      useStreamsStore().setCurrentStream(this.streamConfig.id!)
    },
    async startStream() {
      try {
        const streamID = await useStreamsStore().startStream(this.streamConfig.id!)
        useCommonStore().showNotification('Stream started', 'success')
        useMonitoringStore().setStream(streamID, this.streamConfig)
        useMonitoringStore().requestShowMonitorTab()
        this.$router.push({ name: 'Streams' })
      } catch (err: unknown) {
        if (err instanceof Error) {
          // Check if error is about active streams
          if (err.message.includes('active streams') || err.message.includes('stream_state')) {
            // Show user-friendly message
            useCommonStore().showNotification(
              'Please wait for the current stream to finish before starting a new one',
              'warning'
            )

            // Auto-retry after 2 seconds
            setTimeout(async () => {
              try {
                const streamID = await useStreamsStore().startStream(this.streamConfig.id!)
                useCommonStore().showNotification('Stream started', 'success')
                useMonitoringStore().setStream(streamID, this.streamConfig)
                useMonitoringStore().requestShowMonitorTab()
                this.$router.push({ name: 'Streams' })
              } catch (retryErr) {
                // Only show error on retry failure, don't retry again
                if (retryErr instanceof Error) {
                  useCommonStore().showNotification(retryErr.message, 'error')
                }
              }
            }, 2000)
          } else {
            useCommonStore().showNotification(err.message, 'error')
          }
        } else {
          useCommonStore().showNotification('An unknown error occurred', 'error')
        }
      }
    },
    copyId() {
      navigator.clipboard.writeText(this.streamConfig.id!).then(
        () => {
          const commonStore = useCommonStore()
          commonStore.showNotification('Stream ID copied to clipboard', 'success')
        },
        (err) => {
          console.error('Could not copy text: ', err)
          useCommonStore().showNotification('Failed to copy Stream ID', 'error')
        }
      )
    }
  },
  computed: {
    ...mapState(useStreamsStore, ['currentStreamConfig']),
    streamCreated(): string {
      return formatDateTime(this.streamConfig?.created || 0)
    },
    logoSrc(): (tp: string) => string {
      return (tp: string) => {
        const normalizedInput = normalizeConnectionType(tp?.toLowerCase() || '')
        const dbType = this.dbTypes.find(
          (f: DbType) => normalizeConnectionType(f.type.toLowerCase()) === normalizedInput
        )
        return dbType ? dbType.logo : '/images/db-logos/all.svg' // Fallback to generic logo
      }
    },
    getDatabaseIconStyle(): (dbType: string) => string {
      return (dbType: string) => {
        const normalizedType = normalizeConnectionType(dbType?.toLowerCase() || '')
        const colors = getDatabaseColors(normalizedType)
        return `${colors.bg} ring-2 ${colors.ring}`
      }
    },
    index(): number {
      return useStreamsStore().currentStreamIndexInArray
    },
    rowCount(): number {
      return useStreamsStore().countStreams
    },
    actionsMenuPosition(): string {
      if (useCommonStore().currentViewType === VIEW_TYPES.CARDS) {
        return 'card'
      }
      const index = this.index
      const rowCount = this.rowCount
      return index > rowCount / 2 ? 'top' : 'bottom'
    },
    streamNameWithId(): string {
      if (!this.streamConfig) return ''
      return `ID: ${this.streamConfig.id}`
    },
    displayedTables(): string[] {
      const maxDisplayedTables = 5 // Adjust this number as needed
      if (!this.streamConfig?.source?.connections) return []

      // Collect tables from all connections
      const allTables: string[] = []
      for (const conn of this.streamConfig.source.connections) {
        if (conn.tables) {
          allTables.push(...conn.tables.map((t) => t.name))
        }
      }
      return allTables.slice(0, maxDisplayedTables)
    },
    remainingTablesCount(): number {
      if (!this.streamConfig?.source?.connections) return 0

      // Count tables from all connections
      let totalTables = 0
      for (const conn of this.streamConfig.source.connections) {
        if (conn.tables) {
          totalTables += conn.tables.length
        }
      }
      return Math.max(0, totalTables - this.displayedTables.length)
    },
    sourceConnectionString(): string {
      const sourceConnectionId = this.streamConfig?.source?.connections?.[0]?.connectionId || ''
      const sourceConnection = useConnectionsStore().connectionByID(sourceConnectionId)
      if (!sourceConnection) return ''
      return generateConnectionString(sourceConnection)
    },
    targetConnectionString(): string {
      const targetConnection = useConnectionsStore().connectionByID(
        this.streamConfig?.target?.id || ''
      )
      if (!targetConnection) return ''
      return generateConnectionString(targetConnection)
    }
  },
  async mounted() {
    await this.getViewType()
  }
})
