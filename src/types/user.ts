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

export interface SubscriptionPeriodUsage {
  period_start: number
  period_end: number
  data_volume: number
}

export interface UserData {
  userID: string
  email: string
  stripeCustomerId: string
  trialEnd: number
  apiKey: string
  dailyUsage: DailyUsage[]
  monthlyUsage: MonthlyUsage[]
  subscriptionPeriodUsage: SubscriptionPeriodUsage
  subscription: Subscription
  subscriptionStatus: string
}

export interface Subscription {
  id: number
  name: string
  monthly_limit: number
  price: number
}
