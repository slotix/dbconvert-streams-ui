<template>
  <div class="usage-view">
    <div class="mb-4">
      <nav class="flex">
        <button :class="[
          'ml-8 py-2 px-4 text-sm font-medium',
          activeTab === 'current'
            ? 'text-blue-600 font-semibold'
            : 'text-gray-500 hover:text-gray-700'
        ]" @click="activeTab = 'current'">
          Current Period
        </button>
        <button :class="[
          'py-2 px-4 text-sm font-medium',
          activeTab === 'daily'
            ? 'text-blue-600 font-semibold'
            : 'text-gray-500 hover:text-gray-700'
        ]" @click="activeTab = 'daily'">
          Daily Usage
        </button>
        <button :class="[
          'ml-8 py-2 px-4 text-sm font-medium',
          activeTab === 'monthly'
            ? 'text-blue-600 font-semibold'
            : 'text-gray-500 hover:text-gray-700'
        ]" @click="activeTab = 'monthly'">
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

    <div v-if="activeTab === 'current'" class="space-y-6">
      <div :class="['bg-white rounded-lg', { 'dark-theme': isDarkTheme }]">
        <div class="p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Current Billing Period Usage</h3>
          <div class="space-y-4">
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Period:</span>
              <span class="text-gray-900">
                {{ currentPeriodStart || '' }} - {{ currentPeriodEnd || '' }}
              </span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Used Data:</span>
              <span class="text-gray-900">{{ formatDataSize(currentPeriodUsage) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Monthly Limit:</span>
              <span class="text-gray-900">{{ formatDataSize(monthlyLimit || 0) }}</span>
            </div>
            <div class="mt-4">
              <div class="w-full bg-gray-200 rounded-full h-2.5">
                <div class="bg-blue-600 h-2.5 rounded-full" :style="{ width: `${usagePercentage}%` }" :class="{
                  'bg-red-600': usagePercentage > 90,
                  'bg-yellow-600': usagePercentage > 75 && usagePercentage <= 90,
                  'bg-blue-600': usagePercentage <= 75
                }"></div>
              </div>
              <p class="text-sm text-gray-500 mt-1">{{ usagePercentage }}% used</p>
            </div>
          </div>
        </div>
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
import { formatDataSize, formatDateShort, formatMonth, formatDate } from '@/utils/formats'
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
const activeTab = ref<'daily' | 'monthly' | 'current'>('current')

const isDarkTheme = ref(false)
const currentTheme = computed(() => (isDarkTheme.value ? 'dark' : ''))

const toggleTheme = () => {
  isDarkTheme.value = !isDarkTheme.value
}



const barChartOption = computed(() => {
  const dailyData = commonStore.userData?.dailyUsage?.map((item) => item.data_volume ?? 0) ?? []
  const monthlyData = commonStore.userData?.monthlyUsage?.map((item) => item.data_volume ?? 0) ?? []

  const data = activeTab.value === 'daily' ? dailyData : monthlyData

  const maxValue =
    activeTab.value === 'monthly'
      ? Math.max(...data, commonStore.monthlyLimit || 0)
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
          ? (commonStore.userData?.dailyUsage?.map((item) => formatDateShort(item.date)) ?? [])
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
        formatter: (value: number) => formatDataSize(value)
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
                    formatter: `Monthly Limit: ${formatDataSize(commonStore.monthlyLimit || 0)}`,
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
        const value = `${params.name}: ${formatDataSize(params.value)}`
        if (activeTab.value === 'monthly') {
          const limit = formatDataSize(commonStore.monthlyLimit || 0)
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


const currentPeriodStart = computed(() => {
  const date = commonStore.userData?.subscriptionPeriodUsage?.period_start
  return date ? formatDate(date) : null
})

const currentPeriodEnd = computed(() => {
  const date = commonStore.userData?.subscriptionPeriodUsage?.period_end
  return date ? formatDate(date) : null
})
const currentPeriodUsage = computed(() => commonStore.currentPeriodUsage)
const monthlyLimit = computed(() => commonStore.monthlyLimit)

const usagePercentage = computed(() => {
  if (!monthlyLimit.value || monthlyLimit.value === 0) return 0
  return Math.round((currentPeriodUsage.value / monthlyLimit.value) * 100)
})
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
