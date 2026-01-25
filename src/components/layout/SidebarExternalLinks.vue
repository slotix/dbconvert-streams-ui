<template>
  <a
    href="https://github.com/slotix/dbconvert-streams-public/discussions"
    target="_blank"
    rel="noopener noreferrer"
    :class="linkClass"
    @click="emitNavigate"
  >
    <svg :class="iconClass" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        d="M12 2C6.477 2 2 6.58 2 12.234c0 4.516 2.865 8.34 6.839 9.693c.5.096.682-.22.682-.493c0-.244-.009-.89-.014-1.747c-2.782.62-3.369-1.374-3.369-1.374c-.455-1.185-1.11-1.5-1.11-1.5c-.908-.641.069-.628.069-.628c1.004.072 1.532 1.056 1.532 1.056c.892 1.565 2.341 1.113 2.91.85c.091-.665.349-1.113.635-1.368c-2.22-.261-4.555-1.137-4.555-5.056c0-1.117.39-2.03 1.029-2.747c-.103-.261-.446-1.31.098-2.728c0 0 .84-.275 2.75 1.05c.798-.226 1.655-.339 2.506-.343c.85.004 1.707.117 2.506.343c1.909-1.325 2.748-1.05 2.748-1.05c.546 1.418.203 2.467.1 2.728c.64.717 1.028 1.63 1.028 2.747c0 3.93-2.339 4.792-4.566 5.047c.359.316.678.94.678 1.894c0 1.368-.012 2.471-.012 2.807c0 .275.18.595.688.494c3.971-1.356 6.832-5.178 6.832-9.692C22 6.58 17.523 2 12 2z"
      />
    </svg>
    <span v-if="!isCollapsed" class="truncate">GitHub Discussions</span>
    <span v-else class="sr-only">GitHub Discussions</span>
    <div v-if="showTooltips && isCollapsed" :class="tooltipClass">GitHub Discussions</div>
  </a>
  <a
    href="https://docs.dbconvert.com"
    target="_blank"
    rel="noopener noreferrer"
    :class="linkClass"
    @click="emitNavigate"
  >
    <BookOpen :class="iconClass" :stroke-width="iconStroke" aria-hidden="true" />
    <span v-if="!isCollapsed" class="truncate">Documentation</span>
    <span v-else class="sr-only">Documentation</span>
    <div v-if="showTooltips && isCollapsed" :class="tooltipClass">Documentation</div>
  </a>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BookOpen } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    linkClass: string
    iconClass: string
    iconStroke: number
    isCollapsed?: boolean
    showTooltips?: boolean
    tooltipClass?: string
  }>(),
  {
    isCollapsed: false,
    showTooltips: false,
    tooltipClass:
      'absolute left-full ml-2 top-1/2 transform -translate-y-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-800 text-white px-2 py-1 rounded text-sm whitespace-nowrap z-9999 pointer-events-none'
  }
)

const emit = defineEmits<{
  (e: 'navigate'): void
}>()

const emitNavigate = () => emit('navigate')

const isCollapsed = computed(() => props.isCollapsed)
const showTooltips = computed(() => props.showTooltips)
const linkClass = computed(() => props.linkClass)
const iconClass = computed(() => props.iconClass)
const iconStroke = computed(() => props.iconStroke)
const tooltipClass = computed(() => props.tooltipClass)
</script>
