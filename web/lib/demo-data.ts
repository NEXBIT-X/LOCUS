export type WorkerClaim = {
  date: string
  disruptionType: string
  amount: string
  status: 'Paid' | 'Processing' | 'Auto Approved' | 'Soft Flag' | 'Hard Flag'
}

export type PipelineClaim = {
  workerId: string
  zone: string
  triggerType: string
  confidenceScore: string
  status: string
  payoutAmount: string
}

export const workerSummary = {
  workerName: 'Arjun Kumar',
  badge: 'Weekly Shield · Active',
  averageEarnings: '₹4,700',
  protectedThisWeek: '₹1,200',
  planTier: 'Standard',
  premiumPaid: '₹60',
  coverageWindow: 'Mon–Sun',
  location: 'Velachery, Chennai',
  weatherTrigger: 'HEAVY RAIN',
  weatherRate: '>15mm/hr',
  statusLabel: 'TRIGGER ACTIVE — Claim Initiated Automatically',
  creditBalance: '₹340',
  repaidThisMonth: '₹110',
  banner: 'Rain disruption detected in your zone. ₹450 credit advance initiated. No action needed.',
  upiHandle: 'arjun.k@upi',
}

export const workerQuickActions = [
  { label: 'Report disruption', description: 'Raise a rainfall, flood, or bike breakdown incident.' },
  { label: 'Check coverage', description: 'See weekly shield status, premium paid, and payout path.' },
  { label: 'Request advance', description: 'Simulate a same-day cash advance against active risk.' },
  { label: 'Set support contact', description: 'Emergency contact routed into claim processing.' },
]

export const workerPolicyHighlights = [
  { label: 'Coverage window', value: 'Mon–Sun' },
  { label: 'Auto payout limit', value: '₹450 / event' },
  { label: 'Copay fallback', value: '₹60 / week' },
  { label: 'Support SLA', value: 'Under 5 min' },
]

export const workerIncidentFeed = [
  { title: 'Heavy rain detected', detail: 'Velachery currently above 15mm/hr trigger threshold.', tone: 'rose' as const },
  { title: 'Route congestion', detail: 'Traffic delay flagged on last-mile lane to zone 4B.', tone: 'amber' as const },
  { title: 'Claim matched', detail: 'Automatic claim initiation queued and approved by policy rules.', tone: 'cyan' as const },
]

export const workerCoverageTimeline = [
  { stage: 'Signal detected', status: 'Now' },
  { stage: 'Policy verified', status: 'Complete' },
  { stage: 'Credit advanced', status: '₹450 queued' },
  { stage: 'Repayment cycle', status: 'Next payout cycle' },
]

export const workerSupportCards = [
  { label: 'Emergency line', value: '+91 98765 43210' },
  { label: 'UPI', value: 'arjun.k@upi' },
  { label: 'Zone', value: 'Velachery, Chennai' },
  { label: 'Policy', value: 'Weekly Shield' },
]

export const workerRiskSnapshot = [
  { label: 'Claim velocity', value: '2 / week' },
  { label: 'Anomaly score', value: '0.20' },
  { label: 'GPS delta', value: '50m' },
  { label: 'Expected loss', value: '₹400.54' },
]

export const payoutHistory: WorkerClaim[] = [
  { date: 'Apr 12', disruptionType: 'Heavy Rain', amount: '₹450', status: 'Paid' },
  { date: 'Apr 08', disruptionType: 'Road Flooding', amount: '₹600', status: 'Paid' },
  { date: 'Apr 02', disruptionType: 'Cyclone Delay', amount: '₹300', status: 'Paid' },
]

export const adminMetrics = [
  { label: 'Total Workers', value: '1,247' },
  { label: 'Active Policies', value: '1,089' },
  { label: 'Claims This Week', value: '34' },
  { label: 'Loss Ratio', value: '38%' },
]

export const adminSystemHealth = [
  { label: 'Supabase sync', value: 'Live', tone: 'green' as const },
  { label: 'Prediction engine', value: 'Healthy', tone: 'green' as const },
  { label: 'Claim queue', value: '7 pending', tone: 'amber' as const },
  { label: 'Risk score', value: 'Stable', tone: 'green' as const },
]

