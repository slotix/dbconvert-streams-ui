<template>
  <div class="overflow-y-auto h-112 bg-white bg-opacity-5 text-center md:text-left">
    <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
      <label class="max-w-sm mx-auto md:w-1/3"> Host </label>
      <div class="max-w-sm mx-auto md:w-2/3">
        <div class="relative">
          <input
            v-model.lazy="ssh.host"
            type="text"
            class="rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
            placeholder=""
          />
        </div>
      </div>
    </div>
    <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
      <label class="max-w-sm mx-auto md:w-1/3"> Port </label>
      <div class="max-w-sm mx-auto md:w-2/3">
        <div class="relative">
          <input
            v-model.number.lazy="ssh.port"
            type="number"
            class="rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
            placeholder=""
          />
        </div>
      </div>
    </div>
    <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
      <label class="max-w-sm mx-auto md:w-1/3"> Local Port </label>
      <div class="max-w-sm mx-auto md:w-2/3">
        <div class="relative">
          <input
            v-model.number.lazy="ssh.localPort"
            type="number"
            class="rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
            placeholder=""
          />
        </div>
      </div>
    </div>
    <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
      <label class="max-w-sm mx-auto md:w-1/3"> Version </label>
      <div class="max-w-sm mx-auto md:w-2/3">
        <div class="relative">
          <select
            v-model.lazy="ssh.version"
            class="rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
            placeholder=""
          >
            <option v-for="v in versions" :key="v">
              {{ v }}
            </option>
          </select>
        </div>
      </div>
    </div>
    <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
      <label class="max-w-sm mx-auto md:w-1/3"> Version </label>
      <div class="max-w-sm mx-auto md:w-2/3">
        <div class="relative">
          <input
            v-model.lazy="ssh.sshAuthType"
            type="text"
            class="rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
            placeholder=""
          />
        </div>
      </div>
    </div>
    <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
      <label class="max-w-sm mx-auto md:w-1/3"> SSH Login </label>

      <div class="max-w-sm mx-auto md:w-2/3">
        <div class="relative">
          <input
            v-model.lazy="ssh.login"
            type="text"
            class="rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
            placeholder=""
          />
        </div>
      </div>
    </div>
    <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
      <label class="max-w-sm mx-auto md:w-1/3"> SSH Password </label>

      <div class="max-w-sm mx-auto md:w-2/3">
        <div class="relative">
          <input
            v-model.trim.lazy="ssh.password"
            type="password"
            class="rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
            placeholder=""
          />
        </div>
      </div>
    </div>
    <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
      <label class="max-w-sm mx-auto md:w-1/3"> Private Key </label>

      <upload-box :id="uploadBoxId" class="w-full overflow-auto md:w-2/3" :multiple="false" />
    </div>
    <div class="items-center w-full p-4 space-y-4 text-gray-500 md:inline-flex md:space-y-0">
      <label class="max-w-sm mx-auto md:w-1/3"> Key Password </label>

      <div class="max-w-sm mx-auto md:w-2/3">
        <div class="relative">
          <input
            v-model.lazy="ssh.keyPassword"
            type="password"
            class="rounded-lg border-transparent flex-1 appearance-none border border-gray-300 w-full py-2 px-4 bg-white text-gray-700 placeholder-gray-400 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
            placeholder=""
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useConnectionsStore } from '@/stores/connections'
import { mapActions } from 'pinia'
import UploadBox from '../../UploadBox.vue'
export default {
  name: 'SSHParams',
  components: {
    UploadBox
  },
  data: () => ({
    ssh: {
      host: '',
      port: 22,
      localPort: '',
      version: 'SSH2',
      login: '',
      password: '',
      privateKey: '',
      keyPassword: '',
      fileName: ''
    },
    versions: ['SSH1', 'SSH2'],
    sshAuthType: ['password', 'public key'],
    uploadBoxId: 'uploadPrivateKey'
  }),
  methods: {
    ...mapActions(useConnectionsStore, ['updateSSHParams'])
  },
  watch: {
    ssh: {
      handler() {
        if (this.ssh.host !== '') {
          this.updateSSHParams(this.ssh)
        }
      },
      deep: true
    }
  }
}
</script>

<style>
.h-112 {
  height: 32rem;
}
</style>
