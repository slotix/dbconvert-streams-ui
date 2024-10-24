<template>
  <StepDisplay :steps="allSteps" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCommonStore } from '@/stores/common'
import StepDisplay from '@/components/home/StepDisplay.vue'

const commonStore = useCommonStore()
const allSteps = computed(() => commonStore.steps)
</script>
