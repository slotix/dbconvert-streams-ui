export interface Evaluation {
  status: 'inactive' | 'active' | 'ended'
  started_at: number
  ended_at: number
  convert_bytes: number
  convert_limit_bytes: number
  convert_warned_percent?: number
  cdc_seconds: number
  cdc_limit_seconds: number
  cdc_warned_percent?: number
}

export interface UserData {
  userID: string
  email: string
  name: string
  stripeCustomerID: string
  apiKey: string
  seatLimit: number
  activeBindings: number
  evaluation?: Evaluation
  subscription: Subscription
  subscriptionStatus: string
}

export interface Subscription {
  id: number
  name: string
  monthly_price: number
  yearly_price: number
  interval: 'month' | 'year'
  status: string
}
