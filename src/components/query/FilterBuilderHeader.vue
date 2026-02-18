<template>
  <div
    :class="[
      'flex items-center justify-between px-3 py-2 bg-white/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700',
      clickable ? 'cursor-pointer' : '',
      headerClass
    ]"
    @click="handleClick"
  >
    <div class="flex items-center gap-2 min-w-0">
      <slot name="left" />
    </div>
    <div v-if="$slots.right" class="flex items-center gap-2 shrink-0">
      <slot name="right" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  clickable?: boolean
  headerClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  clickable: false,
  headerClass: ''
})

const emit = defineEmits<{
  (e: 'click'): void
}>()

function handleClick() {
  if (props.clickable) {
    emit('click')
  }
}
</script>
