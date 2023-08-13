<template>
  <div class="antialiased bg-gray-200">
    <!-- View control buttons   -->
    <div class="flex flex-wrap gap-x-3 space-y-0 max-w-7xl mx-auto py-6 px-8;">
      <ToggleView class="py-2 px-8" @toggleView="toggleView" />
    </div>
    <!-- End View control buttons   -->
    <div class="flex flex-wrap max-w-7xl mx-auto px-4 overflow-hidden" v-show="cardsView">
      <div class="w-full px-4 overflow-hidden md:w-1/2 lg:w-1/3">
        <NewCard />
      </div>
      <div
        class="w-full px-4 overflow-hidden md:w-1/2 lg:w-1/3"
        v-for="stream in streamsByType"
        :key="stream.id"
      >
        <CardItem :stream="stream" />
      </div>
    </div>
    <div class="flex flex-wrap mx-6 overflow-hidden" v-show="!cardsView">
      <Table :streams="streamsByType" />
    </div>
  </div>
</template>

<script>

import Table from './Table.vue'
import NewCard from './NewCard.vue'
import ToggleView from '../connection/ToggleView.vue'
import CardItem from './CardItem.vue'

import { useStreamsStore } from '@/stores/streams.js'
import { mapState, mapActions } from 'pinia'

export default {
  name: 'Streams',
  components: {
    Table,
    ToggleView,
    CardItem,
    NewCard
  },
//   props: {
//     isShowHeader: {
//       type: Boolean,
//       default: true
//     },
//     isSelectable: {
//       type: Boolean,
//       default: false
//     }
//   },
  data: () => ({
//     filter: null,
    cardsView: true,
//     isEditOpen: false,
//     isAddOpen: false
  }),
  methods: {
//     ...mapActions(useConnectionsStore, [
//       'refreshConnections',
//       'setFilter'
//     ]),
//     filterDB(dbType) {
//       this.filter = dbType.type
//     },
    toggleView() {
      this.cardsView = !this.cardsView
    }
  },
  computed: {
    ...mapState(useStreamsStore, ['streamsByType']),
  },
//   watch: {
//     filter() {
//       if (this.filter == null || this.filter.toLowerCase() == 'all') {
//         this.setFilter('')
//         return
//       }
//       this.setFilter(this.filter)
//     },
//     connectionsCount(newValue) {
//       this.$emit('count-connections', newValue)
//     }
//   },
//   async mounted() {
//     await this.refreshConnections()
//   }
}
</script>
