<template>
  <div class="usage-view">
    <div class="border-b border-gray-200 pb-4 mb-4">
      <h3 class="text-lg leading-6 font-bold text-gray-900">Usage Dashboard</h3>
    </div>
    <div class="mb-4">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex">
          <button 
            @click="activeTab = 'daily'"
            :class="['py-2 px-4 text-sm font-medium', activeTab === 'daily' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700']">
            Daily Usage
          </button>
          <button 
            @click="activeTab = 'monthly'"
            :class="['ml-8 py-2 px-4 text-sm font-medium', activeTab === 'monthly' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700']">
            Monthly Usage
          </button>
        </nav>
      </div>
    </div>

    <div v-if="activeTab === 'daily'" class="space-y-6">
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-xl font-semibold mb-4 text-gray-800">Daily Usage</h2>
        <v-chart class="chart" :option="barChartOption" />
      </div>
    </div>

    <div v-if="activeTab === 'monthly'" class="space-y-6">
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-xl font-semibold mb-4 text-gray-800">Monthly Usage</h2>
        <v-chart class="chart" :option="barChartOption" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, computed, defineComponent } from 'vue'
import { use } from "echarts/core"
import { CanvasRenderer } from "echarts/renderers"
import { BarChart } from "echarts/charts"
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from "echarts/components"
import VChart, { THEME_KEY } from "vue-echarts"

use([
  CanvasRenderer,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
])

interface UsageData {
  usage_date?: string;
  usage_month?: string;
  total_data_volume: number;
}

export default defineComponent({
  name: 'UsageView',
  components: {
    VChart
  },
  setup() {
    const activeTab = ref<'daily' | 'monthly'>('daily')

    const mockDailyData: UsageData[] = [
      { usage_date: '2024-09-01', total_data_volume: 1500000 },
      { usage_date: '2024-09-02', total_data_volume: 2000000 },
      { usage_date: '2024-09-03', total_data_volume: 1800000 },
      { usage_date: '2024-09-04', total_data_volume: 2200000 },
      { usage_date: '2024-09-05', total_data_volume: 2500000 },
    ]

    const mockMonthlyData: UsageData[] = [
      { usage_month: '2024-05', total_data_volume: 15000000 },
      { usage_month: '2024-06', total_data_volume: 18000000 },
      { usage_month: '2024-07', total_data_volume: 22000000 },
      { usage_month: '2024-08', total_data_volume: 20000000 },
      { usage_month: '2024-09', total_data_volume: 25000000 },
    ]

    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const dailyChartData = computed(() => ({
      columns: ['Date', 'Usage'],
      rows: mockDailyData.map(item => ({
        'Date': item.usage_date,
        'Usage': item.total_data_volume
      }))
    }))

    const monthlyChartData = computed(() => ({
      columns: ['Month', 'Usage'],
      rows: mockMonthlyData.map(item => ({
        'Month': item.usage_month,
        'Usage': item.total_data_volume
      }))
    }))

    const chartSettings = {
      yAxisType: ['normal'],
      yAxisName: ['Data Volume']
    }

    const chartExtend = {
      tooltip: {
        formatter: function(params: any) {
          return `${params[0].name}: ${formatBytes(params[0].value)}`
        }
      },
      yAxis: {
        axisLabel: {
          formatter: function(value: number) {
            return formatBytes(value)
          }
        }
      }
    }

    const barChartOption = computed(() => ({
      xAxis: {
        type: 'category',
        data: activeTab.value === 'daily' 
          ? dailyChartData.value.rows.map(row => row.Date)
          : monthlyChartData.value.rows.map(row => row.Month)
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => formatBytes(value)
        }
      },
      series: [{
        data: activeTab.value === 'daily'
          ? dailyChartData.value.rows.map(row => row.Usage)
          : monthlyChartData.value.rows.map(row => row.Usage),
        type: 'bar'
      }],
      tooltip: {
        formatter: (params: any) => `${params.name}: ${formatBytes(params.value)}`
      }
    }))

    return {
      activeTab,
      barChartOption,
      dailyChartData,
      monthlyChartData,
      chartSettings,
      chartExtend
    }
  }
})
</script>

<style scoped>
.usage-view {
  max-width: 600px;
  margin: 0 auto;
}
.chart {
  height: 400px;
  background-color: #f3f4f6;
  padding: 1rem;
  border-radius: 0.375rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  margin-bottom: 1rem;
}
</style>