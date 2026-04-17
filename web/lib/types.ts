export type WorkerDashboardData = {
  workerName: string
  badge: string
  averageEarnings: number
  protectedThisWeek: number
  planTier: string
  premiumPaid: number
  coverageWindow: string
  location: string
  weatherTrigger: string
  weatherRate: string
  statusLabel: string
  creditBalance: number
  repaidThisMonth: number
  banner: string
  upiHandle: string
  payoutHistory: Array<{
    date: string
    disruptionType: string
    amount: number
    status: string
  }>
  incidentFeed?: Array<{ title: string; detail: string; tone: 'cyan' | 'amber' | 'rose' }>
  policyHighlights?: Array<{ label: string; value: string }>
  supportCards?: Array<{ label: string; value: string }>
  coverageTimeline?: Array<{ stage: string; status: string }>
  quickActions?: Array<{ label: string; description: string }>
  riskSnapshot?: Array<{ label: string; value: string }>
}

export type AdminDashboardData = {
  metrics: Array<{ label: string; value: string }>
  claimsPipeline: Array<{
    workerId: string
    zone: string
    triggerType: string
    confidenceScore: string
    status: string
    payoutAmount: string
  }>
  fraudSignals: Array<{ label: string; result: string }>
  zoneProbability: Array<{ zone: string; probability: number }>
  lossRatioTrend: Array<{ week: string; ratio: number }>
  incidentFeed?: Array<{ title: string; detail: string; tone: 'cyan' | 'amber' | 'rose' }>
  reviewQueue?: Array<{ title: string; detail: string; status: string }>
  systemHealth?: Array<{ label: string; value: string; tone: 'green' | 'amber' | 'rose' }>
  payoutQueue?: Array<{ title: string; amount: string; status: string }>
  workerRegistry?: Array<{ name: string; zone: string; risk: string }>
  predictionSnapshots?: Array<{ title: string; score: string; status: string }>
}

export type PredictionInput = {
  gps_delta: number
  accel_variance: number
  activity_status: number
  claim_velocity: number
  anomaly_score: number
  day_of_week: number
  hour_of_day: number
  zone_id: number
  historical_avg_income: number
}

export type PredictionResult = {
  fraud_score: number
  status: string
  expected_income_lost: number
}

export type PredictionSnapshot = {
  id: string
  created_at: string
  source: 'live' | 'simulation' | 'seed' | 'web'
  input: PredictionInput
  result: PredictionResult
}

export type DecisionTimelineEntry = {
  id: string
  actor_id: string
  actor_role: 'worker' | 'admin' | 'system'
  event_name: string
  details: Record<string, unknown>
  created_at: string
}

export type WorkerSettings = {
  full_name: string
  city: string
  zone_label: string
  upi_handle: string
  emergency_contact: string
  historical_avg_income: number
}

export type AdminWorkerAccount = {
  worker_id: string
  full_name: string
  city: string
  active_credit_balance: number
}
