<template>
  <li v-for="item in navigation" :key="item.name" class="overflow-visible">
    <RouterLink
      :to="item.href"
      :class="[
        isRouteActive(item.href) ? activeClass : inactiveClass,
        itemClass,
        isCollapsed ? collapsedClass : expandedClass
      ]"
      @click="emitNavigate"
    >
      <component :is="item.icon" :class="iconClass" :stroke-width="iconStroke" aria-hidden="true" />
      <span v-if="!isCollapsed" class="truncate">{{ item.name }}</span>
      <span v-else class="sr-only">{{ item.name }}</span>

      <div v-if="showTooltips && isCollapsed" :class="tooltipClass" style="z-index: 99999">
        {{ item.name }}
      </div>
    </RouterLink>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAppNavigation } from '@/composables/useAppNavigation'

const props = withDefaults(
  defineProps<{
    activeClass: string
    inactiveClass: string
    itemClass: string
    iconClass: string
    iconStroke: number
    expandedClass?: string
    collapsedClass?: string
    isCollapsed?: boolean
    showTooltips?: boolean
    tooltipClass?: string
  }>(),
  {
    expandedClass: '',
    collapsedClass: '',
    isCollapsed: false,
    showTooltips: false,
    tooltipClass:
      'absolute left-full ml-2 top-1/2 transform -translate-y-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-800 text-white px-2 py-1 rounded text-sm whitespace-nowrap pointer-events-none'
  }
)

const emit = defineEmits<{
  (e: 'navigate'): void
}>()

const route = useRoute()
const { navigation } = useAppNavigation()

const isRouteActive = (href: string) => route.path.startsWith(href.split('/:')[0])

const emitNavigate = () => emit('navigate')

const isCollapsed = computed(() => props.isCollapsed)
const expandedClass = computed(() => props.expandedClass || '')
const collapsedClass = computed(() => props.collapsedClass || '')
const showTooltips = computed(() => props.showTooltips)
const activeClass = computed(() => props.activeClass)
const inactiveClass = computed(() => props.inactiveClass)
const itemClass = computed(() => props.itemClass)
const iconClass = computed(() => props.iconClass)
const iconStroke = computed(() => props.iconStroke)
const tooltipClass = computed(() => props.tooltipClass)
</script>