export const adminReviewQueue = [
  { title: 'Worker WRK-1199', detail: 'GPS spoof detected · manual review required.', status: 'Hard Flag' },
  { title: 'Worker WRK-1171', detail: 'Wind burst claim with medium confidence.', status: 'Soft Flag' },
  { title: 'Worker WRK-1024', detail: 'Rain surge approved and paid automatically.', status: 'Auto Approved' },
]

export const adminPayoutQueue = [
  { title: 'UPI payout', amount: '₹450', status: 'Processing' },
  { title: 'Credit advance', amount: '₹300', status: 'Queued' },
  { title: 'Repayment sweep', amount: '₹110', status: 'Scheduled' },
]

export const adminWorkerRegistry = [
  { name: 'Arjun Kumar', zone: 'Velachery', risk: 'Low' },
  { name: 'Karthik S.', zone: 'Adyar', risk: 'Moderate' },
  { name: 'Maya R.', zone: 'Guindy', risk: 'Low' },
]

export const adminPredictionSnapshots = [
  { title: 'This hour', score: '0.18', status: 'CLEAR' },
  { title: 'Rain event', score: '0.84', status: 'HARD_FLAG' },
  { title: 'Spoof test', score: '0.96', status: 'HARD_FLAG' },
]

export const pipelineClaims: PipelineClaim[] = [
  {
    workerId: 'WRK-1024',
    zone: 'Zone 4B',
    triggerType: 'Rain Surge',
    confidenceScore: '91%',
    status: 'Auto Approved',
    payoutAmount: '₹450',
  },
  {
    workerId: 'WRK-1087',
    zone: 'Zone 2A',
    triggerType: 'Flood Risk',
    confidenceScore: '76%',
    status: 'Soft Flag',
    payoutAmount: '₹300',
  },
  {
    workerId: 'WRK-1133',
    zone: 'Zone 1C',
    triggerType: 'Heat Index',
    confidenceScore: '69%',
    status: 'Auto Approved',
    payoutAmount: '₹250',
  },
  {
    workerId: 'WRK-1171',
    zone: 'Zone 3A',
    triggerType: 'Wind Burst',
    confidenceScore: '61%',
    status: 'Soft Flag',
    payoutAmount: '₹180',
  },
  {
    workerId: 'WRK-1199',
    zone: 'Zone 5D',
    triggerType: 'GPS SPOOF DETECTED',
    confidenceScore: '22%',
    status: 'Hard Flag — Fraud Review',
    payoutAmount: '₹0',
  },
]

export const fraudSignals = [
  { label: 'GPS vs Tower Delta', result: '>800m — FAIL' },
  { label: 'Platform Activity', result: 'Offline — FAIL' },
  { label: 'Accelerometer', result: 'Stationary — FAIL' },
]

export const zoneProbability = [
  { zone: '1A', probability: 28 },
  { zone: '2B', probability: 42 },
  { zone: '3C', probability: 55 },
  { zone: '4B', probability: 85 },
  { zone: '5A', probability: 67 },
  { zone: '6D', probability: 20 },
]

export const lossRatioTrend = [
  { week: 'W1', ratio: 52 },
  { week: 'W2', ratio: 49 },
  { week: 'W3', ratio: 46 },
  { week: 'W4', ratio: 44 },
  { week: 'W5', ratio: 41 },
  { week: 'W6', ratio: 38 },
]

export const workerTrend = [
  { hour: '06:00', value: 18 },
  { hour: '09:00', value: 26 },
  { hour: '12:00', value: 34 },
  { hour: '15:00', value: 52 },
  { hour: '18:00', value: 84 },
  { hour: '21:00', value: 58 },
]

export const weatherTimeline = [
  { time: 'Now', value: 'Heavy rain' },
  { time: '+2h', value: 'Flood watch' },
  { time: '+4h', value: 'Route recovery' },
]