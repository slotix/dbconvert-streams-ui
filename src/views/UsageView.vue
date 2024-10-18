<template>
  <div class="usage-view">
    <div class="mb-4">
      <nav class="flex">
        <button
          :class="[
            'py-2 px-4 text-sm font-medium',
            activeTab === 'daily'
              ? 'text-blue-600 font-semibold'
              : 'text-gray-500 hover:text-gray-700'
          ]"
          @click="activeTab = 'daily'"
        >
          Daily Usage
        </button>
        <button
          :class="[
            'ml-8 py-2 px-4 text-sm font-medium',
            activeTab === 'monthly'
              ? 'text-blue-600 font-semibold'
              : 'text-gray-500 hover:text-gray-700'
          ]"
          @click="activeTab = 'monthly'"
        >
          Monthly Usage
        </button>
      </nav>
    </div>

    <div v-if="activeTab === 'daily'" class="space-y-6">
      <div :class="['bg-white rounded-lg', { 'dark-theme': isDarkTheme }]">
        <v-chart ref="chartRef" class="chart" :option="barChartOption" />
      </div>
    </div>

    <div v-if="activeTab === 'monthly'" class="space-y-6">
      <div :class="['bg-white rounded-lg', { 'dark-theme': isDarkTheme }]">
        <v-chart ref="chartRef" class="chart" :option="barChartOption" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  MarkLineComponent
} from 'echarts/components'
import VChart, { THEME_KEY } from 'vue-echarts'
import { useCommonStore } from '@/stores/common'

use([
  CanvasRenderer,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  MarkLineComponent
])

const commonStore = useCommonStore()
const activeTab = ref<'daily' | 'monthly'>('daily')

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const isDarkTheme = ref(false)
const currentTheme = computed(() => (isDarkTheme.value ? 'dark' : ''))

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

const barChartOption = computed(() => {
  const dailyData = commonStore.userData?.dailyUsage?.map((item) => item.data_volume ?? 0) ?? []
  const monthlyData = commonStore.userData?.monthlyUsage?.map((item) => item.data_volume ?? 0) ?? []

  const data = activeTab.value === 'daily' ? dailyData : monthlyData

  const maxValue =
    activeTab.value === 'monthly'
      ? Math.max(...data, commonStore.userData?.limit || 0)
      : Math.max(...data)

  return {
    grid: {
      left: '20%',
      right: '20%'
    },
    xAxis: {
      type: 'category',
      data:
        activeTab.value === 'daily'
          ? (commonStore.userData?.dailyUsage?.map((item) => formatDate(item.date)) ?? [])
          : (commonStore.userData?.monthlyUsage?.map((item) => formatMonth(item.month)) ?? []),
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
      max: activeTab.value === 'monthly' ? maxValue * 1.1 : undefined,
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
    series: [
      {
        data: data,
        type: 'bar',
        markLine:
          activeTab.value === 'monthly'
            ? {
                data: [
                  {
                    yAxis: commonStore.monthlyLimit || 0,
                    label: {
                      formatter: `Monthly Limit: ${formatBytes(commonStore.monthlyLimit || 0)}`,
                      position: 'insideEndTop'
                    },
                    lineStyle: {
                      color: 'red',
                      type: 'dashed'
                    }
                  }
                ]
              }
            : null
      }
    ],
    tooltip: {
      formatter: (params: any) => {
        const value = `${params.name}: ${formatBytes(params.value)}`
        if (activeTab.value === 'monthly') {
          const limit = formatBytes(commonStore.monthlyLimit || 0)
          return `${value}<br>Limit: ${limit}`
        }
        return value
      }
    },
    backgroundColor: isDarkTheme.value ? '#1f2937' : '#ffffff',
    textStyle: {
      color: isDarkTheme.value ? '#d1d5db' : '#111827'
    }
  }
})

// Add a watch effect to update the chart when data changes
watch([() => commonStore.dailyUsage, () => commonStore.monthlyUsage, activeTab], () => {
  nextTick(() => {
    const chart = chartRef.value?.chart
    if (chart) {
      chart.setOption(barChartOption.value)
    }
  })
})

const chartRef = ref<any>(null)
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
