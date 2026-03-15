<script setup lang="ts">
import { ref } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { Moon, Sun } from 'lucide-vue-next'
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
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon }
] as const
</script>

<template>
  <Menu as="div" class="relative inline-block text-left">
    <MenuButton
      ref="menuButtonRef"
      class="ui-focus-ring ui-accent-action ui-icon-muted inline-flex items-center justify-center rounded-md p-2 focus:outline-none"
      title="Toggle theme"
    >
      <Sun v-if="!themeStore.isDark" class="h-5 w-5" />
      <Moon v-else class="h-5 w-5" />
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
        class="ui-surface-floating absolute left-full z-9999 ml-2 w-40 origin-top-left rounded-md border focus:outline-none"
      >
        <div class="py-1">
          <MenuItem v-for="theme in themes" :key="theme.value" v-slot="{ active }">
            <button
              :class="[
                active ? 'ui-surface-muted' : '',
                themeStore.mode === theme.value ? 'ui-accent-selection-checked' : 'ui-text-default',
                'ui-focus-ring group flex w-full items-center px-4 py-2 text-sm'
              ]"
              @click="themeStore.setTheme(theme.value)"
            >
              <component
                :is="theme.icon"
                class="mr-3 h-5 w-5"
                :class="themeStore.mode === theme.value ? 'ui-accent-icon' : 'ui-icon-muted'"
              />
              {{ theme.label }}
            </button>
          </MenuItem>
        </div>
      </MenuItems>
    </transition>
  </Menu>
</template>
