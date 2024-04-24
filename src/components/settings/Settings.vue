<template>
  <div class="antialiased bg-gray-200">
    <div class="grid grid-cols-1 md:grid-cols-1 gap-x-3 gap-y-6 max-w-7xl mx-auto py-6 px-0">
      <div class="col-span-2 md:col-span-1">
        <div class="flex flex-col">
          <TableList />
        </div>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-6 max-w-7xl mx-auto py-6 px-0">
      <!-- <div class="col-span-1 md:col-span-1 ">
        <div class="flex flex-col">
          <ModeButtons class="pb-8" />
        </div>
      </div> -->
      <div class="col-span-1 md:col-span-1 ">
        <div class="flex flex-col">
          <Limits class="pb-8" />
        </div>
      </div>
    </div>
    <!-- <div class="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-6 max-w-7xl mx-auto py-6 px-0">
      <div class="col-span-2 md:col-span-1">
        <div class="flex flex-col">
          <TableList />
        </div>
      </div>
      <div class="col-span-1 md:col-span-1">
        <div class="flex flex-col">
          <ModeButtons class="pb-8" />
          <Limits class="pb-8" />
        </div>
      </div>
    </div> -->
  </div>
</template>

<script>
import TableList from './TableList.vue'
import ModeButtons from './ModeButtons.vue'
import Limits from './Limits.vue'
export default {
  name: 'Connections',
  components: {
    TableList,
    ModeButtons,
    Limits
  }
}
</script>
