<template>
  <Menu as="div" class="relative inline-block text-left">
    <MenuButton
      class="relative inline-flex items-center justify-center w-full h-full py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300"
      @click="$emit('selectRow')"
    >
      <span class="sr-only">Open actions</span>
      <div class="flex items-center gap-1">
        <MoreHorizontal :class="iconSizes.sidebarMenu" aria-hidden="true" />
        <span v-show="viewType === 'cards'" class="ml-1">More</span>
      </div>
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
        class="absolute right-0 z-10 mt-2 w-56 divide-y divide-gray-100 dark:divide-gray-700 rounded-md bg-white dark:bg-gray-850 shadow-lg dark:shadow-gray-900/30 ring-1 ring-black dark:ring-gray-700 ring-opacity-5 focus:outline-none"
        :class="{
          'bottom-10': position === 'bottom',
          'left-4 bottom-16 ': position === 'card'
        }"
      >
        <div class="py-1">
          <MenuItem v-slot="{ active }">
            <button
              type="button"
              :class="[
                active
                  ? 'bg-gray-100 dark:bg-gray-700 text-red-500 dark:text-red-400'
                  : 'text-red-600 dark:text-red-400',
                'group flex w-full items-center px-4 py-2 text-sm'
              ]"
              @click="$emit('deleteRow')"
            >
              <Trash
                :class="[
                  iconSizes.navigationHeader,
                  'mr-3 text-red-600 dark:text-red-400 group-hover:text-red-500 dark:group-hover:text-red-300'
                ]"
                aria-hidden="true"
              />
              Delete
            </button>
          </MenuItem>
        </div>
        <div class="py-1">
          <!-- <router-link :to="{ name: 'ManageStream', params: { mode: 'edit' } }">
          <MenuItem v-slot="{ active }">
            <a
              href="#"
              :class="[
                active ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300',
                'group flex items-center px-4 py-2 text-sm'
              ]"
              @click="$emit('editRow')"
            >
              <PencilIcon
                class="mr-3 h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400"
                aria-hidden="true"
              />
              Edit
            </a>
          </MenuItem>
           </router-link> -->
          <MenuItem v-slot="{ active }">
            <button
              type="button"
              :class="[
                active
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  : 'text-gray-700 dark:text-gray-300',
                'group flex w-full items-center px-4 py-2 text-sm'
              ]"
              @click="$emit('cloneRow')"
            >
              <SquareStack
                :class="[
                  iconSizes.navigationHeader,
                  'mr-3 text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400'
                ]"
                aria-hidden="true"
              />
              Clone
            </button>
          </MenuItem>
        </div>
      </MenuItems>
    </transition>
  </Menu>
</template>

<script setup lang="ts">
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { MoreHorizontal, SquareStack, Trash } from 'lucide-vue-next'
import { useCommonStore } from '@/stores/common'
import { computed } from 'vue'
import { useContextualIconSizes } from '@/composables/useIconSizes'

interface Props {
  position?: 'bottom' | 'card'
}

defineProps<Props>()
const viewType = computed(() => {
  return useCommonStore().currentViewType
})

const iconSizes = useContextualIconSizes()
</script>
