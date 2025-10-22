import {
  CalendarIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  PencilIcon,
  PlayIcon,
  Square2StackIcon,
  TrashIcon,
  ExclamationCircleIcon
} from '@heroicons/vue/24/solid'
import { ClipboardIcon, QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'
import { mapActions, mapState } from 'pinia'
import { useStreamsStore } from '@/stores/streamConfig'
import { useConnectionsStore } from '@/stores/connections'
import { useCommonStore } from '@/stores/common'
import { useMonitoringStore } from '@/stores/monitoring'
import ActionsMenu from '@/components/common/ActionsMenu.vue'
import { defineComponent, computed, ref, type PropType } from 'vue'
import { type StreamConfig } from '@/types/streamConfig'
import { type DbType } from '@/types/connections'
import { Switch } from '@headlessui/vue'
import { generateConnectionString } from '@/utils/connectionStringGenerator'
import ConnectionStringDisplay from '@/components/common/ConnectionStringDisplay.vue'
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'
import { normalizeConnectionType } from '@/utils/connectionUtils'
import { getDocumentationUrl } from '@/utils/documentationUtils'
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
    PencilIcon,
    Square2StackIcon,
    TrashIcon,
    CalendarIcon,
    CheckCircleIcon,
    ChevronRightIcon,
    PlayIcon,
    ActionsMenu,
    ClipboardIcon,
    Switch,
    ConnectionStringDisplay,
    ExclamationCircleIcon,
    CloudProviderBadge,
    QuestionMarkCircleIcon
  },
  setup(props) {
    const dbTypes = useConnectionsStore().dbTypes
    const steps = useCommonStore().steps
    const commonStore = useCommonStore()
    const isJsonView = ref(false)

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
      return id.length > 13 ? `${id.slice(0, 6)}...${id.slice(-4)}` : id
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
      }
    }
  },
  methods: {
    ...mapActions(useCommonStore, ['getViewType']),
    editStream() {
      this.selectStream()
      this.$router.push({ name: 'EditStream', params: { id: this.streamConfig.id } })
    },
    async deleteStreamConfig() {
      if (!confirm('Are you sure you want to delete this stream?')) {
        return
      }
      try {
        await useStreamsStore().deleteStreamConfig(this.streamConfig.id)
        useCommonStore().showNotification('Stream deleted', 'success')
      } catch (e: unknown) {
        if (e instanceof Error) {
          useCommonStore().showNotification(e.message, 'error')
        } else {
          useCommonStore().showNotification('An unknown error occurred', 'error')
        }
        console.log(e)
      }
    },
    async cloneStreamConfig() {
      try {
        await useStreamsStore().cloneStreamConfig(this.streamConfig.id)
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
      useStreamsStore().setCurrentStream(this.streamConfig.id)
    },
    async startStream() {
      try {
        const streamID = await useStreamsStore().startStream(this.streamConfig.id)
        useCommonStore().showNotification('Stream started', 'success')
        useMonitoringStore().setStream(streamID, this.streamConfig)
        this.$router.push({ name: 'MonitorStream' })
      } catch (err: unknown) {
        if (err instanceof Error) {
          useCommonStore().showNotification(err.message, 'error')
        } else {
          useCommonStore().showNotification('An unknown error occurred', 'error')
        }
      }
    },
    copyId() {
      navigator.clipboard.writeText(this.streamConfig.id).then(
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
      if (!this.streamConfig || typeof this.streamConfig.created !== 'number') return ''
      const date = new Date(this.streamConfig.created * 1000)
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

        // Database-specific brand colors with subtle backgrounds
        const styles: Record<string, string> = {
          postgresql: 'bg-blue-100 ring-2 ring-blue-200/50',
          postgres: 'bg-blue-100 ring-2 ring-blue-200/50',
          mysql: 'bg-orange-100 ring-2 ring-orange-200/50',
          mongodb: 'bg-green-100 ring-2 ring-green-200/50',
          mongo: 'bg-green-100 ring-2 ring-green-200/50',
          redis: 'bg-red-100 ring-2 ring-red-200/50',
          sqlite: 'bg-gray-100 ring-2 ring-gray-200/50',
          mariadb: 'bg-orange-100 ring-2 ring-orange-200/50',
          mssql: 'bg-blue-100 ring-2 ring-blue-200/50',
          sqlserver: 'bg-blue-100 ring-2 ring-blue-200/50',
          oracle: 'bg-red-100 ring-2 ring-red-200/50',
          cassandra: 'bg-purple-100 ring-2 ring-purple-200/50',
          elasticsearch: 'bg-yellow-100 ring-2 ring-yellow-200/50',
          clickhouse: 'bg-yellow-100 ring-2 ring-yellow-200/50'
        }

        return styles[normalizedType] || 'bg-gray-100 ring-2 ring-gray-200/50'
      }
    },
    index(): number {
      return useStreamsStore().currentStreamIndexInArray
    },
    rowCount(): number {
      return useStreamsStore().countStreams
    },
    actionsMenuPosition(): string {
      if (useCommonStore().currentViewType === 'cards') {
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
      if (this.streamConfig && this.streamConfig.tables && this.streamConfig.tables.length) {
        return this.streamConfig.tables.slice(0, maxDisplayedTables).map((table) => table.name)
      }
      return []
    },
    remainingTablesCount(): number {
      if (this.streamConfig && this.streamConfig.tables) {
        return Math.max(0, this.streamConfig.tables.length - this.displayedTables.length)
      }
      return 0
    },
    sourceConnectionString(): string {
      const sourceConnection = useConnectionsStore().connectionByID(this.streamConfig?.source || '')
      if (!sourceConnection) return ''
      return generateConnectionString(sourceConnection)
    },
    targetConnectionString(): string {
      const targetConnection = useConnectionsStore().connectionByID(this.streamConfig?.target || '')
      if (!targetConnection) return ''
      return generateConnectionString(targetConnection)
    }
  },
  async mounted() {
    await this.getViewType()
  }
})
