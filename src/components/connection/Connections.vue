<template>
  <div class="antialiased bg-gray-200">
    <!-- View control buttons   -->
    <div class="flex flex-wrap gap-x-3 space-y-0 max-w-7xl mx-auto py-6 px-8;">
      <div class="flex flex-start px-8">
        <DBTypesCombo :isFilterIcon="true" @update:selected-db-type="filterDB" />
      </div>
      <ToggleView class="py-2 px-8" @toggleView="toggleView" />
    </div>
    <!-- End View control buttons   -->
    <div class="flex flex-wrap max-w-7xl mx-auto px-4 overflow-hidden" v-show="cardsView">
      <div class="w-full px-4 overflow-hidden md:w-1/2 lg:w-1/3">
        <NewCard />
      </div>
      <div
        class="w-full px-4 overflow-hidden md:w-1/2 lg:w-1/3"
        v-for="connection in connectionsByType"
        :key="connection.id"
      >
        <CardItem :connection="connection" :isSelectable="isSelectable" />
      </div>
    </div>
    <div class="flex flex-wrap mx-6 overflow-hidden" v-show="!cardsView">
      <Table :connections="connectionsByType" :isSelectable="isSelectable" />
    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions, mapMutations } from 'vuex'

import Table from './Table.vue'
import NewCard from './NewCard.vue'
import DBTypesCombo from './DBTypesCombo.vue'
import ToggleView from './ToggleView.vue'
import CardItem from './CardItem.vue'

export default {
  name: 'Connections',
  components: {
    Table,
    DBTypesCombo,
    ToggleView,
    CardItem,
    NewCard
  },
  props: {
    isShowHeader: {
      type: Boolean,
      default: true
    },
    isSelectable: {
      type: Boolean,
      default: false
    }
  },
  data: () => ({
    filter: null,
    cardsView: false,
    isEditOpen: false,
    isAddOpen: false
  }),
  methods: {
    ...mapActions(['refreshConnections', 'toggleAddConnectionDialog']),
    ...mapMutations(['SET_FILTER']),
    filterDB(dbType) {
      this.filter = dbType.type
    },
    toggleView() {
      this.cardsView = !this.cardsView
    }
  },
  computed: {
    ...mapGetters(['connectionsByType']),
    connectionsCount() {
      return this.connectionsByType.length
    }
  },
  watch: {
    filter() {
      if (this.filter == null || this.filter.toLowerCase() == 'all') {
        this.SET_FILTER('')
        return
      }
      this.SET_FILTER(this.filter)
    },
    connectionsCount(newValue) {
      this.$emit('count-connections', newValue)
    }
  },
  async mounted() {
    await this.refreshConnections()
  }
}
</script>
