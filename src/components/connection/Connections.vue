<template>
  <div class="antialiased bg-gray-200">
    <!-- View control buttons   -->
    <div class="flex flex-wrap gap-x-3 space-y-0 max-w-7xl mx-auto py-6 px-8;">
      <div class="flex flex-start">
        <Filter @update:selected-db-type="filterDB" />
      </div>
      <div class="flex flex-start">
        <button
          type="button"
          class="w-full inline-flex rounded-l-md border border-gray-300 px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
          :class="{ 'ring-2 ring-inset ring-gray-600': cardsView }"
          @click="toggleView"
        >
          Cards
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 ml-2 pt-1 text-gray-400;"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
        </button>
        <button
          type="button"
          class="w-full inline-flex rounded-r-md border border-gray-300 px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
          :class="{ 'ring-2 ring-inset ring-gray-600': !cardsView }"
          @click="toggleView"
        >
          Table
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 ml-2 pt-1 text-gray-400;"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>
      </div>
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
export default {
  name: 'Connections',
  components: {
    ConnectionAdd,
    ConnectionCardItem,
    ConnectionTable,
    ConnectionEdit,
    ConnectionCardNew,
    Filter
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
