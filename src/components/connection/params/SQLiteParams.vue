<template>
  <div>
    <connection-name v-model:name="connection.name" />
    <hr />
    <div class="bg-white bg-opacity-5">
      <div
        class="items-center text-center md:text-left w-full p-4 space-y-4 text-gray-500 lg:inline-flex lg:space-y-0"
      >
        <label class="w-full overflow-hidden max-w-sm mx-auto lg:w-1/3">
          SQLite Database (.db)
        </label>
        <upload-box
          :id="uploadBoxId"
          class="w-full overflow-auto lg:w-2/3"
          :multiple="false"
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
  name: 'SQLiteParams',
  components: {
    UploadBox,
    ConnectionName
  },
  data: () => ({
    connection: {
      name: '',
      fileName: ''
    },
    connectionType: 'SQLite',
    accept: '.db',
    uploadBoxId: 'uploadSQLiteFile'
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
