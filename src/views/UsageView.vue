<template>
  <div class="usage-view max-w-2xl mx-auto transition-colors duration-300">
    <div class="border-b border-gray-200 pb-4 mb-4 flex justify-between items-center">
      <h3 class="text-lg leading-6 font-bold text-gray-900">Usage Dashboard</h3>
      <!-- <button @click="toggleTheme" class="px-3 py-1 rounded bg-gray-200 text-gray-800 hover:bg-gray-300">
        {{ isDarkTheme ? 'Light' : 'Dark' }} Theme
      </button> -->
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
      <div :class="['bg-white shadow rounded-lg p-6', { 'dark-theme': isDarkTheme }]">
        <h2 class="text-xl font-semibold mb-4 text-gray-800">Daily Usage</h2>
        <v-chart class="chart" :option="barChartOption" />
      </div>
    </div>

    <div v-if="activeTab === 'monthly'" class="space-y-6">
      <div :class="['bg-white shadow rounded-lg p-6', { 'dark-theme': isDarkTheme }]">
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

const isDarkTheme = ref(false)
const currentTheme = computed(() => isDarkTheme.value ? 'dark' : '')

const toggleTheme = () => {
  isDarkTheme.value = !isDarkTheme.value
}

const formatDate = (date: string): string => {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return new Date(date).toLocaleDateString(undefined, options)
}

const formatMonth = (month: string): string => {
  const options: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' }
  return new Date(month).toLocaleDateString(undefined, options)
}

const barChartOption = computed(() => ({
  grid: {
    left: '15%', // Adjust this value to give more space to the y-axis labels
    right: '15%',
  },
  xAxis: {
    type: 'category',
    data: activeTab.value === 'daily' 
      ? dailyUsage.value.map(item => formatDate(item.date))
      : monthlyUsage.value.map(item => formatMonth(item.month)),
    axisLine: {
      lineStyle: {
        color: isDarkTheme.value ? '#d1d5db' : '#333'
      }
    },
    axisLabel: {
      color: isDarkTheme.value ? '#d1d5db' : '#333'
    }
  },
  yAxis: {
    type: 'value',
    axisLine: {
      lineStyle: {
        color: isDarkTheme.value ? '#d1d5db' : '#333'
      }
    },
    axisLabel: {
      color: isDarkTheme.value ? '#d1d5db' : '#333',
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
  },
  backgroundColor: isDarkTheme.value ? '#1f2937' : '#ffffff',
  textStyle: {
    color: isDarkTheme.value ? '#d1d5db' : '#111827'
  }
}))
</script>

<style scoped>
.dark-theme .chart {
  background-color: #374151;
}
.chart {
  height: 400px;
  padding: 1rem;
  border-radius: 0.375rem;
  margin-bottom: 1rem;
  transition: background-color 0.3s;
}
</style>