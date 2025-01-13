<template>
  <transition name="expand" @enter="enter" @after-enter="afterEnter" @leave="leave">
    <slot />
  </transition>
</template>

<script setup lang="ts">
function enter(element: Element) {
  const el = element as HTMLElement
  el.style.height = 'auto'
  const height = getComputedStyle(el).height
  el.style.height = '0'
  // Force repaint
  getComputedStyle(el).height
  // Begin transition
  el.style.height = height
}

function afterEnter(element: Element) {
  const el = element as HTMLElement
  el.style.height = 'auto'
}

function leave(element: Element) {
  const el = element as HTMLElement
  el.style.height = getComputedStyle(el).height
  // Force repaint
  getComputedStyle(el).height
  // Begin transition
  el.style.height = '0'
}
</script>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: height 0.3s ease-in-out;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  height: 0;
}
</style>
