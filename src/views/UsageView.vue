<template>
  <div class="space-y-8">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <!-- Current Period Usage -->
      <div class="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 hover:shadow-md transition-shadow duration-300">
        <div class="p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-6">Current Billing Period Usage</h3>
          <div class="space-y-5">
            <div class="flex flex-col space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-500">Period:</span>
                <span class="text-sm font-medium text-gray-900">
                  {{ currentPeriodStart || '' }} - {{ currentPeriodEnd || '' }}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-500">Used Data:</span>
                <span class="text-sm font-medium text-gray-900">{{ formatDataSize(currentPeriodUsage) }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-500">Monthly Limit:</span>
                <span class="text-sm font-medium text-gray-900">{{ formatDataSize(monthlyLimit || 0) }}</span>
              </div>
            </div>
            
            <div class="mt-6">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium text-gray-600">Usage Progress</span>
                <span class="text-sm font-medium" 
                      :class="{
                        'text-red-600': usagePercentage > 90,
                        'text-amber-600': usagePercentage > 75 && usagePercentage <= 90,
                        'text-blue-600': usagePercentage <= 75
                      }">
                  {{ usagePercentage }}%
                </span>
              </div>
              <div class="w-full bg-gray-100 rounded-full h-2">
                <div class="h-2 rounded-full transition-all duration-300" 
                     :style="{ width: `${usagePercentage}%` }" 
                     :class="{
                       'bg-red-500': usagePercentage > 90,
                       'bg-amber-500': usagePercentage > 75 && usagePercentage <= 90,
                       'bg-blue-500': usagePercentage <= 75
                     }">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Daily Usage Chart -->
      <div class="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 hover:shadow-md transition-shadow duration-300">
        <div class="p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-6">Daily Usage</h3>
          <div class="rounded-lg overflow-hidden">
            <v-chart class="chart" :option="dailyChartOption" />
          </div>
        </div>
      </div>

      <!-- Monthly Usage Chart -->
      <div class="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 hover:shadow-md transition-shadow duration-300">
        <div class="p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-6">Monthly Usage</h3>
          <div class="rounded-lg overflow-hidden">
            <v-chart class="chart" :option="monthlyChartOption" />
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
import VChart from 'vue-echarts'
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
const isDarkTheme = ref(false)

const createChartOption = (data: any[], labels: string[]) => ({
  grid: {
    left: '20%',
    right: '20%'
  },
  xAxis: {
    type: 'category',
    data: labels,
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
      formatter: (value: number) => formatDataSize(value)
    }
  },
  series: [{
    data: data,
    type: 'bar',
  }],
  tooltip: {
    formatter: (params: any) => {
      return `${params.name}: ${formatDataSize(params.value)}`
    }
  },
  backgroundColor: isDarkTheme.value ? '#1f2937' : '#ffffff',
  textStyle: {
    color: isDarkTheme.value ? '#d1d5db' : '#111827'
  }
})

const dailyChartOption = computed(() => {
  const dailyData = commonStore.userData?.dailyUsage?.map(item => item.data_volume) ?? []
  const dailyLabels = commonStore.userData?.dailyUsage?.map(item => formatDateShort(item.date)) ?? []
  return createChartOption(dailyData, dailyLabels)
})

const monthlyChartOption = computed(() => {
  const monthlyData = commonStore.userData?.monthlyUsage?.map(item => item.data_volume) ?? []
  const monthlyLabels = commonStore.userData?.monthlyUsage?.map(item => formatMonth(item.month)) ?? []
  return createChartOption(monthlyData, monthlyLabels)
})

// Existing computed properties
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
.chart {
  height: 300px;
  width: 100%;
  transition: all 0.3s ease;
}

.dark-theme .chart {
  background-color: #374151;
}

/* Add smooth transitions */
.usage-view {
  @apply transition-all duration-300 ease-in-out;
}

/* Enhance chart containers */
.v-chart {
  @apply rounded-lg overflow-hidden;
}
</style>
