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
}

export interface UserData {
  userID: string
  email: string
  stripeCustomerId: string
  trialEnd: number
  currentPeriodStart: number
  currentPeriodEnd: number
  apiKey: string
  dailyUsage: DailyUsage[]
  monthlyUsage: MonthlyUsage[]
  subscription: Subscription
}

export interface Subscription {
  id: number
  name: string
  monthly_limit: number
  price: number
}
