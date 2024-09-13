import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '@/api/apiClient';
import { useCommonStore } from '@/stores/common';
import { DailyUsage, MonthlyUsage } from '@/types/user';

export const useUsageDataStore = defineStore('usageData', () => {
  const commonStore = useCommonStore();
  
  const dailyUsage = ref<DailyUsage[]>([]);
  const monthlyUsage = ref<MonthlyUsage[]>([]);
  const monthlyLimit = ref<number>(0);

  const fetchUsageData = async () => {
    const apiKey = commonStore.apiKey;
    if (!apiKey) {
      console.error('API key not found');
      return;
    }
    try {
      dailyUsage.value = await apiClient.getDailyUsage(apiKey);
      const monthlyData = await apiClient.getMonthlyUsage(apiKey);
      monthlyUsage.value = monthlyData.usage;
      monthlyLimit.value = monthlyData.limit;
    } catch (error) {
      console.error('Error fetching usage data:', error);
    }
  };

  return {
    dailyUsage,
    monthlyUsage,
    monthlyLimit,
    fetchUsageData
  };
});
