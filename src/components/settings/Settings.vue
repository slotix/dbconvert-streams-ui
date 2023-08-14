<template>
  <div class="antialiased bg-gray-200">
    <!-- View control buttons   -->
    <div class="flex flex-wrap gap-x-3 space-y-0 max-w-7xl mx-auto py-6 px-8;">
      <div class="flex flex-start px-8">
        <TableList />
      </div>
    </div>
    <!-- End View control buttons   -->
  </div>
</template>
<script>

import { useConnectionsStore } from '@/stores/connections.js'
import { mapState, mapActions } from 'pinia'
import TableList from './TableList.vue'
export default {
  name: 'Connections',
  components: {
    TableList
  },
  data: () => ({
    filter: null,
    cardsView: true,
    isEditOpen: false,
    isAddOpen: false
  }),
  methods: {
    toggleView() {
      this.cardsView = !this.cardsView
    }
  },
  computed: {
    ...mapState(useConnectionsStore, ['connectionsByType']),
  },
  watch: {
  },
  async mounted() {
  }
}
</script>
