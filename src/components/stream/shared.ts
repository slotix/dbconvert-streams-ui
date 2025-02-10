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
import { ClipboardIcon } from '@heroicons/vue/24/outline'
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
    ExclamationCircleIcon
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
      copyConfig
    }
  },
  methods: {
    ...mapActions(useCommonStore, ['getViewType']),
    editStream() {
      this.selectStream()
      this.$router.push({ name: 'ManageStream', params: { mode: 'edit' } })
    },
    async deleteStreamConfig() {
      if (!confirm('Are you sure you want to delete this stream?')) {
        return
      }
      try {
        await useStreamsStore().deleteStreamConfig(this.streamConfig.id)
        await useStreamsStore().refreshStreams()
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
        const dbType = this.dbTypes.find((f: DbType) => f.type === tp)
        return dbType ? dbType.logo : ''
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
