
<template>
  <div class="antialiased bg-gray-200">
    <div class="flex flex-wrap gap-x-3 space-y-0 max-w-7xl mx-auto py-6 px-8">
      <!-- ModeCombo component -->
      <div class="flex flex-start px-8 flex-col">
        <ModeCombo class="px-6 pb-4" />
      </div>
      <div class="flex flex-start px-8 flex-col">
        <Limits class="px-6 pb-4" />
      </div>
      <!-- TableList component with title -->
      <div class="flex flex-start px-8 flex-col">
        <TableList />
      </div>
    </div>
  </div>
</template>
<script>
import { useConnectionsStore } from '@/stores/connections.js'
import { mapState, mapActions } from 'pinia'
import TableList from './TableList.vue'
import ModeCombo from './ModeCombo.vue'
import Limits from './Limits.vue'
export default {
  name: 'Connections',
  components: {
    TableList,
    ModeCombo,
    Limits
  },
  data: () => ({
    filter: null,
    cardsView: true
  }),
  methods: {
    toggleView() {
      this.cardsView = !this.cardsView
    }
  },
  computed: {
  },
  watch: {},
  async mounted() { }
}
</script>
