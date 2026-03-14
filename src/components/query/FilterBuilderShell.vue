<template>
  <div class="ui-surface-panel ui-border-default rounded-lg border overflow-visible">
    <div
      v-if="$slots.header"
      class="ui-surface-raised ui-border-default flex items-center justify-between border-b px-3 py-2"
    >
      <slot name="header" />
    </div>

    <div :class="bodyClass">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  bodyClass?: string
}

withDefaults(defineProps<Props>(), {
  bodyClass: 'p-3'
})
</script>
