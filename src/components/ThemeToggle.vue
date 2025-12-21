<script setup lang="ts">
import { ref } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { SunIcon, MoonIcon } from '@heroicons/vue/24/outline'
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'

const themeStore = useThemeStore()
const menuButtonRef = ref<HTMLElement | { $el?: HTMLElement } | null>(null)
const clickMenuButton = () => {
  const target = (menuButtonRef.value as { $el?: HTMLElement })?.$el ?? menuButtonRef.value
  if (target instanceof HTMLElement) {
    target.click()
  }
}

defineExpose({
  click: clickMenuButton
})

const themes = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon }
] as const
</script>

<template>
  <Menu as="div" class="relative inline-block text-left">
    <MenuButton
      ref="menuButtonRef"
      class="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-800 hover:text-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400"
      title="Toggle theme"
    >
      <SunIcon v-if="!themeStore.isDark" class="h-5 w-5" />
      <MoonIcon v-else class="h-5 w-5" />
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
        class="absolute left-full ml-2 z-[9999] w-40 origin-top-left rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-gray-700 focus:outline-none"
      >
        <div class="py-1">
          <MenuItem v-for="theme in themes" :key="theme.value" v-slot="{ active }">
            <button
              :class="[
                active ? 'bg-gray-100 dark:bg-gray-700' : '',
                themeStore.mode === theme.value
                  ? 'bg-teal-50 dark:bg-teal-900 text-teal-600 dark:text-teal-400'
                  : 'text-gray-700 dark:text-gray-300',
                'group flex w-full items-center px-4 py-2 text-sm'
              ]"
              @click="themeStore.setTheme(theme.value)"
            >
              <component
                :is="theme.icon"
                class="mr-3 h-5 w-5"
                :class="
                  themeStore.mode === theme.value
                    ? 'text-teal-500 dark:text-teal-400'
                    : 'text-gray-400 dark:text-gray-500'
                "
              />
              {{ theme.label }}
            </button>
          </MenuItem>
        </div>
      </MenuItems>
    </transition>
  </Menu>
</template>
