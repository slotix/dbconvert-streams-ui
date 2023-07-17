<template>
  <div class="antialiased bg-gray-200">
    <!-- View control buttons   -->
    <div class="flex flex-wrap gap-x-3 space-y-0 max-w-7xl mx-auto py-6 px-8;">
      <div class="flex flex-start px-8">
        <Filter @update:selected-db-type="filterDB" />
      </div>
      <ToggleView class="py-2" @toggleView="toggleView" />
    </div>
    <!-- End View control buttons   -->
    <div class="flex flex-wrap max-w-7xl mx-auto px-4 overflow-hidden" v-show="cardsView">
      <div class="w-full px-4 overflow-hidden md:w-1/2 lg:w-1/3">
        <connection-card-new @add="add" />
      </div>
      <div
        class="w-full px-4 overflow-hidden md:w-1/2 lg:w-1/3"
        v-for="connection in connectionsByType"
        :key="connection.id"
      >
        <connection-card-item :connection="connection" :isSelectable="isSelectable" @edit="edit" />
      </div>
    </div>
    <div class="flex flex-wrap mx-6 overflow-hidden" v-show="!cardsView">
      <connection-table
        :connections="connectionsByType"
        :isSelectable="isSelectable"
        @add="add"
        @edit="edit"
      />
    </div>
    <connection-add :is-open="isAddOpen" @close="isAddOpen = false" />
    <connection-edit :is-open="isEditOpen" @close="isEditOpen = false" />
  </div>
</template>

<script>
import { mapGetters, mapActions, mapMutations } from 'vuex'

import ConnectionCardItem from './ConnectionCardItem.vue'
import ConnectionTable from './ConnectionTable.vue'
import ConnectionAdd from './ConnectionAdd.vue'
import ConnectionEdit from './ConnectionEdit.vue'
import ConnectionCardNew from './ConnectionCardNew.vue'
import Filter from './Filter.vue'
import ToggleView from './ToggleView.vue'
export default {
  name: 'Connections',
  components: {
    ConnectionAdd,
    ConnectionCardItem,
    ConnectionTable,
    ConnectionEdit,
    ConnectionCardNew,
    Filter,
    ToggleView
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
    cardsView: true,
    isEditOpen: false,
    isAddOpen: false
  }),
  methods: {
    ...mapActions(['refreshConnections', 'toggleAddConnectionDialog']),
    ...mapMutations(['SET_FILTER']),
    filterDB(dbType) {
      console.log(dbType)
      this.filter = dbType
    },
    toggleView() {
      this.cardsView = !this.cardsView
    },
    edit() {
      this.isEditOpen = true
    },
    add() {
      this.isAddOpen = true
    }
  },
  computed: {
    ...mapGetters(['connectionsByType', 'dbTypes']),
    connectionsCount() {
      return this.connectionsByType.length
    }
  },
  watch: {
    filter() {
      console.log(this.filter)
      if (this.filter == null || this.filter.toLowerCase() == 'all') {
        this.SET_FILTER('')
        return
      }
      this.SET_FILTER(this.filter)
    }
  },
  async mounted() {
    await this.refreshConnections()
  }
}
</script>
