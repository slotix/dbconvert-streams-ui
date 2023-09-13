<template>
  <Menu as="div" class="relative inline-block text-left">
    <MenuButton
      class="flex items-center rounded-full ring-gray-100 text-gray-600 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-100"
      @click="$emit('selectRow')"
    >
      <span class="sr-only">Open actions</span>
      <EllipsisHorizontalIcon class="h-6 w-6 mr-5 ml-5" aria-hidden="true" />
      <span v-show="viewType === 'cards'"> Actions </span>
    </MenuButton>

    <transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <MenuItems
        class="absolute right-0 z-10 mt-2 w-56 divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
        :class="{
          'bottom-10': position === 'bottom',
          'left-4 bottom-16 ': position === 'card'
        }"
      >
        <div class="py-1">
          <!-- <router-link :to="{ name: 'ManageStream', params: { mode: 'edit' } }"> -->
          <MenuItem v-slot="{ active }">
            <a
              href="#"
              :class="[
                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                'group flex items-center px-4 py-2 text-sm'
              ]"
              @click="$emit('editRow')"
            >
              <PencilIcon
                class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                aria-hidden="true"
              />
              Edit
            </a>
          </MenuItem>
          <!-- </router-link> -->
          <MenuItem v-slot="{ active }">
            <a
              href="#"
              :class="[
                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                'group flex items-center px-4 py-2 text-sm'
              ]"
              @click="$emit('cloneRow')"
            >
              <Square2StackIcon
                class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                aria-hidden="true"
              />
              Clone
            </a>
          </MenuItem>
        </div>
        <div class="py-1">
          <MenuItem v-slot="{ active }">
            <a
              href="#"
              :class="[
                active ? 'bg-gray-100 text-red-500' : 'text-red-600',
                'group flex items-center px-4 py-2 text-sm'
              ]"
              @click="$emit('deleteRow')"
            >
              <TrashIcon
                class="mr-3 h-5 w-5 text-red-600 group-hover:text-red-500"
                aria-hidden="true"
              />
              Delete
            </a>
          </MenuItem>
        </div>
      </MenuItems>
    </transition>
  </Menu>
</template>

<script setup>
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import {
  Square2StackIcon,
  PencilIcon,
  TrashIcon,
  EllipsisHorizontalIcon
} from '@heroicons/vue/24/solid'
import { useSettingsStore } from '@/stores/settings.js'
import { computed } from 'vue'
const props = defineProps(['position'])
const viewType = computed(() => {
  return useSettingsStore().currentViewType
})
</script>
