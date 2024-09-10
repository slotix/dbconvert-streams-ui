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

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
import apiClient from '@/api/apiClient'
import { useCommonStore } from '@/stores/common'
import { DailyUsage, MonthlyUsage } from '@/types/user'

use([
  CanvasRenderer,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
])

const commonStore = useCommonStore()
const activeTab = ref<'daily' | 'monthly'>('daily')

const dailyUsage = ref<DailyUsage[]>([])
const monthlyUsage = ref<MonthlyUsage[]>([])

const fetchUsageData = async () => {
  const apiKey = commonStore.apiKey
  if (!apiKey) {
    console.error('API key not found')
    return
  }
  try {
    dailyUsage.value = await apiClient.getDailyUsage(apiKey)
    monthlyUsage.value = await apiClient.getMonthlyUsage(apiKey)
  } catch (error) {
    console.error('Error fetching usage data:', error)
  }
}

onMounted(fetchUsageData)

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const barChartOption = computed(() => ({
  xAxis: {
    type: 'category',
    data: activeTab.value === 'daily' 
      ? dailyUsage.value.map(item => item.date)
      : monthlyUsage.value.map(item => item.month)
  },
  yAxis: {
    type: 'value',
    axisLabel: {
      formatter: (value: number) => formatBytes(value)
    }
  },
  series: [{
    data: activeTab.value === 'daily'
      ? dailyUsage.value.map(item => item.data_volume)
      : monthlyUsage.value.map(item => item.data_volume),
    type: 'bar'
  }],
  tooltip: {
    formatter: (params: any) => `${params.name}: ${formatBytes(params.value)}`
  }
}))
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