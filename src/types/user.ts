export interface DailyUsage {
  date: string
  data_volume: number
}

export interface MonthlyUsage {
  month: string
  data_volume: number
}

export interface MonthlyUsageResponse {
  usage: MonthlyUsage[]
  limit: number
}

export interface UserData {
  userID: string
  apiKey: string
  dailyUsage: DailyUsage[]
  monthlyUsage: MonthlyUsage[]
  limit: number
}
