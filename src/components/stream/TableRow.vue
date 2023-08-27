<template class="hover:bg-gray-100">
  <td class="px-5 py-5 border-b border-gray-200 bg-white cursor-pointer" @click="selectStream">
    <div class="flex items-center">
      <div class="item w-2/5 flex">
        <img
          class="h-6 w-6 rounded-full"
          :src="logoSrc(this.source.type)"
          :alt="source.type + ' logo'"
        />
        <ChevronRightIcon class="h-6 w-6 pt-1 text-gray-500" aria-hidden="true" />
        <img
          class="h-6 w-6 rounded-full"
          :src="logoSrc(this.target.type)"
          :alt="target.type + ' logo'"
        />
      </div>
      <span class="ml-3 text-gray-900 font-medium whitespace-no-wrap">
        {{ stream.id }}
      </span>
    </div>
  </td>
  <td
    class="hidden px-5 py-5 border-b border-gray-200 bg-white cursor-pointer lg:table-cell"
    @click="selectStream"
  >
    <span class="text-gray-600 whitespace-no-wrap">
      {{ source.name }}
    </span>
  </td>
  <td
    class="hidden px-5 py-5 border-b border-gray-200 bg-white cursor-pointer lg:table-cell"
    @click="selectStream"
  >
    <span class="text-gray-600 whitespace-no-wrap">
      {{ target.name }}
    </span>
  </td>
  <td
    class="hidden px-5 py-5 border-b border-gray-200 bg-white cursor-pointer lg:table-cell"
    @click="selectStream"
  >
    <span class="text-gray-600 whitespace-no-wrap">
      {{ streamCreated }}
    </span>
  </td>
  <td class="px-5 py-5 border-b border-gray-200 bg-white cursor-pointer">
    <button class="text-gray-600 hover:text-gray-900" @click="editStream">
      Edit<span class="sr-only">, {{ stream.id }}</span>
    </button>
  </td>
  <td class="px-5 py-5 border-b border-gray-200 bg-white cursor-pointer">
    <button class="text-gray-600 hover:text-gray-900" @click="cloneStream">
      Clone<span class="sr-only">, {{ stream.id }}</span>
    </button>
  </td>
  <td class="px-5 py-5 border-b border-gray-200 bg-white cursor-pointer">
    <button class="text-gray-600 hover:text-gray-900" @click="deleteStream(stream.id)">
      Delete<span class="sr-only">, {{ stream.id }}</span>
    </button>
  </td>
</template>

<script>


import { ChevronRightIcon } from '@heroicons/vue/24/outline'
import { useStreamsStore } from '@/stores/streams.js'
import { useConnectionsStore } from '@/stores/connections.js'
// import shared from './shared.js'
// export default Object.assign({}, shared, {
export default {
  components: {
    ChevronRightIcon
  },
  props: {
    stream: {
      type: Object,
      required: true
    },
    source: {
      type: Object,
      required: true
    },
    target: {
      type: Object,
      required: true
    }
  },
  setup() {
    const dbTypes = useConnectionsStore().dbTypes
    return {
      dbTypes
    }
  },
  methods: {
    async deleteStream(id) {
      try {
        await useStreamsStore().deleteStream(id)
        await useStreamsStore().refreshStreams()
      } catch (e) {
        console.log(e)
      }
    }
  },
  computed: {
    streamCreated() {
      let date = new Date(this.stream.id)
      return date.toLocaleDateString() + ' - ' + date.toLocaleTimeString()
      //return date.toUTCString();
    },
    logoSrc() {
      return (tp) => {
        let dbType = this.dbTypes.filter((f) => {
          return f.type === tp
        })
        return dbType[0].logo
      }
    }
  }
}
// })
</script>

<style></style>
