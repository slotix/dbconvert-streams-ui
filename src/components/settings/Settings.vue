<template>
  <div class="antialiased bg-gray-200">
    <div class="grid grid-cols-2 gap-x-3 gap-y-6 mx-auto py-6 px-8">
      <!-- First column -->
      <div class="col-span-1">
        <div class="flex flex-col">
          <!-- TableList component with title -->
          <TableList />
        </div>
      </div>
      <!-- Second column -->
      <div class="col-span-1">
        <div class="flex flex-col">
          <!-- ModeCombo component -->
          <!-- <ModeCombo class="pb-8" /> -->
          <ModeButtons class="pb-8" />
          <!-- Limits component -->
          <Limits class="pb-8" />
        </div>
      </div>
    </div>
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
  },
}
</script>
