<template>
  <div>
    <connection-name v-model:name="connection.name" />
    <hr />
    <div class="bg-white bg-opacity-5 text-center md:text-left">
      <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
        <label class="max-w-sm mx-auto md:w-1/3">
          FoxPro Database(.dbc) or FoxPro free tables(.dbf)
        </label>

        <upload-box
          :id="uploadBoxId"
          class="w-full overflow-auto md:w-2/3"
          :multiple="true"
          :accept="accept"
          @changeFileName="changeFileName"
        />
      </div>
    </div>
  </div>
</template>

<script>
import UploadBox from '../../UploadBox.vue'
import ConnectionName from './ConnectionName.vue'
import { useCommonStore, DIALOG_TYPES } from '@/stores/common'
import { useConnectionsStore } from '@/stores/connections'
import { mapWritableState } from 'pinia'

export default {
  name: 'FoxproParams',
  components: {
    UploadBox,
    ConnectionName
  },
  data: () => ({
    connection: {
      name: '',
      fileName: ''
    },
    connectionType: 'FoxPro',
    accept: '.dbc,.dbf',
    uploadBoxId: 'uploadFoxProFile'
  }),
  mounted() {
    if (this.dlgTp === DIALOG_TYPES.SAVE) {
      this.connection.name = this.buildConnectionName
    }
    this.connection.type = this.connectionType
  },
  activated() {
    if (this.dlgTp === DIALOG_TYPES.SAVE) {
      this.currentConnection = this.connection
    } else {
      this.connection = this.currentConnection
    }
  },
  methods: {
    changeFileName(fileName) {
      this.connection.fileName = fileName
      this.connection.name = this.buildConnectionName
    }
  },
  computed: {
    ...mapWritableState(useConnectionsStore, ['currentConnection']),
    buildConnectionName() {
      return this.connectionType + '_' + this.connection.fileName
    },
    dlgTp() {
      return useCommonStore().dlgType
    }
  },
  watch: {
    'connection.fileName': function () {
      if (this.dlgTp === DIALOG_TYPES.SAVE) {
        this.connection.name = this.buildConnectionName
      }
    },
    connection: {
      handler() {
        this.currentConnection = this.connection
      },
      deep: true
    }
  }
}
</script>
