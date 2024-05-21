<template>
  <tr :class="{ 'bg-gray-200': isSelected }" @click="handleSelectTable">
    <td class="relative py-4 px-7 sm:w-12 sm:px-6" :class="{ 'border-l border-white': isSelected }">
      <input type="checkbox" :id="'checkbox-' + table.name"
        class="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-600"
        v-model="table.selected" @change.stop="handleCheckboxChange" />
    </td>
    <td class="py-4 px-3" :class="{ 'border-r border-white': isSelected }">
      {{ table.name }}
    </td>
    <td class="p-4 ">
      <button @click.stop="toggleSettings" class="text-blue-600 hover:text-blue-800">
        Options
      </button>
    </td>
  </tr>
  <!-- Additional <tr> for collapsible panel -->
  <tr v-if="showSettings">
    <td :colspan="colspan">
      <div class="bg-white px-4 pb-4 shadow ">
        <!-- Content for the settings panel -->
        <slot></slot>
      </div>
    </td>
  </tr>
</template>

<script>
export default {
  name: 'TableRow',
  props: {
    table: {
      type: Object,
      required: true
    },
    isSelected: {
      type: Boolean,
      default: false
    },
    colspan: {
      type: Number,
      required: true
    }
  },
  data() {
    return {
      showSettings: false
    };
  },
  emits: ['selectTable', 'checkboxChange', 'toggleSettings'],
  methods: {
    handleSelectTable() {
      this.$emit('selectTable', this.table);
    },
    handleCheckboxChange(event) {
      this.$emit('checkboxChange', { table: this.table, checked: event.target.checked });
    },
    toggleSettings() {
      this.showSettings = !this.showSettings;
      this.$emit('toggleSettings', this.table.name);
    }
  }
};
</script>