export interface DailyUsage {
  date: string;
  data_volume: number;
}

export interface MonthlyUsage {
  month: string;
  data_volume: number;
}

export interface MonthlyUsageResponse {
  usage: MonthlyUsage[];
  limit: number;
}
