export interface DailyUsage {
  date: string;
  data_volume: number;
}

export interface MonthlyUsage {
  month: string;
  data_volume: number;
  max_limit: number;
}
