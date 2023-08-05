<template>
  <div class="bg-white bg-opacity-5 text-center md:text-left">
    <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
      <label class="max-w-sm mx-auto md:w-1/3"> Private Key </label>

      <upload-box class="w-full overflow-auto md:w-2/3" :id="uploadPrivateKey" :multiple="false" />
    </div>
    <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
      <label class="max-w-sm mx-auto md:w-1/3"> Cipher </label>

      <div class="max-w-sm mx-auto md:w-2/3">
        <div class="relative">
          <input
            v-model.lazy="ssl.cipher"
            type="password"
            class="rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
            placeholder=""
          />
        </div>
      </div>
    </div>
    <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
      <label class="max-w-sm mx-auto md:w-1/3"> Client Cert </label>

      <upload-box class="w-full overflow-auto md:w-2/3" :id="uploadClientCert" :multiple="false" />
    </div>
  </div>
</template>

<script>
import { useConnectionsStore } from '@/stores/connections.js'
import { mapActions } from 'pinia'
import UploadBox from '../../UploadBox.vue'
export default {
  name: 'SSLParams',
  components: {
    UploadBox
  },
  data: () => ({
    ssl: {
      caCert: '',
      cipher: '',
      clientCert: '',
      clientKey: ''
    },
    uploadPrivateKey: 'uploadPrivateKey',
    uploadClientCert: 'uploadClientCert'
  }),
  methods: {
    ...mapActions(useConnectionsStore, ['updateSSLParams'])
  },
  watch: {
    ssh: {
      handler() {
        if (this.ssh.cipher !== '') {
          this.updateSSLParams(this.ssl)
        }
      },
      deep: true
    }
  }
}
</script>

<style></style>
