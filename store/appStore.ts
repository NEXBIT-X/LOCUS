import { create } from 'zustand'

export type PayoutState =
  | 'idle'
  | 'disruption_detected'
  | 'auto_approved'
  | 'tier2_verification'

export type KycState = 'pending' | 'uploaded' | 'verified' | 'rejected'

export type CreditEntry = {
  id: string
  date: string
  deduction: number
  scoreDelta: number
}

export type WorkerSnapshot = {
  fullName: string | null
  trustTier: number
  activeCreditBalance: number
  kycStatus: KycState
}

export type PolicySnapshot = {
  weeklyPremium: number
  layer1: number
  layer2: number
}

export type PredictionInput = {
  gpsDelta: number
  accelVariance: number
  activityStatus: number
  claimVelocity: number
  anomalyScore: number
  dayOfWeek: number
  hourOfDay: number
  zoneId: number
  historicalAvgIncome: number
}

export type PredictionResult = {
  fraudScore: number
  status: string
  expectedIncomeLost: number
}

export type PredictionSnapshot = {
  id: string
  createdAt: string
  source: 'live' | 'simulation' | 'seed'
  input: PredictionInput
  result: PredictionResult
}

export type AppStore = {
  isOnline: boolean
  payoutState: PayoutState
  kycStatus: KycState
  creditScore: number
  telemetryQueueSize: number
  creditLedger: CreditEntry[]
  worker: WorkerSnapshot | null
  activePolicy: PolicySnapshot | null
  latestPrediction: PredictionSnapshot | null
  predictionHistory: PredictionSnapshot[]
  setOnline: (isOnline: boolean) => void
  setPayoutState: (state: PayoutState) => void
  setKycStatus: (state: KycState) => void
  setTelemetryQueueSize: (size: number) => void
  setCreditLedger: (entries: CreditEntry[]) => void
  setWorker: (worker: WorkerSnapshot | null) => void
  setActivePolicy: (policy: PolicySnapshot | null) => void
  setLatestPrediction: (prediction: PredictionSnapshot | null) => void
  setPredictionHistory: (predictions: PredictionSnapshot[]) => void
}

export const useAppStore = create<AppStore>((set) => ({
  isOnline: false,
  payoutState: 'idle',
  kycStatus: 'pending',
  creditScore: 612,
  telemetryQueueSize: 0,
  worker: null,
  activePolicy: null,
  latestPrediction: null,
  predictionHistory: [],
  creditLedger: [
    { id: 'w1', date: '2026-04-01', deduction: 50, scoreDelta: 4 },
    { id: 'w2', date: '2026-03-25', deduction: 50, scoreDelta: 3 },
    { id: 'w3', date: '2026-03-18', deduction: 50, scoreDelta: 5 },
  ],
  setOnline: (isOnline) => set({ isOnline }),
  setPayoutState: (payoutState) => set({ payoutState }),
  setKycStatus: (kycStatus) => set({ kycStatus }),
  setTelemetryQueueSize: (telemetryQueueSize) => set({ telemetryQueueSize }),
  setCreditLedger: (creditLedger) => set({ creditLedger }),
  setWorker: (worker) => set({ worker }),
  setActivePolicy: (activePolicy) => set({ activePolicy }),
  setLatestPrediction: (latestPrediction) => set({ latestPrediction }),
  setPredictionHistory: (predictionHistory) => set({ predictionHistory }),
}))