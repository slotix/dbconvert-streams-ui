<template>
  <td class="px-5 py-5" @click="selectConnection">
    <div class="flex items-center">
      <div class="flex-shrink-0">
        <img
          :src="logoSrc"
          :alt="connection.type + ' logo'"
          class="mx-auto object-cover rounded-full h-6 w-6 hidden md:table-cell"
        />
      </div>
      <div class="ml-3 flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-900 font-medium">{{ connection.name }}</span>
          <CloudProviderBadge :cloud-provider="connection.cloud_provider" :db-type="connection.type" size="sm" />
        </div>
        <span v-if="connection.id" class="text-xs text-gray-500">{{ connection.id }}</span>
      </div>
    </div>
  </td>
  <td class="hidden px-5 py-5 lg:table-cell" @click="selectConnection">
    <span class="text-gray-600 whitespace-no-wrap">
      {{ concatenateValues }}
    </span>
  </td>
  <td class="hidden px-5 py-5 lg:table-cell" @click="selectConnection">
    <span class="text-gray-600 whitespace-no-wrap">
      {{ connection.database }}
    </span>
  </td>
  <td class="hidden px-5 py-5 lg:table-cell" @click="selectConnection">
    <span class="text-gray-600 whitespace-no-wrap">
      {{ connectionCreated }}
    </span>
  </td>
  <td class="px-5 py-5 text-center">
    <button class="text-gray-600 hover:text-gray-900" @click.stop="exploreConnection">
      <TableCellsIcon class="h-5 w-5" aria-hidden="true" />
      <span class="sr-only">Explore {{ connection.name }}</span>
    </button>
  </td>
  <td class="px-5 py-5 text-center">
    <button class="text-gray-600 hover:text-gray-900" @click.stop="editConnection">
      <PencilIcon class="h-5 w-5" aria-hidden="true" />
      <span class="sr-only">Edit {{ connection.name }}</span>
    </button>
  </td>
  <td class="px-5 py-5">
    <ActionsMenu
      :position="actionsMenuPosition"
      :viewType="'table'"
      @selectRow="selectConnection"
      @editRow="editConnection"
      @cloneRow="cloneConnection"
      @deleteRow="deleteConn"
    />
  </td>
</template>

<script>
import ActionsMenu from '@/components/common/ActionsMenu.vue'
import CloudProviderBadge from '@/components/common/CloudProviderBadge.vue'
import shared from './shared'
import { PencilIcon, TableCellsIcon } from '@heroicons/vue/24/outline'
export default Object.assign({}, shared, {
  props: {
    connection: {
      type: Object,
      required: true
    }
  },
  components: {
    ActionsMenu,
    CloudProviderBadge,
    PencilIcon,
    TableCellsIcon
  }
})
</script>
